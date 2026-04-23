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

import { CANDIDATE_STATUS, PLANNING_STATUS } from './contracts.js';
import { assertPublicRoutePlanContract, validateGeneratePayload } from './validate.js';
import { buildInternalBasis } from './basis.js';
import { buildGenerateFallback, createPlanContext, attachFingerprint } from './fallback.js';
import { retrieveRouteCandidates } from './retrieve.js';
import { runRepairPolicy } from './repair-policy.js';
import { assemblePublicRoutePlan, getCapacityTarget, scheduleRoute } from './schedule.js';

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
  const primarySchedule = scheduleRoute({
    constraintsSnapshot,
    internalBasis: primaryBasis,
    mode: 'generate'
  });

  primaryBasis.capacity_target = primarySchedule.capacity_target;
  primaryBasis.capacity_achieved = primarySchedule.capacity_achieved;

  let selectedBasis = primaryBasis;
  let selectedSchedule = primarySchedule;

  if (!primarySchedule.feasible || primarySchedule.candidate_status !== CANDIDATE_STATUS.READY) {
    const repaired = await repairPolicy({
      constraintsSnapshot,
      mode: 'generate',
      retrieve
    });

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
 *   repairPolicy?: typeof runRepairPolicy
 * }} [dependencies]
 */
export function createGenerateRoutePlanEntry({
  validatePayload = /** @type {(payload?: GeneratePayload) => GenerateValidationResult} */ (validateGeneratePayload),
  retrieve = retrieveRouteCandidates,
  repairPolicy = runRepairPolicy
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

    return {
      ok: true,
      value: routePlan
    };
  };
}

export const generateRoutePlanEntry = createGenerateRoutePlanEntry();
