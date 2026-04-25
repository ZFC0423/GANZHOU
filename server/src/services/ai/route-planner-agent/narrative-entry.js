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
  NARRATIVE_FALLBACK_REASONS,
  NARRATIVE_PROVIDER,
  NARRATIVE_PROVIDER_REASONS,
  PLANNING_STATUS
} from './contracts.js';
import { buildFallbackNarrative } from './fallback-generate.js';
import { generateRouteNarrative } from './generate.js';
import { createRouteFingerprint, verifyRouteFingerprint } from './mock.js';
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
 * @param {{ providedFingerprint: string, recomputedFingerprint: string }} input
 * @returns {EntryResult<never>}
 */
function createFingerprintMismatchResult({ providedFingerprint, recomputedFingerprint }) {
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
          provided_fingerprint: providedFingerprint,
          recomputed_fingerprint: recomputedFingerprint
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

function createFailedPlanNarrative(publicPlan, requestMeta = {}) {
  return /** @type {NarrativeEntryResult} */ ({
    ok: true,
    value: {
      narrative: buildFallbackNarrative({
        publicPlan,
        reason: NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_FAILED_PLAN
      }),
      generation_meta: {
        provider: NARRATIVE_PROVIDER.FALLBACK,
        model: null,
        fallback_used: true,
        reason: NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_FAILED_PLAN,
        trace_id: requestMeta.trace_id || '',
        latency_ms: 0
      }
    }
  });
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
        return createFingerprintMismatchResult({
          providedFingerprint: validated.value.plan_context.fingerprint,
          recomputedFingerprint: createRouteFingerprint({
            publicPlan: validated.value.revision_public_plan,
            planContext: validated.value.plan_context
          })
        });
      }

      if (abortController.signal.aborted) {
        return {
          ...createClientAbortedResult(),
          generation_meta: createAbortedMeta(requestMeta)
        };
      }

      if (validated.value.public_plan.planning_status === PLANNING_STATUS.FAILED) {
        return createFailedPlanNarrative(validated.value.public_plan, requestMeta);
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
