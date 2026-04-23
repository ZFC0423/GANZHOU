# PR-C route narrative 源码整理

## 1. 入口层：`narrative-entry.js`

````js
// @ts-check

/** @typedef {import('./types.js').NarrativePayload} NarrativePayload */
/** @typedef {import('./types.js').RequestMeta} RequestMeta */
/** @typedef {import('./types.js').RouteNarrative} RouteNarrative */
/** @typedef {import('./types.js').NarrativeGenerationMeta} NarrativeGenerationMeta */
/**
 * @template T
 * @typedef {{ ok: true, value: T } | { ok: false, aborted?: boolean, error: { code: string, message: string, httpStatus: number, details: unknown[] }, generation_meta?: NarrativeGenerationMeta }} EntryResult
 */
/** @typedef {EntryResult<{ narrative: RouteNarrative, generation_meta: NarrativeGenerationMeta }>} NarrativeEntryResult */

import {
  ERROR_CODES,
  NARRATIVE_PROVIDER,
  NARRATIVE_PROVIDER_REASONS
} from './contracts.js';
import { generateRouteNarrative } from './generate.js';
import { verifyRouteFingerprint } from './mock.js';
import { assertPublicRoutePlanContract, validateNarrativePayload } from './validate.js';

/**
 * @param {unknown[]} details
 * @returns {{ ok: false, aborted: true, error: { code: string, message: string, httpStatus: number, details: unknown[] }, generation_meta?: NarrativeGenerationMeta }}
 */
function createClientAbortedResult(details = []) {
  return {
    ok: false,
    aborted: true,
    error: {
      code: ERROR_CODES.NARRATIVE_CLIENT_ABORTED,
      message: 'route narrative request was aborted by the client',
      httpStatus: 499,
      details
    }
  };
}

/**
 * @param {string} actualFingerprint
 * @returns {EntryResult<never>}
 */
function createFingerprintMismatchResult(actualFingerprint) {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.NARRATIVE_FINGERPRINT_MISMATCH,
      message: 'public plan fingerprint does not match public plan',
      httpStatus: 400,
      details: [
        {
          field: 'public_plan.plan_context.fingerprint',
          reason: 'mismatch',
          expected: 'fingerprint derived from allowlisted canonical payload',
          actual: actualFingerprint
        }
      ]
    }
  };
}

/**
 * @param {unknown} error
 * @returns {EntryResult<never>}
 */
function createContractViolationResult(error) {
  const routeError = /** @type {{ code?: string, details?: unknown[] }} */ (
    error && typeof error === 'object' ? error : {}
  );

  return {
    ok: false,
    error: {
      code: routeError.code || ERROR_CODES.CONTRACT_VIOLATION,
      message: error instanceof Error ? error.message : 'public plan violates route planner contract',
      httpStatus: 400,
      details: Array.isArray(routeError.details) ? routeError.details : []
    }
  };
}

/**
 * @param {Partial<RequestMeta>} [requestMeta]
 * @returns {NarrativeGenerationMeta}
 */
function createAbortedMeta(requestMeta = {}) {
  return {
    provider: NARRATIVE_PROVIDER.FALLBACK,
    model: null,
    fallback_used: false,
    reason: NARRATIVE_PROVIDER_REASONS.CLIENT_ABORTED,
    trace_id: requestMeta.trace_id || '',
    latency_ms: 0
  };
}

/**
 * @param {{
 *   validatePayload?: typeof validateNarrativePayload,
 *   verifyFingerprint?: typeof verifyRouteFingerprint,
 *   generateNarrative?: typeof generateRouteNarrative,
 *   createAbortController?: () => AbortController
 * }} [dependencies]
 */
export function createNarrativeRoutePlanEntry({
  validatePayload = validateNarrativePayload,
  verifyFingerprint = verifyRouteFingerprint,
  generateNarrative = generateRouteNarrative,
  createAbortController = () => new AbortController()
} = {}) {
  /**
   * @param {NarrativePayload} [payload]
   * @param {{ requestMeta?: Partial<RequestMeta>, signal?: AbortSignal }} [options]
   * @returns {Promise<NarrativeEntryResult>}
   */
  return async function generateRoutePlanNarrative(payload = {}, { requestMeta = {}, signal } = {}) {
    if (signal?.aborted) {
      return {
        ...createClientAbortedResult(),
        generation_meta: createAbortedMeta(requestMeta)
      };
    }

    const abortController = createAbortController();
    const onAbort = () => {
      abortController.abort();
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      const validated = validatePayload(payload);
      if (!validated.ok) {
        return /** @type {NarrativeEntryResult} */ (validated);
      }

      try {
        assertPublicRoutePlanContract(validated.value.public_plan);
      } catch (error) {
        return createContractViolationResult(error);
      }

      const fingerprintValid = verifyFingerprint({
        publicPlan: validated.value.revision_public_plan,
        planContext: validated.value.plan_context
      });

      if (!fingerprintValid) {
        return createFingerprintMismatchResult(validated.value.plan_context.fingerprint);
      }

      if (abortController.signal.aborted) {
        return {
          ...createClientAbortedResult(),
          generation_meta: createAbortedMeta(requestMeta)
        };
      }

      const generated = await generateNarrative({
        publicPlan: validated.value.public_plan,
        requestMeta,
        signal: abortController.signal
      });

      if (generated.aborted) {
        return {
          ...createClientAbortedResult(),
          generation_meta: generated.generation_meta
        };
      }

      return {
        ok: true,
        value: {
          narrative: generated.narrative,
          generation_meta: generated.generation_meta
        }
      };
    } finally {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    }
  };
}

export const generateRoutePlanNarrativeEntry = createNarrativeRoutePlanEntry();
````

## 2. 生成链路：`generate.js`

````js
// @ts-check

/** @typedef {import('./types.js').NarrativeGenerationMeta} NarrativeGenerationMeta */
/** @typedef {import('./types.js').PublicRoutePlan} PublicRoutePlan */
/** @typedef {import('./types.js').RequestMeta} RequestMeta */
/** @typedef {import('./types.js').RouteNarrative} RouteNarrative */

import {
  CANDIDATE_STATUS,
  LAST_ACTION_RESULT_STATUS,
  NARRATIVE_FALLBACK_REASONS,
  NARRATIVE_PROVIDER,
  NARRATIVE_PROVIDER_REASONS
} from './contracts.js';
import { buildFallbackNarrative } from './fallback-generate.js';
import { buildNarrativePromptBundle } from './prompt.js';
import { requestRouteNarrativeCompletion } from './provider.js';
import { validateNarrativeOutput } from './validate.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function nowMs() {
  return Date.now();
}

/**
 * @param {{
 *   provider: 'llm' | 'fallback',
 *   model?: string | null,
 *   fallbackUsed: boolean,
 *   reason: import('./types.js').NarrativeFallbackReason | import('./types.js').NarrativeProviderReason | null,
 *   traceId?: string,
 *   latencyMs: number
 * }} input
 * @returns {NarrativeGenerationMeta}
 */
function createGenerationMeta({
  provider,
  model = null,
  fallbackUsed,
  reason,
  traceId,
  latencyMs
}) {
  return {
    provider,
    model,
    fallback_used: fallbackUsed,
    reason,
    trace_id: traceId || '',
    latency_ms: latencyMs
  };
}

/**
 * @param {{
 *   publicPlan: PublicRoutePlan,
 *   reason: import('./types.js').NarrativeFallbackReason,
 *   traceId: string,
 *   latencyMs: number,
 *   model?: string | null
 * }} input
 */
function createFallbackResult({ publicPlan, reason, traceId, latencyMs, model = null }) {
  return {
    narrative: buildFallbackNarrative({ publicPlan, reason }),
    generation_meta: createGenerationMeta({
      provider: NARRATIVE_PROVIDER.FALLBACK,
      model,
      fallbackUsed: true,
      reason,
      traceId,
      latencyMs
    })
  };
}

function mapProviderReasonToFallbackReason(reason) {
  if (reason === NARRATIVE_PROVIDER_REASONS.MISSING_AI_ENV) return NARRATIVE_FALLBACK_REASONS.MISSING_AI_ENV;
  if (reason === NARRATIVE_PROVIDER_REASONS.TIMEOUT) return NARRATIVE_FALLBACK_REASONS.TIMEOUT;
  return NARRATIVE_FALLBACK_REASONS.PROVIDER_ERROR;
}

export function parseRouteNarrativeJson(rawText) {
  let text = normalizeText(rawText).replace(/^\uFEFF/, '').trim();

  const fencedMatch = text.match(/^```(?:json)?[^\S\r\n]*(?:\r?\n)?([\s\S]*?)(?:\r?\n)?```$/i);
  if (fencedMatch) {
    text = fencedMatch[1].replace(/^\uFEFF/, '').trim();
  }

  return JSON.parse(text);
}

/**
 * @param {{
 *   publicPlan: PublicRoutePlan,
 *   requestMeta?: Partial<RequestMeta>,
 *   signal?: AbortSignal,
 *   provider?: typeof requestRouteNarrativeCompletion,
 *   buildPromptBundle?: typeof buildNarrativePromptBundle,
 *   fallbackBuilder?: typeof buildFallbackNarrative,
 *   maxItemTitlesPerDay?: number,
 *   maxNarrativeInputBudget?: number,
 *   now?: () => number
 * }} input
 */
export async function generateRouteNarrative({
  publicPlan,
  requestMeta = {},
  signal,
  provider = requestRouteNarrativeCompletion,
  buildPromptBundle = buildNarrativePromptBundle,
  maxItemTitlesPerDay,
  maxNarrativeInputBudget,
  now = nowMs
}) {
  const startedAt = now();
  const elapsed = () => Math.max(0, now() - startedAt);
  const traceId = requestMeta.trace_id || '';

  if (signal?.aborted) {
    return {
      aborted: true,
      generation_meta: createGenerationMeta({
        provider: NARRATIVE_PROVIDER.FALLBACK,
        model: null,
        fallbackUsed: false,
        reason: NARRATIVE_PROVIDER_REASONS.CLIENT_ABORTED,
        traceId,
        latencyMs: elapsed()
      })
    };
  }

  if (publicPlan.candidate_status === CANDIDATE_STATUS.EMPTY) {
    return createFallbackResult({
      publicPlan,
      reason: NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_EMPTY,
      traceId,
      latencyMs: elapsed()
    });
  }

  if (publicPlan.plan_context.last_action_result?.status === LAST_ACTION_RESULT_STATUS.REJECTED) {
    return createFallbackResult({
      publicPlan,
      reason: NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_REJECTED,
      traceId,
      latencyMs: elapsed()
    });
  }

  const promptBundle = buildPromptBundle(publicPlan, {
    maxItemTitlesPerDay,
    maxNarrativeInputBudget
  });

  if (!promptBundle.ok) {
    return createFallbackResult({
      publicPlan,
      reason: NARRATIVE_FALLBACK_REASONS.INPUT_BUDGET_EXCEEDED,
      traceId,
      latencyMs: elapsed()
    });
  }

  if (signal?.aborted) {
    return {
      aborted: true,
      generation_meta: createGenerationMeta({
        provider: NARRATIVE_PROVIDER.FALLBACK,
        model: null,
        fallbackUsed: false,
        reason: NARRATIVE_PROVIDER_REASONS.CLIENT_ABORTED,
        traceId,
        latencyMs: elapsed()
      })
    };
  }

  const providerResult = await provider({
    messages: promptBundle.messages,
    signal
  });

  if (providerResult.reason === NARRATIVE_PROVIDER_REASONS.CLIENT_ABORTED) {
    return {
      aborted: true,
      generation_meta: createGenerationMeta({
        provider: NARRATIVE_PROVIDER.FALLBACK,
        model: providerResult.model,
        fallbackUsed: false,
        reason: NARRATIVE_PROVIDER_REASONS.CLIENT_ABORTED,
        traceId,
        latencyMs: elapsed()
      })
    };
  }

  if (!providerResult.ok) {
    return createFallbackResult({
      publicPlan,
      reason: mapProviderReasonToFallbackReason(providerResult.reason),
      traceId,
      latencyMs: elapsed(),
      model: providerResult.model
    });
  }

  let parsed;
  try {
    parsed = parseRouteNarrativeJson(providerResult.text);
  } catch (error) {
    return createFallbackResult({
      publicPlan,
      reason: NARRATIVE_FALLBACK_REASONS.INVALID_JSON,
      traceId,
      latencyMs: elapsed(),
      model: providerResult.model
    });
  }

  const narrativeResult = validateNarrativeOutput(parsed, publicPlan);
  if (!narrativeResult.ok) {
    return createFallbackResult({
      publicPlan,
      reason: NARRATIVE_FALLBACK_REASONS.SCHEMA_VIOLATION,
      traceId,
      latencyMs: elapsed(),
      model: providerResult.model
    });
  }

  return {
    narrative: narrativeResult.value,
    generation_meta: createGenerationMeta({
      provider: NARRATIVE_PROVIDER.LLM,
      model: providerResult.model,
      fallbackUsed: false,
      reason: null,
      traceId,
      latencyMs: elapsed()
    })
  };
}
````

## 3. Provider：`provider.js`

````js
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
````

## 4. Prompt / Sanitizer：`prompt.js`

````js
function summarizeMatchedBy(items) {
  return items.reduce((summary, item) => {
    (Array.isArray(item.matched_by) ? item.matched_by : [])
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .forEach((key) => {
        summary[key] = (summary[key] || 0) + 1;
      });

    return summary;
  }, /** @type {Record<string, number>} */ ({}));
}

function shouldIncludeBasisSignals(publicPlan) {
  return (
    publicPlan.candidate_status !== CANDIDATE_STATUS.READY ||
    Boolean(publicPlan.plan_context.last_action_result?.reason_code)
  );
}

export function buildNarrativeInput(publicPlan, { maxItemTitlesPerDay = MAX_ITEM_TITLES_PER_DAY } = {}) {
  const maxTitles = Number.isInteger(maxItemTitlesPerDay) && maxItemTitlesPerDay > 0
    ? maxItemTitlesPerDay
    : MAX_ITEM_TITLES_PER_DAY;
  const lastActionResult = publicPlan.plan_context.last_action_result;

  const narrativeInput = /** @type {NarrativeInput} */ ({
    candidate_status: publicPlan.candidate_status,
    planning_status: publicPlan.planning_status,
    route_positioning: publicPlan.route_positioning,
    summary: publicPlan.summary,
    days: publicPlan.days.map((day) => {
      const itemTitles = day.items.map((item) => normalizeText(item.title)).filter(Boolean);
      const visibleTitles = itemTitles.slice(0, maxTitles);

      return {
        day_index: day.day_index,
        region_key: day.region_key,
        item_titles: visibleTitles,
        item_count: day.items.length,
        omitted_count: Math.max(0, itemTitles.length - visibleTitles.length),
        is_empty_day: day.items.length === 0
      };
    }),
    route_highlights: [...publicPlan.route_highlights],
    adjustment_options: publicPlan.adjustment_options.map((option) => ({
      type: option.type,
      label: option.label
    })),
    last_action: publicPlan.plan_context.last_action,
    last_action_result: lastActionResult
      ? {
          status: lastActionResult.status,
          reason_code: lastActionResult.reason_code
        }
      : null
  });

  if (shouldIncludeBasisSignals(publicPlan)) {
    narrativeInput.basis_source = publicPlan.basis.source;
    narrativeInput.basis_item_count = publicPlan.basis.items.length;
    narrativeInput.matched_by_summary = summarizeMatchedBy(publicPlan.basis.items);
  }

  return narrativeInput;
}

export function estimateNarrativeInputBudget(narrativeInput) {
  return JSON.stringify(narrativeInput).length;
}

export function buildRouteNarrativeMessages(narrativeInput) {
  const systemPrompt = [
    '你是赣州文旅路线说明层生成器。',
    '你收到的是已经由后端代码确定的路线骨架，只能解释给定骨架，不能重新规划路线。',
    '严禁新增景点、删除景点、替换景点、重排行程、修改天数、修改区域、修改调整动作、修改 route_highlights。',
    'route_highlights 是代码生成的结构事实，你只能参考它解释路线气质，不得输出或重构 route_highlights 字段。',
    '如果某天 is_empty_day 为 true 或 item_count 为 0，只能说明该日暂无既定行程、可休整、自由安排或候选不足；严禁脑补具体景点、活动或路线安排。',
    '输出必须是严格 JSON 对象，只允许字段 overview、day_summaries、adjustment_hint、constraint_note。',
    'day_summaries 必须覆盖输入中的全部 day_index，不能缺失、重复或越界。',
    '所有内部双引号必须转义为 \\"，所有换行必须写成 \\n，严禁输出原生回车。',
    '不得输出 Markdown，不得输出代码块，不得输出解释文字。'
  ].join('\n');

  const userPrompt = [
    '请基于以下已验真的路线骨架摘要生成中文说明层 JSON。',
    JSON.stringify(narrativeInput)
  ].join('\n\n');

  return [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: userPrompt
    }
  ];
}

export function buildNarrativePromptBundle(publicPlan, options = {}) {
  const narrativeInput = buildNarrativeInput(publicPlan, {
    maxItemTitlesPerDay: options.maxItemTitlesPerDay
  });
  const requestedBudget = options.maxNarrativeInputBudget;
  const maxBudget = typeof requestedBudget === 'number' && Number.isInteger(requestedBudget) && requestedBudget > 0
    ? requestedBudget
    : MAX_NARRATIVE_INPUT_BUDGET;
  const inputSize = estimateNarrativeInputBudget(narrativeInput);

  if (inputSize > maxBudget) {
    return {
      ok: false,
      reason: NARRATIVE_FALLBACK_REASONS.INPUT_BUDGET_EXCEEDED,
      narrative_input: narrativeInput,
      input_size: inputSize,
      max_budget: maxBudget
    };
  }

  return {
    ok: true,
    narrative_input: narrativeInput,
    input_size: inputSize,
    max_budget: maxBudget,
    messages: buildRouteNarrativeMessages(narrativeInput)
  };
}
````

## 5. Fallback：`fallback-generate.js`

````js
function getDayIntro(day) {
  if (!day.items.length) {
    return '今日暂无固定行程安排，可作为预留或休整日；当前候选不足，暂未安排固定点位。';
  }

  const titles = day.items
    .map((item) => normalizeText(item.title))
    .filter(Boolean)
    .slice(0, 4);

  return `第 ${day.day_index} 天围绕 ${day.region_key} 展开，已安排 ${formatTitleList(titles)} 等点位；说明层只解释该既定骨架，不改变顺序与天数。`;
}

function buildOverview(publicPlan, reason) {
  if (reason === NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_EMPTY || publicPlan.candidate_status === CANDIDATE_STATUS.EMPTY) {
    return '当前路线骨架暂未形成可用固定点位，说明层采用本地兜底文案，避免为候选不足的行程编造内容。';
  }

  if (publicPlan.candidate_status === CANDIDATE_STATUS.LIMITED) {
    return '当前路线已形成可用骨架，但候选数量或匹配强度有限，说明层采用克制表达，优先保持路线事实稳定。';
  }

  if (publicPlan.plan_context.last_action_result?.status === LAST_ACTION_RESULT_STATUS.REJECTED) {
    return '本次调整未应用，原路线骨架已保留；说明层基于保留后的既定方案生成，不改写路线结构。';
  }

  if (publicPlan.plan_context.last_action_result?.status === LAST_ACTION_RESULT_STATUS.APPLIED) {
    return `本次调整已应用，当前形成 ${publicPlan.summary.total_days} 天路线骨架；说明层围绕新的区域与节奏变化进行解释。`;
  }

  return `当前形成 ${publicPlan.summary.total_days} 天路线骨架，共 ${publicPlan.summary.total_items} 个点位；说明层采用本地稳定文案补充路线气质与阅读节奏。`;
}

function buildAdjustmentHint(publicPlan) {
  if (publicPlan.plan_context.last_action_result?.status === LAST_ACTION_RESULT_STATUS.REJECTED) {
    return '本次调整未应用；如需继续修改，可换一个更明确的调整方向，例如放慢节奏、聚焦同一区域或替换跨区点位。';
  }

  if (publicPlan.adjustment_options.length) {
    return '可继续通过压缩天数、扩展天数、放慢节奏、聚焦同一区域、替换跨区点位或亲子友好筛选微调路线。';
  }

  return '当前暂无额外调整建议，可先阅读现有路线骨架。';
}

function buildConstraintNote(publicPlan, reason) {
  if (publicPlan.plan_context.last_action_result?.status === LAST_ACTION_RESULT_STATUS.REJECTED) {
    return '本次调整未应用，原方案已保留；系统没有为了满足调整而强行加入低相关点位。';
  }

  if (reason === NARRATIVE_FALLBACK_REASONS.INPUT_BUDGET_EXCEEDED) {
    return '路线信息较长，说明层已降级为本地保守摘要；路线骨架未被修改。';
  }

  if (reason === NARRATIVE_FALLBACK_REASONS.TIMEOUT) {
    return '模型说明生成超时，系统已切换为本地兜底说明；路线骨架未受影响。';
  }

  if (reason === NARRATIVE_FALLBACK_REASONS.INVALID_JSON || reason === NARRATIVE_FALLBACK_REASONS.SCHEMA_VIOLATION) {
    return '模型输出未通过结构校验，系统已切换为本地兜底说明；路线骨架未被模型改写。';
  }

  if (reason === NARRATIVE_FALLBACK_REASONS.MISSING_AI_ENV || reason === NARRATIVE_FALLBACK_REASONS.PROVIDER_ERROR) {
    return '模型服务当前不可用，系统已切换为本地兜底说明；路线骨架仍由后端规则保证。';
  }

  if (publicPlan.candidate_status === CANDIDATE_STATUS.EMPTY) {
    return '当前硬约束下没有形成可用固定点位，建议放宽部分偏好后重新生成。';
  }

  if (publicPlan.candidate_status === CANDIDATE_STATUS.LIMITED) {
    return '当前候选有限，系统优先保留相关性，没有为了凑满容量加入低相关点位。';
  }

  return '说明层只解释已有骨架，不改变天数、点位、顺序、区域或调整选项。';
}

export function buildFallbackNarrative({ publicPlan, reason = null }) {
  return {
    overview: buildOverview(publicPlan, reason),
    day_summaries: publicPlan.days.map((day) => ({
      day_index: day.day_index,
      text: getDayIntro(day)
    })),
    adjustment_hint: buildAdjustmentHint(publicPlan),
    constraint_note: buildConstraintNote(publicPlan, reason)
  };
}
````

## 6. Contract：`contracts.js`

````js
export const ROUTE_NARRATIVE_TIMEOUT_ENV = 'ROUTE_NARRATIVE_LLM_TIMEOUT';
export const ROUTE_NARRATIVE_DEFAULT_TIMEOUT_MS = 5000;
export const ROUTE_NARRATIVE_MIN_TIMEOUT_MS = 1000;
export const ROUTE_NARRATIVE_MAX_TIMEOUT_MS = 15000;
export const MAX_ITEM_TITLES_PER_DAY = 4;
export const MAX_NARRATIVE_INPUT_BUDGET = 12000;

export const NARRATIVE_PROVIDER = /** @type {const} */ ({
  LLM: 'llm',
  FALLBACK: 'fallback'
});

export const NARRATIVE_FALLBACK_REASONS = /** @type {const} */ ({
  SHORT_CIRCUIT_EMPTY: 'short_circuit_empty',
  SHORT_CIRCUIT_REJECTED: 'short_circuit_rejected',
  INPUT_BUDGET_EXCEEDED: 'input_budget_exceeded',
  MISSING_AI_ENV: 'missing_ai_env',
  TIMEOUT: 'timeout',
  INVALID_JSON: 'invalid_json',
  SCHEMA_VIOLATION: 'schema_violation',
  PROVIDER_ERROR: 'provider_error'
});

export const NARRATIVE_PROVIDER_REASONS = /** @type {const} */ ({
  MISSING_AI_ENV: 'missing_ai_env',
  TIMEOUT: 'timeout',
  PROVIDER_ERROR: 'provider_error',
  CLIENT_ABORTED: 'client_aborted'
});

export const NARRATIVE_FIELDS = ['overview', 'day_summaries', 'adjustment_hint', 'constraint_note'];
export const NARRATIVE_DAY_SUMMARY_FIELDS = ['day_index', 'text'];
export const NARRATIVE_BASIS_SIGNAL_FIELDS = ['basis_source', 'basis_item_count', 'matched_by_summary'];

export const ERROR_CODES = {
  INVALID_GENERATE_PAYLOAD: 'route_planner_invalid_generate_payload',
  INVALID_REVISE_PAYLOAD: 'route_planner_invalid_revise_payload',
  INVALID_ROUTER_RESULT: 'route_planner_invalid_router_result',
  INVALID_PREVIOUS_PUBLIC_PLAN: 'route_planner_invalid_previous_public_plan',
  INVALID_PREVIOUS_PLAN_CONTEXT: 'route_planner_invalid_previous_plan_context',
  PREVIOUS_FINGERPRINT_MISMATCH: 'route_planner_previous_fingerprint_mismatch',
  NARRATIVE_FINGERPRINT_MISMATCH: 'route_planner_narrative_fingerprint_mismatch',
  INVALID_NARRATIVE_PAYLOAD: 'route_planner_invalid_narrative_payload',
  INVALID_NARRATIVE_OUTPUT: 'route_planner_invalid_narrative_output',
  NARRATIVE_CLIENT_ABORTED: 'route_planner_narrative_client_aborted',
  INVALID_ACTION_TYPE: 'route_planner_invalid_action_type',
  INVALID_ACTION_PAYLOAD: 'route_planner_invalid_action_payload',
  CONTRACT_VIOLATION: 'route_planner_contract_violation'
};

/** @type {Record<ActionType, string>} */
export const ACTION_LABELS = {
  compress_to_one_day: '压缩为一天',
  expand_to_two_days: '扩展为两天',
  focus_same_region: '聚焦同一区域',
  relax_pace: '放慢节奏',
  replace_far_spots: '替换跨区点位',
  family_friendly_only: '仅保留亲子友好点位'
};

export const REGION_ALIASES = Object.freeze({
  zhanggong: 'zhanggong',
  '章贡': 'zhanggong',
  '章贡区': 'zhanggong',
  anyuan: 'anyuan',
  '安远': 'anyuan',
  '安远县': 'anyuan',
  dayu: 'dayu',
  '大余': 'dayu',
  '大余县': 'dayu',
  ganxian: 'ganxian',
  '赣县': 'ganxian',
  '赣县区': 'ganxian',
  ruijin: 'ruijin',
  '瑞金': 'ruijin',
  '瑞金市': 'ruijin',
  ganzhou: 'ganzhou',
  '赣州': 'ganzhou'
});
````

## 7. Types：`types.js`

````js
/** @typedef {typeof import('./contracts.js').NARRATIVE_FALLBACK_REASONS[keyof typeof import('./contracts.js').NARRATIVE_FALLBACK_REASONS]} NarrativeFallbackReason */
/** @typedef {typeof import('./contracts.js').NARRATIVE_PROVIDER_REASONS[keyof typeof import('./contracts.js').NARRATIVE_PROVIDER_REASONS]} NarrativeProviderReason */

/**
 * @typedef {{
 *   day_index: number,
 *   region_key: string,
 *   item_titles: string[],
 *   item_count: number,
 *   omitted_count: number,
 *   is_empty_day: boolean
 * }} NarrativeInputDay
 */

/**
 * @typedef {{
 *   candidate_status: CandidateStatus,
 *   planning_status: PlanningStatus,
 *   route_positioning: RoutePositioning,
 *   summary: RouteSummary,
 *   days: NarrativeInputDay[],
 *   route_highlights: string[],
 *   adjustment_options: AdjustmentOption[],
 *   last_action: Action | null,
 *   last_action_result: {
 *     status: 'applied' | 'rejected',
 *     reason_code: string | null
 *   } | null,
 *   basis_source?: string,
 *   basis_item_count?: number,
 *   matched_by_summary?: Record<string, number>
 * }} NarrativeInput
 */

/**
 * @typedef {{
 *   day_index: number,
 *   text: string
 * }} NarrativeDaySummary
 */

/**
 * @typedef {{
 *   overview: string,
 *   day_summaries: NarrativeDaySummary[],
 *   adjustment_hint: string,
 *   constraint_note: string
 * }} RouteNarrative
 */

/**
 * @typedef {{
 *   public_plan?: PublicRoutePlan
 * }} NarrativePayload
 */

/**
 * @typedef {{
 *   provider: 'llm' | 'fallback',
 *   model: string | null,
 *   fallback_used: boolean,
 *   reason: NarrativeFallbackReason | NarrativeProviderReason | null,
 *   trace_id: string,
 *   latency_ms: number
 * }} NarrativeGenerationMeta
 */

/**
 * @typedef {{
 *   ok: boolean,
 *   provider: 'llm' | 'fallback',
 *   model: string | null,
 *   text: string,
 *   latency_ms: number,
 *   reason: NarrativeProviderReason | null
 * }} NarrativeProviderResult
 */
````

## 8. Validate：`validate.js`

````js
export function normalizeFullPublicRoutePlan(value, options = {}) {
  const {
    field = 'public_plan',
    code = ERROR_CODES.INVALID_NARRATIVE_PAYLOAD,
    strictExtraKeys = true
  } = options;

  if (!isPlainObject(value)) {
    return fail(code, `${field} must be an object`, [
      createDetail(field, 'invalid_type', 'object', value)
    ]);
  }

  const details = [];
  if (strictExtraKeys) {
    pushIfExtraKeys(value, PUBLIC_PLAN_TOP_LEVEL_FIELDS, field, details);
  }

  if (!isPlainObject(value.plan_context)) {
    return fail(code, `${field}.plan_context must be an object`, [
      createDetail(`${field}.plan_context`, 'invalid_type', 'object', value.plan_context)
    ]);
  }

  const { plan_context: planContextInput, ...revisionPublicPlanInput } = value;
  const publicPlanResult = normalizePublicRoutePlan(revisionPublicPlanInput, {
    field,
    code,
    strictExtraKeys
  });
  if (!publicPlanResult.ok) return publicPlanResult;

  const planContextResult = normalizePlanContext(planContextInput, {
    field: `${field}.plan_context`,
    code,
    strictExtraKeys
  });
  if (!planContextResult.ok) return planContextResult;

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  return ok({
    ...publicPlanResult.value,
    plan_context: planContextResult.value
  });
}

export function validateNarrativePayload(payload = {}) {
  if (!isPlainObject(payload)) {
    return fail(ERROR_CODES.INVALID_NARRATIVE_PAYLOAD, 'narrative payload must be an object', [
      createDetail('body', 'invalid_type', 'object', payload)
    ]);
  }

  const details = [];
  pushIfExtraKeys(payload, ['public_plan'], 'body', details);
  if (details.length) {
    return fail(ERROR_CODES.INVALID_NARRATIVE_PAYLOAD, 'narrative payload contains unsupported fields', details);
  }

  const publicPlan = normalizeFullPublicRoutePlan(payload.public_plan, {
    field: 'public_plan',
    code: ERROR_CODES.INVALID_NARRATIVE_PAYLOAD,
    strictExtraKeys: true
  });
  if (!publicPlan.ok) {
    return publicPlan;
  }

  const { plan_context: planContext, ...revisionPublicPlan } = publicPlan.value;

  return ok({
    public_plan: publicPlan.value,
    revision_public_plan: revisionPublicPlan,
    plan_context: planContext
  });
}

export function validateNarrativeOutput(value, publicPlan) {
  const code = ERROR_CODES.INVALID_NARRATIVE_OUTPUT;

  if (!isPlainObject(value)) {
    return fail(code, 'narrative output must be an object', [
      createDetail('narrative', 'invalid_type', 'object', value)
    ]);
  }

  const narrative = /** @type {Record<string, unknown>} */ (value);
  const details = [];
  pushIfExtraKeys(narrative, NARRATIVE_FIELDS, 'narrative', details);
  if (details.length) {
    return fail(code, 'narrative output contains unsupported fields', details);
  }

  const overview = normalizeText(narrative.overview);
  const adjustmentHint = normalizeText(narrative.adjustment_hint);
  const constraintNote = normalizeText(narrative.constraint_note);

  if (!overview || !adjustmentHint || !constraintNote) {
    return fail(code, 'narrative text fields are required', [
      createDetail('narrative.overview', 'required', 'non-empty string', narrative.overview),
      createDetail('narrative.adjustment_hint', 'required', 'non-empty string', narrative.adjustment_hint),
      createDetail('narrative.constraint_note', 'required', 'non-empty string', narrative.constraint_note)
    ]);
  }

  if (!Array.isArray(narrative.day_summaries)) {
    return fail(code, 'narrative.day_summaries must be an array', [
      createDetail('narrative.day_summaries', 'invalid_type', 'array', narrative.day_summaries)
    ]);
  }

  if (narrative.day_summaries.length !== publicPlan.days.length) {
    return fail(code, 'narrative.day_summaries must match public plan days', [
      createDetail('narrative.day_summaries.length', 'inconsistent', publicPlan.days.length, narrative.day_summaries.length)
    ]);
  }

  const expectedDayIndexes = publicPlan.days.map((day) => day.day_index);
  const expectedSet = new Set(expectedDayIndexes);
  const summaryByDayIndex = new Map();

  for (let index = 0; index < narrative.day_summaries.length; index += 1) {
    const summary = narrative.day_summaries[index];
    const field = `narrative.day_summaries[${index}]`;

    if (!isPlainObject(summary)) {
      return fail(code, `${field} must be an object`, [
        createDetail(field, 'invalid_type', 'object', summary)
      ]);
    }

    const daySummary = /** @type {Record<string, unknown>} */ (summary);
    const summaryDetails = [];
    pushIfExtraKeys(daySummary, NARRATIVE_DAY_SUMMARY_FIELDS, field, summaryDetails);
    if (summaryDetails.length) {
      return fail(code, `${field} contains unsupported fields`, summaryDetails);
    }

    const dayIndexResult = normalizePositiveInteger(daySummary.day_index, `${field}.day_index`, { code });
    if (!dayIndexResult.ok) return dayIndexResult;

    if (!expectedSet.has(dayIndexResult.value)) {
      return fail(code, `${field}.day_index is out of range`, [
        createDetail(`${field}.day_index`, 'invalid_value', expectedDayIndexes.join(', '), daySummary.day_index)
      ]);
    }

    if (summaryByDayIndex.has(dayIndexResult.value)) {
      return fail(code, `${field}.day_index is duplicated`, [
        createDetail(`${field}.day_index`, 'duplicate', 'unique day_index', daySummary.day_index)
      ]);
    }

    const text = normalizeText(daySummary.text);
    if (!text) {
      return fail(code, `${field}.text is required`, [
        createDetail(`${field}.text`, 'required', 'non-empty string', daySummary.text)
      ]);
    }

    summaryByDayIndex.set(dayIndexResult.value, {
      day_index: dayIndexResult.value,
      text
    });
  }

  const missingDayIndex = expectedDayIndexes.find((dayIndex) => !summaryByDayIndex.has(dayIndex));
  if (missingDayIndex !== undefined) {
    return fail(code, 'narrative.day_summaries has missing day_index', [
      createDetail('narrative.day_summaries', 'missing', expectedDayIndexes.join(', '), missingDayIndex)
    ]);
  }

  return ok(/** @type {RouteNarrative} */ ({
    overview,
    day_summaries: expectedDayIndexes.map((dayIndex) => summaryByDayIndex.get(dayIndex)),
    adjustment_hint: adjustmentHint,
    constraint_note: constraintNote
  }));
}
````

````js
function projectActionResultForFingerprint(lastActionResult) {
  if (lastActionResult === null) {
    return null;
  }

  return {
    status: lastActionResult.status,
    reason_code: lastActionResult.reason_code
  };
}

export function projectPublicPlanForFingerprint(publicPlan) {
  const normalized = normalizePublicRoutePlan(publicPlan, {
    field: 'public_plan',
    code: ERROR_CODES.CONTRACT_VIOLATION,
    strictExtraKeys: false
  });
  if (!normalized.ok) {
    const error = /** @type {RoutePlannerAssertionError} */ (new Error(normalized.error.message));
    error.code = normalized.error.code;
    error.details = normalized.error.details;
    throw error;
  }

  const plan = normalized.value;

  return sortObjectKeys(
    FINGERPRINT_PUBLIC_PLAN_FIELDS.reduce((projection, key) => {
      if (key === 'adjustment_options') {
        projection[key] = plan.adjustment_options.map((option) => ({
          type: option.type
        }));
      } else if (key === 'basis') {
        projection[key] = {
          source: plan.basis.source,
          items: normalizePublicBasisItemsForFingerprint(plan.basis.items)
        };
      } else {
        projection[key] = plan[key];
      }
      return projection;
    }, {})
  );
}

export function projectPlanContextForFingerprint(planContext) {
  const normalized = normalizePlanContext(planContext, {
    field: 'plan_context',
    code: ERROR_CODES.CONTRACT_VIOLATION,
    strictExtraKeys: false,
    requireFingerprint: false
  });
  if (!normalized.ok) {
    const error = /** @type {RoutePlannerAssertionError} */ (new Error(normalized.error.message));
    error.code = normalized.error.code;
    error.details = normalized.error.details;
    throw error;
  }

  const context = normalized.value;

  return sortObjectKeys(
    FINGERPRINT_PLAN_CONTEXT_FIELDS.reduce((projection, key) => {
      if (key === 'last_action_result') {
        projection[key] = projectActionResultForFingerprint(context.last_action_result);
      } else {
        projection[key] = context[key];
      }
      return projection;
    }, {})
  );
}
````

## 9. 导出：`index.js`

````js
import { generateRoutePlanEntry } from './generate-entry.js';
import { generateRoutePlanNarrativeEntry } from './narrative-entry.js';
import { reviseRoutePlanEntry } from './revise-entry.js';

export function createRoutePlannerAgent({
  generateEntry = generateRoutePlanEntry,
  narrativeEntry = generateRoutePlanNarrativeEntry,
  reviseEntry = reviseRoutePlanEntry
} = {}) {
  return {
    generateRoutePlan(payload, options) {
      return generateEntry(payload, options);
    },
    reviseRoutePlan(payload, options) {
      return reviseEntry(payload, options);
    },
    generateRoutePlanNarrative(payload, options) {
      return narrativeEntry(payload, options);
    }
  };
}

const routePlannerAgent = createRoutePlannerAgent();

export const generateRoutePlan = routePlannerAgent.generateRoutePlan;
export const generateRoutePlanNarrative = routePlannerAgent.generateRoutePlanNarrative;
export const reviseRoutePlan = routePlannerAgent.reviseRoutePlan;
````
