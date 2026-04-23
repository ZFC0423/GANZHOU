# server/src/services/ai/route-planner-agent/revise-entry.js

```js
// @ts-check

/** @typedef {import('./types.js').PublicRoutePlan} PublicRoutePlan */
/** @typedef {import('./types.js').RequestMeta} RequestMeta */
/** @typedef {import('./types.js').RevisePayload} RevisePayload */
/**
 * @template T
 * @typedef {{ ok: true, value: T } | { ok: false, error: { code: string, message: string, httpStatus: number, details: unknown[] } }} EntryResult
 */
/** @typedef {EntryResult<{ previous_public_plan: import('./types.js').RevisionPublicPlan, previous_plan_context: import('./types.js').PlanContext, action: import('./types.js').Action }>} ReviseValidationResult */

import {
  CANDIDATE_STATUS,
  ERROR_CODES,
  LAST_ACTION_REJECTION_REASONS,
  LAST_ACTION_RESULT_STATUS,
  PLANNING_STATUS
} from './contracts.js';
import { assertPublicRoutePlanContract, validateRevisePayload } from './validate.js';
import { buildInternalBasis } from './basis.js';
import { buildReviseRollback, createPlanContext, attachFingerprint } from './fallback.js';
import { retrieveRouteCandidates } from './retrieve.js';
import { runRepairPolicy } from './repair-policy.js';
import { applyActionToConstraintsSnapshot, assemblePublicRoutePlan, getCapacityTarget, scheduleRoute } from './schedule.js';
import { verifyRouteFingerprint } from './mock.js';

/**
 * @param {string} actualFingerprint
 * @returns {EntryResult<never>}
 */
function createFingerprintMismatchResult(actualFingerprint) {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.PREVIOUS_FINGERPRINT_MISMATCH,
      message: 'previous fingerprint does not match previous public plan',
      httpStatus: 400,
      details: [
        {
          field: 'previous_plan_context.fingerprint',
          reason: 'mismatch',
          expected: 'fingerprint derived from allowlisted canonical payload',
          actual: actualFingerprint
        }
      ]
    }
  };
}

async function buildRevisedPlan({
  previousPublicPlan,
  previousPlanContext,
  action,
  retrieve = retrieveRouteCandidates,
  repairPolicy = runRepairPolicy
}) {
  const actionApplied = applyActionToConstraintsSnapshot(
    previousPlanContext.constraints_snapshot,
    previousPublicPlan,
    action
  );

  if (!actionApplied.ok) {
    return buildReviseRollback({
      previousPublicPlan,
      previousPlanContext,
      action,
      reasonCode: actionApplied.reason_code || LAST_ACTION_REJECTION_REASONS.INSUFFICIENT_CANDIDATES,
      message: '鏈璋冩暣鐩爣涓嶆槑纭紝鍘熻矾绾垮凡淇濈暀銆?,
      diagnostics: actionApplied.diagnostics || []
    });
  }

  const constraintsSnapshot = actionApplied.constraints_snapshot;
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
    mode: 'revise',
    previousPublicPlan,
    action
  });

  primaryBasis.capacity_target = primarySchedule.capacity_target;
  primaryBasis.capacity_achieved = primarySchedule.capacity_achieved;

  let selectedBasis = primaryBasis;
  let selectedSchedule = primarySchedule;

  if (!primarySchedule.feasible || primarySchedule.candidate_status !== CANDIDATE_STATUS.READY) {
    const repaired = await repairPolicy({
      constraintsSnapshot,
      mode: 'revise',
      previousPublicPlan,
      action,
      retrieve
    });

    if (repaired.scheduleResult.feasible && repaired.scheduleResult.capacity_achieved >= primarySchedule.capacity_achieved) {
      selectedBasis = repaired.internalBasis;
      selectedSchedule = repaired.scheduleResult;
    }
  }

  if (!selectedSchedule.feasible) {
    return buildReviseRollback({
      previousPublicPlan,
      previousPlanContext,
      action,
      reasonCode: selectedSchedule.reason_code || LAST_ACTION_REJECTION_REASONS.NO_LEGAL_REPLACEMENT,
      message: '鏈璋冩暣娌℃湁鎵惧埌鍚堟硶鏇夸唬鐐逛綅锛屽師璺嚎宸蹭繚鐣欍€?,
      diagnostics: selectedSchedule.diagnostics || []
    });
  }

  const publicPlan = assemblePublicRoutePlan({
    constraintsSnapshot,
    scheduleResult: selectedSchedule,
    planningStatus: PLANNING_STATUS.REVISED,
    internalBasis: selectedBasis
  });
  const planContext = createPlanContext({
    version: previousPlanContext.version + 1,
    parentFingerprint: previousPlanContext.fingerprint,
    constraintsSnapshot,
    lastAction: action,
    lastActionResult: {
      status: LAST_ACTION_RESULT_STATUS.APPLIED,
      reason_code: null,
      message: '',
      diagnostics: []
    }
  });

  return attachFingerprint(publicPlan, planContext);
}

/**
 * @param {{
 *   validatePayload?: (payload?: RevisePayload) => ReviseValidationResult,
 *   verifyFingerprint?: typeof verifyRouteFingerprint,
 *   retrieve?: typeof retrieveRouteCandidates,
 *   repairPolicy?: typeof runRepairPolicy
 * }} [dependencies]
 */
export function createReviseRoutePlanEntry({
  validatePayload = /** @type {(payload?: RevisePayload) => ReviseValidationResult} */ (validateRevisePayload),
  verifyFingerprint = verifyRouteFingerprint,
  retrieve = retrieveRouteCandidates,
  repairPolicy = runRepairPolicy
} = {}) {
  /**
   * @param {RevisePayload} [payload]
   * @param {{ requestMeta?: Partial<RequestMeta> }} [options]
   * @returns {Promise<EntryResult<PublicRoutePlan>>}
   */
  return async function reviseRoutePlanEntry(payload = {}, { requestMeta = {} } = {}) {
    void requestMeta;

    const validated = validatePayload(payload);
    if (!validated.ok) {
      return validated;
    }

    const { previous_public_plan: previousPublicPlan, previous_plan_context: previousPlanContext, action } = validated.value;

    const isFingerprintValid = verifyFingerprint({
      publicPlan: previousPublicPlan,
      planContext: previousPlanContext
    });

    if (!isFingerprintValid) {
      return createFingerprintMismatchResult(previousPlanContext.fingerprint);
    }

    const routePlan = await buildRevisedPlan({
      previousPublicPlan,
      previousPlanContext,
      action,
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

export const reviseRoutePlanEntry = createReviseRoutePlanEntry();
```

