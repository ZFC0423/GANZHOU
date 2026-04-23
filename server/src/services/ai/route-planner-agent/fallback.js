// @ts-check

/** @typedef {import('./types.js').Action} Action */
/** @typedef {import('./types.js').ConstraintsSnapshot} ConstraintsSnapshot */
/** @typedef {import('./types.js').InternalBasis} InternalBasis */
/** @typedef {import('./types.js').LastActionResult} LastActionResult */
/** @typedef {import('./types.js').PlanContext} PlanContext */
/** @typedef {import('./types.js').PublicRoutePlan} PublicRoutePlan */
/** @typedef {import('./types.js').RevisionPublicPlan} RevisionPublicPlan */

import {
  CANDIDATE_STATUS,
  LAST_ACTION_RESULT_STATUS,
  PLANNING_STATUS,
  ROUTE_PLANNER_SOURCE,
  ROUTE_PLANNER_TASK_TYPE,
  createAdjustmentOptions
} from './contracts.js';
import { buildPublicBasis } from './basis.js';
import { createRouteFingerprint } from './mock.js';
import { ROUTE_RETRIEVAL_PRIVATE } from './retrieve.js';

const { normalizeRegionKey } = ROUTE_RETRIEVAL_PRIVATE;

function cloneSnapshot(snapshot) {
  return {
    ...snapshot,
    time_budget: {
      days: snapshot.time_budget.days
    },
    theme_preferences: [...snapshot.theme_preferences],
    companions: [...snapshot.companions],
    hard_avoidances: [...snapshot.hard_avoidances],
    physical_constraints: [...snapshot.physical_constraints]
  };
}

function resolveFallbackRegion(snapshot) {
  return normalizeRegionKey(snapshot.focused_region_key)
    || normalizeRegionKey(snapshot.destination_scope)
    || normalizeRegionKey(snapshot.route_origin)
    || 'ganzhou';
}

function buildEmptyDays(snapshot) {
  const regionKey = resolveFallbackRegion(snapshot);

  return Array.from({ length: snapshot.time_budget.days }, (_, index) => ({
    day_index: index + 1,
    region_key: regionKey,
    items: []
  }));
}

/**
 * @param {{
 *   version: number,
 *   parentFingerprint: string | null,
 *   constraintsSnapshot: ConstraintsSnapshot,
 *   lastAction: Action | null,
 *   lastActionResult: LastActionResult | null
 * }} input
 * @returns {PlanContext}
 */
export function createPlanContext({ version, parentFingerprint, constraintsSnapshot, lastAction, lastActionResult }) {
  return {
    version,
    fingerprint: '',
    parent_fingerprint: parentFingerprint,
    source: ROUTE_PLANNER_SOURCE,
    constraints_snapshot: cloneSnapshot(constraintsSnapshot),
    last_action: lastAction,
    last_action_result: lastActionResult
  };
}

export function attachFingerprint(publicPlan, planContext) {
  planContext.fingerprint = createRouteFingerprint({
    publicPlan,
    planContext
  });

  return {
    ...publicPlan,
    plan_context: planContext
  };
}

/**
 * @param {{
 *   constraintsSnapshot: ConstraintsSnapshot,
 *   internalBasis?: InternalBasis | null
 * }} input
 * @returns {PublicRoutePlan}
 */
export function buildGenerateFallback({ constraintsSnapshot, internalBasis = null }) {
  const days = buildEmptyDays(constraintsSnapshot);
  const publicPlan = {
    task_type: ROUTE_PLANNER_TASK_TYPE,
    candidate_status: CANDIDATE_STATUS.EMPTY,
    planning_status: PLANNING_STATUS.GENERATED,
    route_positioning: {
      duration_days: days.length,
      travel_mode: constraintsSnapshot.travel_mode,
      pace_preference: constraintsSnapshot.pace_preference,
      theme_preferences: [...constraintsSnapshot.theme_preferences]
    },
    summary: {
      total_days: days.length,
      total_items: 0
    },
    days,
    route_highlights: ['empty', resolveFallbackRegion(constraintsSnapshot)],
    adjustment_options: createAdjustmentOptions(),
    basis: internalBasis ? buildPublicBasis(internalBasis) : {
      source: ROUTE_PLANNER_SOURCE,
      items: []
    }
  };
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
 *   previousPublicPlan: RevisionPublicPlan,
 *   previousPlanContext: PlanContext,
 *   action: Action,
 *   reasonCode: string,
 *   message?: string,
 *   diagnostics?: string[]
 * }} input
 * @returns {PublicRoutePlan}
 */
export function buildReviseRollback({
  previousPublicPlan,
  previousPlanContext,
  action,
  reasonCode,
  message = '',
  diagnostics = []
}) {
  const publicPlan = {
    ...previousPublicPlan,
    planning_status: PLANNING_STATUS.REVISED
  };
  const planContext = createPlanContext({
    version: previousPlanContext.version + 1,
    parentFingerprint: previousPlanContext.fingerprint,
    constraintsSnapshot: previousPlanContext.constraints_snapshot,
    lastAction: action,
    lastActionResult: {
      status: LAST_ACTION_RESULT_STATUS.REJECTED,
      reason_code: reasonCode,
      message,
      diagnostics
    }
  });

  return attachFingerprint(publicPlan, planContext);
}
