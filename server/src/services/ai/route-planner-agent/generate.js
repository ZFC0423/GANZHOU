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
