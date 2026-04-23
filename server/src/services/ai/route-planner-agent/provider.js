// @ts-check

/** @typedef {import('./types.js').NarrativeProviderReason} NarrativeProviderReason */
/** @typedef {import('./types.js').NarrativeProviderResult} NarrativeProviderResult */

import axios from 'axios';

import { env } from '../../../config/env.js';
import { assertLlmMessagesContract } from '../_shared/llm-contract.js';
import {
  NARRATIVE_PROVIDER,
  NARRATIVE_PROVIDER_REASONS,
  ROUTE_NARRATIVE_DEFAULT_TIMEOUT_MS,
  ROUTE_NARRATIVE_MAX_TIMEOUT_MS,
  ROUTE_NARRATIVE_MIN_TIMEOUT_MS,
  ROUTE_NARRATIVE_TIMEOUT_ENV
} from './contracts.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function createProviderError(code, message) {
  const error = /** @type {Error & { code?: string }} */ (new Error(message));
  error.code = code;
  return error;
}

function extractMessageContent(messageContent) {
  if (typeof messageContent === 'string') {
    return messageContent.trim();
  }

  if (Array.isArray(messageContent)) {
    return messageContent
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.type === 'text') return item.text || '';
        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

function getModelText(payload) {
  return (
    extractMessageContent(payload?.choices?.[0]?.message?.content) ||
    extractMessageContent(payload?.output?.choices?.[0]?.message?.content) ||
    extractMessageContent(payload?.data?.choices?.[0]?.message?.content)
  );
}

export function resolveRouteNarrativeTimeoutMs(rawValue = process.env[ROUTE_NARRATIVE_TIMEOUT_ENV]) {
  const parsed = Number(rawValue);

  if (
    Number.isInteger(parsed) &&
    parsed >= ROUTE_NARRATIVE_MIN_TIMEOUT_MS &&
    parsed <= ROUTE_NARRATIVE_MAX_TIMEOUT_MS
  ) {
    return parsed;
  }

  return ROUTE_NARRATIVE_DEFAULT_TIMEOUT_MS;
}

export function getRouteNarrativeAiConfig() {
  return {
    baseUrl: process.env.AI_BASE_URL || env.aiBaseUrl || '',
    apiKey: process.env.AI_API_KEY || env.aiApiKey || '',
    model: process.env.AI_MODEL || env.aiModel || ''
  };
}

function assertNarrativeMessages(messages) {
  assertLlmMessagesContract(messages, {
    createError: createProviderError
  });

  if (messages.some((message) => normalizeText(message.role) === 'assistant')) {
    throw createProviderError('schema_violation', 'assistant prefill is not allowed');
  }
}

/**
 * @param {{
 *   ok: boolean,
 *   provider: 'llm' | 'fallback',
 *   model: string | null,
 *   text?: string,
 *   latencyMs: number,
 *   reason?: NarrativeProviderReason | null
 * }} input
 * @returns {NarrativeProviderResult}
 */
function buildProviderResult({ ok, provider, model, text = '', latencyMs, reason = null }) {
  return {
    ok,
    provider,
    model,
    text,
    latency_ms: latencyMs,
    reason
  };
}

/**
 * @param {{
 *   messages: Array<{ role: string, content: string }>,
 *   signal?: AbortSignal,
 *   axiosClient?: Pick<typeof axios, 'post'>,
 *   setTimeoutFn?: typeof setTimeout,
 *   clearTimeoutFn?: typeof clearTimeout,
 *   now?: () => number,
 *   timeoutMs?: number
 * }} input
 */
export async function requestRouteNarrativeCompletion({
  messages,
  signal,
  axiosClient = axios,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  now = Date.now,
  timeoutMs = resolveRouteNarrativeTimeoutMs()
}) {
  const startedAt = now();
  const elapsed = () => Math.max(0, now() - startedAt);

  if (signal?.aborted) {
    return buildProviderResult({
      ok: false,
      provider: NARRATIVE_PROVIDER.FALLBACK,
      model: null,
      latencyMs: elapsed(),
      reason: NARRATIVE_PROVIDER_REASONS.CLIENT_ABORTED
    });
  }

  try {
    assertNarrativeMessages(messages);
  } catch (error) {
    return buildProviderResult({
      ok: false,
      provider: NARRATIVE_PROVIDER.FALLBACK,
      model: null,
      latencyMs: elapsed(),
      reason: NARRATIVE_PROVIDER_REASONS.PROVIDER_ERROR
    });
  }

  const config = getRouteNarrativeAiConfig();
  if (!config.baseUrl || !config.apiKey || !config.model) {
    return buildProviderResult({
      ok: false,
      provider: NARRATIVE_PROVIDER.FALLBACK,
      model: null,
      latencyMs: elapsed(),
      reason: NARRATIVE_PROVIDER_REASONS.MISSING_AI_ENV
    });
  }

  const controller = new AbortController();
  let didTimeout = false;
  let didClientAbort = false;
  /** @type {((value: { type: 'timeout' | 'client_aborted' }) => void) | null} */
  let resolveControl = null;
  const controlPromise = new Promise((resolve) => {
    resolveControl = resolve;
  });
  const onClientAbort = () => {
    didClientAbort = true;
    controller.abort();
    resolveControl?.({ type: 'client_aborted' });
  };

  if (signal) {
    signal.addEventListener('abort', onClientAbort, { once: true });
  }

  const timer = setTimeoutFn(() => {
    didTimeout = true;
    controller.abort();
    resolveControl?.({ type: 'timeout' });
  }, timeoutMs);

  try {
    const requestPromise = axiosClient.post(
      `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`,
      {
        model: config.model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages
      },
      {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        }
      }
    )
      .then((response) => ({ type: 'response', response }))
      .catch((error) => ({ type: 'error', error }));

    const outcome = await Promise.race([requestPromise, controlPromise]);

    if (outcome.type === 'client_aborted' || didClientAbort) {
      return buildProviderResult({
        ok: false,
        provider: NARRATIVE_PROVIDER.FALLBACK,
        model: null,
        latencyMs: elapsed(),
        reason: NARRATIVE_PROVIDER_REASONS.CLIENT_ABORTED
      });
    }

    if (outcome.type === 'timeout' || didTimeout) {
      return buildProviderResult({
        ok: false,
        provider: NARRATIVE_PROVIDER.FALLBACK,
        model: null,
        latencyMs: elapsed(),
        reason: NARRATIVE_PROVIDER_REASONS.TIMEOUT
      });
    }

    if (outcome.type === 'error') {
      return buildProviderResult({
        ok: false,
        provider: NARRATIVE_PROVIDER.FALLBACK,
        model: null,
        latencyMs: elapsed(),
        reason: NARRATIVE_PROVIDER_REASONS.PROVIDER_ERROR
      });
    }

    return buildProviderResult({
      ok: true,
      provider: NARRATIVE_PROVIDER.LLM,
      model: outcome.response?.data?.model || config.model,
      text: getModelText(outcome.response?.data),
      latencyMs: elapsed(),
      reason: null
    });
  } catch (error) {
    if (didClientAbort) {
      return buildProviderResult({
        ok: false,
        provider: NARRATIVE_PROVIDER.FALLBACK,
        model: null,
        latencyMs: elapsed(),
        reason: NARRATIVE_PROVIDER_REASONS.CLIENT_ABORTED
      });
    }

    if (didTimeout) {
      return buildProviderResult({
        ok: false,
        provider: NARRATIVE_PROVIDER.FALLBACK,
        model: null,
        latencyMs: elapsed(),
        reason: NARRATIVE_PROVIDER_REASONS.TIMEOUT
      });
    }

    return buildProviderResult({
      ok: false,
      provider: NARRATIVE_PROVIDER.FALLBACK,
      model: null,
      latencyMs: elapsed(),
      reason: NARRATIVE_PROVIDER_REASONS.PROVIDER_ERROR
    });
  } finally {
    clearTimeoutFn(timer);
    if (signal) {
      signal.removeEventListener('abort', onClientAbort);
    }
  }
}
