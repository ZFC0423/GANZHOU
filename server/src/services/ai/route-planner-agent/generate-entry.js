// @ts-check

/** @typedef {import('./types.js').ConstraintsSnapshot} ConstraintsSnapshot */
/** @typedef {import('./types.js').GeneratePayload} GeneratePayload */
/** @typedef {import('./types.js').PublicRoutePlan} PublicRoutePlan */
/** @typedef {import('./types.js').RequestMeta} RequestMeta */
/**
 * @template T
 * @typedef {{ ok: true, value: T } | { ok: false, error: { code: string, message: string, httpStatus: number, details: unknown[] } }} EntryResult
 */
/** @typedef {EntryResult<{ constraints_snapshot: ConstraintsSnapshot }>} GenerateValidationResult */

import { CANDIDATE_STATUS, PLANNING_STATUS, ROUTE_WARNING_CODES } from './contracts.js';
import { assertPublicRoutePlanContract, validateGeneratePayload } from './validate.js';
import { buildInternalBasis } from './basis.js';
import { buildGenerateFailedPlan, buildGenerateFallback, createPlanContext, attachFingerprint } from './fallback.js';
import { retrieveRouteCandidates } from './retrieve.js';
import { runRepairPolicy } from './repair-policy.js';
import { assemblePublicRoutePlan, getCapacityTarget, scheduleRoute } from './schedule.js';
import { enrichRoutePlanWithMap } from './map-enrichment.js';

const LOCKED_RETRIEVAL_FAILURE_STATUS = {
  [ROUTE_WARNING_CODES.LOCKED_TARGET_NOT_FOUND]: CANDIDATE_STATUS.EMPTY,
  [ROUTE_WARNING_CODES.LOCKED_TARGET_UNAVAILABLE]: CANDIDATE_STATUS.LIMITED
};

function getLockedBusinessWarnings(result) {
  return (result?.warnings || []).filter((warning) => String(warning.code || '').startsWith('locked_'));
}

function getLockedRetrievalFailureStatus(warnings) {
  const firstCode = warnings[0]?.code;
  return LOCKED_RETRIEVAL_FAILURE_STATUS[firstCode] || CANDIDATE_STATUS.READY;
}

async function buildGeneratedPlan({
  constraintsSnapshot,
  retrieve = retrieveRouteCandidates,
  repairPolicy = runRepairPolicy
}) {
  const primaryRetrieval = await retrieve({
    constraintsSnapshot,
    mode: 'primary'
  });
  const primaryBasis = buildInternalBasis({
    retrievalResult: primaryRetrieval,
    capacityTarget: getCapacityTarget(constraintsSnapshot),
    degraded: false
  });
  const retrievalWarnings = getLockedBusinessWarnings(primaryRetrieval);
  if (retrievalWarnings.length) {
    return buildGenerateFailedPlan({
      constraintsSnapshot,
      candidateStatus: getLockedRetrievalFailureStatus(retrievalWarnings),
      warnings: retrievalWarnings,
      internalBasis: primaryBasis
    });
  }

  const primarySchedule = scheduleRoute({
    constraintsSnapshot,
    internalBasis: primaryBasis,
    mode: 'generate'
  });

  primaryBasis.capacity_target = primarySchedule.capacity_target;
  primaryBasis.capacity_achieved = primarySchedule.capacity_achieved;

  let selectedBasis = primaryBasis;
  let selectedSchedule = primarySchedule;

  if (getLockedBusinessWarnings(primarySchedule).length) {
    return buildGenerateFailedPlan({
      constraintsSnapshot,
      candidateStatus: CANDIDATE_STATUS.READY,
      warnings: getLockedBusinessWarnings(primarySchedule),
      internalBasis: primaryBasis
    });
  }

  if (!primarySchedule.feasible || primarySchedule.candidate_status !== CANDIDATE_STATUS.READY) {
    const repaired = await repairPolicy({
      constraintsSnapshot,
      mode: 'generate',
      retrieve
    });
    const repairedRetrievalWarnings = getLockedBusinessWarnings(repaired.retrievalResult);
    const repairedScheduleWarnings = getLockedBusinessWarnings(repaired.scheduleResult);

    if (repairedRetrievalWarnings.length) {
      return buildGenerateFailedPlan({
        constraintsSnapshot,
        candidateStatus: getLockedRetrievalFailureStatus(repairedRetrievalWarnings),
        warnings: repairedRetrievalWarnings,
        internalBasis: repaired.internalBasis
      });
    }

    if (repairedScheduleWarnings.length) {
      return buildGenerateFailedPlan({
        constraintsSnapshot,
        candidateStatus: CANDIDATE_STATUS.READY,
        warnings: repairedScheduleWarnings,
        internalBasis: repaired.internalBasis
      });
    }

    if (repaired.scheduleResult.feasible && repaired.scheduleResult.capacity_achieved >= primarySchedule.capacity_achieved) {
      selectedBasis = repaired.internalBasis;
      selectedSchedule = repaired.scheduleResult;
    }
  }

  if (!selectedSchedule.feasible) {
    return buildGenerateFallback({
      constraintsSnapshot,
      internalBasis: selectedBasis
    });
  }

  const selectedWarnings = getLockedBusinessWarnings(selectedSchedule);
  if (selectedWarnings.length) {
    return buildGenerateFailedPlan({
      constraintsSnapshot,
      candidateStatus: CANDIDATE_STATUS.READY,
      warnings: selectedWarnings,
      internalBasis: selectedBasis
    });
  }

  const publicPlan = assemblePublicRoutePlan({
    constraintsSnapshot,
    scheduleResult: selectedSchedule,
    planningStatus: PLANNING_STATUS.GENERATED,
    internalBasis: selectedBasis
  });
  const planContext = createPlanContext({
    version: 1,
    parentFingerprint: null,
    constraintsSnapshot,
    lastAction: null,
    lastActionResult: null
  });

  return attachFingerprint(publicPlan, planContext);
}

/**
 * @param {{
 *   validatePayload?: (payload?: GeneratePayload) => GenerateValidationResult,
 *   retrieve?: typeof retrieveRouteCandidates,
 *   repairPolicy?: typeof runRepairPolicy,
 *   mapEnrichment?: ((args: { publicPlan: PublicRoutePlan, constraintsSnapshot: ConstraintsSnapshot }) => Promise<unknown>) | null
 * }} [dependencies]
 */
export function createGenerateRoutePlanEntry({
  validatePayload = /** @type {(payload?: GeneratePayload) => GenerateValidationResult} */ (validateGeneratePayload),
  retrieve = retrieveRouteCandidates,
  repairPolicy = runRepairPolicy,
  mapEnrichment = enrichRoutePlanWithMap
} = {}) {
  /**
   * @param {GeneratePayload} [payload]
   * @param {{ requestMeta?: Partial<RequestMeta> }} [options]
   * @returns {Promise<EntryResult<PublicRoutePlan>>}
   */
  return async function generateRoutePlanEntry(payload = {}, { requestMeta = {} } = {}) {
    void requestMeta;

    const validated = validatePayload(payload);
    if (!validated.ok) {
      return validated;
    }

    const routePlan = await buildGeneratedPlan({
      constraintsSnapshot: validated.value.constraints_snapshot,
      retrieve,
      repairPolicy
    });

    assertPublicRoutePlanContract(routePlan);

    if (typeof mapEnrichment === 'function') {
      try {
        await mapEnrichment({
          publicPlan: JSON.parse(JSON.stringify(routePlan)),
          constraintsSnapshot: validated.value.constraints_snapshot
        });
      } catch {
        // Map enrichment is best-effort in PR-K and must never affect route generation.
      }
    }

    return {
      ok: true,
      value: routePlan
    };
  };
}

export const generateRoutePlanEntry = createGenerateRoutePlanEntry();
