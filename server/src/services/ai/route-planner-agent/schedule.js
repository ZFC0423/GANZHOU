// @ts-check

/** @typedef {import('./types.js').Action} Action */
/** @typedef {import('./types.js').Anchor} Anchor */
/** @typedef {import('./types.js').CandidateRecord} CandidateRecord */
/** @typedef {import('./types.js').ConstraintsSnapshot} ConstraintsSnapshot */
/** @typedef {import('./types.js').InternalBasis} InternalBasis */
/** @typedef {import('./types.js').RevisionPublicPlan} RevisionPublicPlan */
/** @typedef {import('./types.js').RouteDay} RouteDay */
/** @typedef {import('./types.js').RouteItem} RouteItem */
/** @typedef {import('./types.js').ScheduleResult} ScheduleResult */

import {
  CANDIDATE_STATUS,
  LAST_ACTION_REJECTION_REASONS,
  PLANNING_STATUS,
  REGION_ALIASES,
  ROUTE_WARNING_CODES,
  ROUTE_PLANNER_TASK_TYPE,
  createRouteWarning,
  createAdjustmentOptions
} from './contracts.js';
import { buildPublicBasis, classifyCandidateStatus } from './basis.js';
import { ROUTE_RETRIEVAL_PRIVATE } from './retrieve.js';

const { normalizeRegionKey } = ROUTE_RETRIEVAL_PRIVATE;

const ITEMS_PER_DAY = {
  relaxed: 2,
  normal: 3,
  compact: 4
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function normalizeKnownRegionKey(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }

  return REGION_ALIASES[raw] || REGION_ALIASES[raw.toLowerCase()] || null;
}

function cloneSnapshot(snapshot) {
  return {
    ...snapshot,
    time_budget: {
      days: snapshot.time_budget.days
    },
    theme_preferences: [...snapshot.theme_preferences],
    companions: [...snapshot.companions],
    hard_avoidances: [...snapshot.hard_avoidances],
    physical_constraints: [...snapshot.physical_constraints],
    locked_targets: [...(snapshot.locked_targets || [])]
  };
}

export function getCapacityPerDay(pacePreference) {
  return ITEMS_PER_DAY[pacePreference] || ITEMS_PER_DAY.normal;
}

export function getCapacityTarget(snapshot) {
  return snapshot.time_budget.days * getCapacityPerDay(snapshot.pace_preference);
}

function compareCandidates(left, right) {
  if (left.is_locked !== right.is_locked) return left.is_locked ? -1 : 1;
  if (right.score !== left.score) return right.score - left.score;
  if (right.recommend_flag !== left.recommend_flag) return right.recommend_flag - left.recommend_flag;
  if (right.hot_score !== left.hot_score) return right.hot_score - left.hot_score;
  return left.item_key.localeCompare(right.item_key, 'zh-CN');
}

function getCandidateValue(candidate) {
  return candidate.score + candidate.recommend_flag * 8 + Math.min(candidate.hot_score, 100) / 10;
}

function getAnchorValue(anchor) {
  return anchor.internal_score + anchor.recommend_flag * 8 + Math.min(anchor.hot_score, 100) / 10;
}

function sortRegionsByCandidates(candidates, snapshot) {
  const regionScores = new Map();

  candidates.forEach((candidate) => {
    if (!candidate.region_key) return;
    const current = regionScores.get(candidate.region_key) || { score: 0, count: 0 };
    current.score += candidate.score;
    current.count += 1;
    regionScores.set(candidate.region_key, current);
  });

  const preferredRegion = normalizeRegionKey(snapshot.focused_region_key)
    || normalizeRegionKey(snapshot.destination_scope)
    || normalizeRegionKey(snapshot.route_origin);

  if (preferredRegion && !regionScores.has(preferredRegion)) {
    regionScores.set(preferredRegion, { score: 0, count: 0 });
  }

  if (!regionScores.size) {
    regionScores.set(preferredRegion || 'ganzhou', { score: 0, count: 0 });
  }

  return [...regionScores.entries()]
    .sort((left, right) => {
      if (right[1].count !== left[1].count) return right[1].count - left[1].count;
      if (right[1].score !== left[1].score) return right[1].score - left[1].score;
      return left[0].localeCompare(right[0], 'zh-CN');
    })
    .map(([regionKey]) => regionKey);
}

function createDayShells(snapshot, routeCandidates) {
  const dayCount = snapshot.time_budget.days;
  const focusedRegion = normalizeRegionKey(snapshot.focused_region_key);
  const regionOrder = sortRegionsByCandidates(routeCandidates, snapshot);

  return Array.from({ length: dayCount }, (_, index) => ({
    day_index: index + 1,
    region_key: snapshot.same_region_only && focusedRegion
      ? focusedRegion
      : regionOrder[index % regionOrder.length],
    items: []
  }));
}

function candidateAllowedForDay(candidate, day, snapshot) {
  if (!candidate.is_route_item || !candidate.region_key) return false;
  if (candidate.is_locked) return true;
  if (snapshot.family_friendly_only && !candidate.family_friendly) return false;

  const focusedRegion = normalizeRegionKey(snapshot.focused_region_key);
  if (snapshot.same_region_only && focusedRegion && candidate.region_key !== focusedRegion) {
    return false;
  }

  if (snapshot.avoid_far_spots) {
    const requiredRegion = focusedRegion || day.region_key;
    if (requiredRegion && candidate.region_key !== requiredRegion) {
      return false;
    }
  }

  return true;
}

function toRouteItem(candidate) {
  return {
    item_key: candidate.item_key,
    title: candidate.title,
    region_key: candidate.region_key || 'ganzhou',
    family_friendly: candidate.family_friendly
  };
}

function totalItems(days) {
  return days.reduce((count, day) => count + day.items.length, 0);
}

function getLockedKeys(snapshot) {
  return Array.isArray(snapshot.locked_targets) ? snapshot.locked_targets : [];
}

function getLockedCandidates(routeCandidates, snapshot) {
  const byKey = new Map(routeCandidates.map((candidate) => [candidate.item_key, candidate]));

  return getLockedKeys(snapshot)
    .map((itemKey) => byKey.get(itemKey))
    .filter(Boolean);
}

function hasLowWalkingConstraint(snapshot) {
  const physicalConstraints = Array.isArray(snapshot.physical_constraints) ? snapshot.physical_constraints : [];
  const hardAvoidances = Array.isArray(snapshot.hard_avoidances) ? snapshot.hard_avoidances : [];

  return physicalConstraints.includes('low_walking') || hardAvoidances.includes('too_tiring');
}

function isHighWalkingCandidate(candidate) {
  const value = String(candidate.walking_intensity || '').toLowerCase();
  return value.includes('high') || value.includes('高');
}

function buildLockedConflictWarning(code, lockedCandidates, fallbackKeys = []) {
  const keys = lockedCandidates.length
    ? lockedCandidates.map((candidate) => candidate.item_key)
    : fallbackKeys;

  return createRouteWarning({
    code,
    conflictingKeys: keys
  });
}

function detectLockedScheduleConflict(snapshot, lockedCandidates) {
  const lockedKeys = getLockedKeys(snapshot);
  if (!lockedKeys.length) {
    return null;
  }

  if (lockedCandidates.length !== lockedKeys.length) {
    return buildLockedConflictWarning(ROUTE_WARNING_CODES.LOCKED_TARGET_NOT_FOUND, lockedCandidates, lockedKeys);
  }

  const capacityTarget = getCapacityTarget(snapshot);
  if (lockedCandidates.length > capacityTarget) {
    return buildLockedConflictWarning(
      snapshot.time_budget.days <= 1
        ? ROUTE_WARNING_CODES.LOCKED_TARGETS_EXCEED_DAY_CAPACITY
        : ROUTE_WARNING_CODES.LOCKED_TARGETS_CONFLICT_WITH_PACE,
      lockedCandidates
    );
  }

  if (hasLowWalkingConstraint(snapshot) && lockedCandidates.some(isHighWalkingCandidate)) {
    return buildLockedConflictWarning(ROUTE_WARNING_CODES.LOCKED_TARGETS_CONFLICT_WITH_PHYSICAL_CONSTRAINTS, lockedCandidates);
  }

  const lockedRegions = Array.from(new Set(lockedCandidates.map((candidate) => normalizeRegionKey(candidate.region_key)).filter(Boolean)));
  const focusedRegion = normalizeRegionKey(snapshot.focused_region_key);

  if (snapshot.same_region_only && focusedRegion && lockedRegions.some((regionKey) => regionKey !== focusedRegion)) {
    return buildLockedConflictWarning(ROUTE_WARNING_CODES.LOCKED_TARGETS_REGION_SPAN_CONFLICT, lockedCandidates);
  }

  if (snapshot.avoid_far_spots && lockedRegions.length > 1) {
    return buildLockedConflictWarning(ROUTE_WARNING_CODES.LOCKED_TARGETS_REGION_SPAN_CONFLICT, lockedCandidates);
  }

  if (snapshot.time_budget.days === 1 && snapshot.travel_mode === 'public_transport' && snapshot.same_region_only && lockedRegions.length > 1) {
    return buildLockedConflictWarning(ROUTE_WARNING_CODES.LOCKED_TARGETS_CROSS_REGION_UNSUPPORTED, lockedCandidates);
  }

  return null;
}

function placeLockedCandidates(days, lockedCandidates, snapshot, usedKeys) {
  const capacityPerDay = getCapacityPerDay(snapshot.pace_preference);

  lockedCandidates.forEach((candidate) => {
    const routeItem = toRouteItem(candidate);
    const preferredDays = [
      ...days.filter((day) => day.region_key === routeItem.region_key),
      ...days
    ];
    const seenDays = new Set();

    for (const day of preferredDays) {
      if (seenDays.has(day.day_index)) continue;
      seenDays.add(day.day_index);

      if (day.items.length >= capacityPerDay) continue;
      day.items.push(routeItem);
      usedKeys.add(candidate.item_key);
      return;
    }
  });
}

function getLockedInvariantWarning(snapshot, days) {
  const lockedKeys = getLockedKeys(snapshot);
  if (!lockedKeys.length) {
    return null;
  }

  const counts = new Map();
  days.forEach((day) => {
    day.items.forEach((item) => {
      if (lockedKeys.includes(item.item_key)) {
        counts.set(item.item_key, (counts.get(item.item_key) || 0) + 1);
      }
    });
  });

  const violated = lockedKeys.filter((itemKey) => counts.get(itemKey) !== 1);

  if (!violated.length) {
    return null;
  }

  return createRouteWarning({
    code: ROUTE_WARNING_CODES.LOCKED_TARGETS_CONFLICT_WITH_PACE,
    conflictingKeys: violated
  });
}

function fillDaysWithCandidates(days, routeCandidates, snapshot, usedKeys = new Set()) {
  const capacityPerDay = getCapacityPerDay(snapshot.pace_preference);
  const sortedCandidates = [...routeCandidates].sort(compareCandidates);

  days.forEach((day) => {
    while (day.items.length < capacityPerDay) {
      const candidate = sortedCandidates.find((item) => !usedKeys.has(item.item_key) && candidateAllowedForDay(item, day, snapshot));
      if (!candidate) break;

      day.items.push(toRouteItem(candidate));
      usedKeys.add(candidate.item_key);
    }
  });

  if (!snapshot.same_region_only && !snapshot.avoid_far_spots) {
    days.forEach((day) => {
      while (day.items.length < capacityPerDay) {
        const candidate = sortedCandidates.find((item) => !usedKeys.has(item.item_key) && item.is_route_item);
        if (!candidate) break;

        day.items.push(toRouteItem(candidate));
        usedKeys.add(candidate.item_key);
      }
    });
  }

  return days;
}

function inferThemeMatch(candidate, snapshot) {
  return candidate.matched_by.includes('theme_preferences') || candidate.matched_by.includes('category_code') ? 1 : 0;
}

export function extractAnchors(previousPublicPlan, internalBasis, snapshot) {
  const candidateByKey = new Map(internalBasis.route_candidates.map((candidate) => [candidate.item_key, candidate]));
  const anchors = [];

  previousPublicPlan.days.forEach((day) => {
    day.items.forEach((item, itemIndex) => {
      const candidate = candidateByKey.get(item.item_key);
      anchors.push({
        item_key: item.item_key,
        title: item.title,
        region_key: normalizeRegionKey(item.region_key) || item.region_key,
        family_friendly: item.family_friendly,
        original_day_index: day.day_index,
        original_item_index: itemIndex + 1,
        recommend_flag: candidate?.recommend_flag || 0,
        hot_score: candidate?.hot_score || 0,
        internal_score: candidate?.score || 0,
        theme_match: candidate ? inferThemeMatch(candidate, snapshot) : 0,
        layer: 'preferred'
      });
    });
  });

  return anchors;
}

export function deriveDominantRegionFromPlan(previousPublicPlan) {
  const counts = new Map();

  previousPublicPlan.days.forEach((day) => {
    day.items.forEach((item) => {
      const regionKey = normalizeRegionKey(item.region_key);
      if (!regionKey) return;
      counts.set(regionKey, (counts.get(regionKey) || 0) + 1);
    });
  });

  const ranked = [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return left[0].localeCompare(right[0], 'zh-CN');
  });

  if (!ranked.length) {
    return {
      ok: false,
      reason_code: LAST_ACTION_REJECTION_REASONS.AMBIGUOUS_TARGET_REGION,
      diagnostics: ['no_anchor_region_to_infer_target']
    };
  }

  if (ranked.length === 1) {
    return {
      ok: true,
      region_key: ranked[0][0],
      diagnostics: []
    };
  }

  const [firstRegion, firstCount] = ranked[0];
  const [, secondCount] = ranked[1];
  const hasAbsoluteLead = firstCount > secondCount;
  const hasRelativeLead = firstCount >= secondCount * 1.2;

  if (!hasAbsoluteLead || !hasRelativeLead) {
    return {
      ok: false,
      reason_code: LAST_ACTION_REJECTION_REASONS.AMBIGUOUS_TARGET_REGION,
      diagnostics: [`dominant_region_not_clear:${firstCount}:${secondCount}`]
    };
  }

  return {
    ok: true,
    region_key: firstRegion,
    diagnostics: []
  };
}

export function applyActionToConstraintsSnapshot(previousSnapshot, previousPublicPlan, action) {
  const nextSnapshot = cloneSnapshot(previousSnapshot);

  switch (action.type) {
    case 'compress_to_one_day':
      nextSnapshot.time_budget.days = 1;
      break;
    case 'expand_to_two_days':
      nextSnapshot.time_budget.days = 2;
      break;
    case 'focus_same_region': {
      const hasExplicitTarget = isPlainObject(action.payload) && hasOwn(action.payload, 'target_region_key');
      if (hasExplicitTarget) {
        const payloadTarget = normalizeKnownRegionKey(action.payload?.target_region_key);
        if (!payloadTarget) {
          return {
            ok: false,
            reason_code: LAST_ACTION_REJECTION_REASONS.INVALID_TARGET_REGION,
            diagnostics: ['invalid_explicit_target_region']
          };
        }

        nextSnapshot.same_region_only = true;
        nextSnapshot.focused_region_key = payloadTarget;
        break;
      }

      const dominant = deriveDominantRegionFromPlan(previousPublicPlan);
      if (!dominant.ok) {
        return dominant;
      }

      nextSnapshot.same_region_only = true;
      nextSnapshot.focused_region_key = dominant.region_key;
      break;
    }
    case 'relax_pace':
      nextSnapshot.pace_preference = 'relaxed';
      break;
    case 'replace_far_spots':
      nextSnapshot.avoid_far_spots = true;
      break;
    case 'family_friendly_only':
      nextSnapshot.family_friendly_only = true;
      break;
    default:
      break;
  }

  return {
    ok: true,
    constraints_snapshot: nextSnapshot,
    diagnostics: []
  };
}

function anchorViolatesHardConstraints(anchor, snapshot) {
  const focusedRegion = normalizeRegionKey(snapshot.focused_region_key);

  if (snapshot.family_friendly_only && !anchor.family_friendly) return true;
  if (snapshot.same_region_only && focusedRegion && anchor.region_key !== focusedRegion) return true;

  return false;
}

function isAnchorFarForAction(anchor, previousPublicPlan) {
  const originalDay = previousPublicPlan.days.find((day) => day.day_index === anchor.original_day_index);
  const coreRegion = normalizeRegionKey(originalDay?.region_key);
  return Boolean(coreRegion && anchor.region_key !== coreRegion);
}

function classifyAnchor(anchor, snapshot, previousPublicPlan, action) {
  if (anchorViolatesHardConstraints(anchor, snapshot)) {
    return {
      ...anchor,
      layer: 'replaceable'
    };
  }

  if (action?.type === 'replace_far_spots' && isAnchorFarForAction(anchor, previousPublicPlan)) {
    return {
      ...anchor,
      layer: 'replaceable'
    };
  }

  if (action?.type === 'family_friendly_only' && !anchor.family_friendly) {
    return {
      ...anchor,
      layer: 'replaceable'
    };
  }

  return {
    ...anchor,
    layer: action?.type === 'expand_to_two_days' ? 'locked' : 'preferred'
  };
}

function sortAnchorsForShrink(left, right) {
  const leftValue = getAnchorValue(left);
  const rightValue = getAnchorValue(right);
  if (rightValue !== leftValue) return rightValue - leftValue;
  if (right.theme_match !== left.theme_match) return right.theme_match - left.theme_match;
  if (left.original_day_index !== right.original_day_index) return left.original_day_index - right.original_day_index;
  if (left.original_item_index !== right.original_item_index) return left.original_item_index - right.original_item_index;
  return left.item_key.localeCompare(right.item_key, 'zh-CN');
}

function sortAnchorsForStability(left, right) {
  if (left.original_day_index !== right.original_day_index) return left.original_day_index - right.original_day_index;
  if (left.original_item_index !== right.original_item_index) return left.original_item_index - right.original_item_index;
  return left.item_key.localeCompare(right.item_key, 'zh-CN');
}

function placeRouteItem(days, routeItem, preferredDayIndex, snapshot) {
  const capacityPerDay = getCapacityPerDay(snapshot.pace_preference);
  const dayPreferences = [
    days.find((day) => day.day_index === preferredDayIndex),
    ...days.filter((day) => day.region_key === routeItem.region_key),
    ...days
  ].filter(Boolean);

  const seenDays = new Set();
  for (const day of dayPreferences) {
    if (seenDays.has(day.day_index)) continue;
    seenDays.add(day.day_index);

    if (day.items.length >= capacityPerDay) continue;
    if (snapshot.same_region_only && normalizeRegionKey(routeItem.region_key) !== normalizeRegionKey(snapshot.focused_region_key)) continue;
    if (snapshot.avoid_far_spots && normalizeRegionKey(routeItem.region_key) !== normalizeRegionKey(day.region_key)) continue;

    day.items.push(routeItem);
    return true;
  }

  return false;
}

function selectAnchorsForRevise({ previousPublicPlan, internalBasis, snapshot, action }) {
  const anchors = extractAnchors(previousPublicPlan, internalBasis, snapshot)
    .map((anchor) => classifyAnchor(anchor, snapshot, previousPublicPlan, action))
    .filter((anchor) => anchor.layer !== 'replaceable');
  const capacityTarget = getCapacityTarget(snapshot);

  if (['compress_to_one_day', 'relax_pace'].includes(action?.type || '')) {
    return anchors.sort(sortAnchorsForShrink).slice(0, capacityTarget);
  }

  return anchors.sort(sortAnchorsForStability).slice(0, capacityTarget);
}

function scheduleGenerate(constraintsSnapshot, internalBasis) {
  const routeCandidates = internalBasis.route_candidates;
  const days = createDayShells(constraintsSnapshot, routeCandidates);
  const capacityTarget = getCapacityTarget(constraintsSnapshot);
  const lockedCandidates = getLockedCandidates(routeCandidates, constraintsSnapshot);
  const lockedConflict = detectLockedScheduleConflict(constraintsSnapshot, lockedCandidates);

  if (lockedConflict) {
    return {
      feasible: false,
      reason_code: lockedConflict.code,
      days,
      candidate_status: CANDIDATE_STATUS.READY,
      capacity_target: capacityTarget,
      capacity_achieved: 0,
      diagnostics: internalBasis.diagnostics,
      warnings: [lockedConflict],
      degraded: internalBasis.degraded
    };
  }

  const usedKeys = new Set();
  placeLockedCandidates(days, lockedCandidates, constraintsSnapshot, usedKeys);

  fillDaysWithCandidates(days, routeCandidates, constraintsSnapshot, usedKeys);
  const invariantWarning = getLockedInvariantWarning(constraintsSnapshot, days);

  if (invariantWarning) {
    return {
      feasible: false,
      reason_code: invariantWarning.code,
      days,
      candidate_status: CANDIDATE_STATUS.READY,
      capacity_target: capacityTarget,
      capacity_achieved: totalItems(days),
      diagnostics: internalBasis.diagnostics,
      warnings: [invariantWarning],
      degraded: internalBasis.degraded
    };
  }

  const capacityAchieved = totalItems(days);
  const candidateStatus = classifyCandidateStatus({
    hardFeasible: capacityAchieved > 0,
    capacityTarget,
    capacityAchieved,
    degraded: internalBasis.degraded
  });

  return {
    feasible: capacityAchieved > 0,
    reason_code: capacityAchieved > 0 ? null : LAST_ACTION_REJECTION_REASONS.INSUFFICIENT_CANDIDATES,
    days,
    candidate_status: candidateStatus,
    capacity_target: capacityTarget,
    capacity_achieved: capacityAchieved,
    diagnostics: internalBasis.diagnostics,
    warnings: [],
    degraded: internalBasis.degraded
  };
}

function scheduleRevise({ constraintsSnapshot, internalBasis, previousPublicPlan, action }) {
  const routeCandidates = internalBasis.route_candidates;
  const days = createDayShells(constraintsSnapshot, routeCandidates);
  const capacityTarget = getCapacityTarget(constraintsSnapshot);
  const lockedCandidates = getLockedCandidates(routeCandidates, constraintsSnapshot);
  const lockedConflict = detectLockedScheduleConflict(constraintsSnapshot, lockedCandidates);

  if (lockedConflict) {
    return {
      feasible: false,
      reason_code: lockedConflict.code,
      days,
      candidate_status: CANDIDATE_STATUS.READY,
      capacity_target: capacityTarget,
      capacity_achieved: 0,
      diagnostics: internalBasis.diagnostics,
      warnings: [lockedConflict],
      degraded: internalBasis.degraded
    };
  }

  const selectedAnchors = selectAnchorsForRevise({
    previousPublicPlan,
    internalBasis,
    snapshot: constraintsSnapshot,
    action
  }).filter((anchor) => !getLockedKeys(constraintsSnapshot).includes(anchor.item_key));
  const usedKeys = new Set();

  placeLockedCandidates(days, lockedCandidates, constraintsSnapshot, usedKeys);

  selectedAnchors.forEach((anchor) => {
    const routeItem = {
      item_key: anchor.item_key,
      title: anchor.title,
      region_key: anchor.region_key,
      family_friendly: anchor.family_friendly
    };

    if (placeRouteItem(days, routeItem, anchor.original_day_index, constraintsSnapshot)) {
      usedKeys.add(anchor.item_key);
    }
  });

  fillDaysWithCandidates(days, routeCandidates, constraintsSnapshot, usedKeys);

  const invariantWarning = getLockedInvariantWarning(constraintsSnapshot, days);
  if (invariantWarning) {
    return {
      feasible: false,
      reason_code: invariantWarning.code,
      days,
      candidate_status: CANDIDATE_STATUS.READY,
      capacity_target: capacityTarget,
      capacity_achieved: totalItems(days),
      diagnostics: internalBasis.diagnostics,
      warnings: [invariantWarning],
      degraded: internalBasis.degraded
    };
  }

  const capacityAchieved = totalItems(days);
  const candidateStatus = classifyCandidateStatus({
    hardFeasible: capacityAchieved > 0,
    capacityTarget,
    capacityAchieved,
    degraded: internalBasis.degraded
  });

  return {
    feasible: capacityAchieved > 0,
    reason_code: capacityAchieved > 0 ? null : LAST_ACTION_REJECTION_REASONS.NO_LEGAL_REPLACEMENT,
    days,
    candidate_status: candidateStatus,
    capacity_target: capacityTarget,
    capacity_achieved: capacityAchieved,
    diagnostics: internalBasis.diagnostics,
    warnings: [],
    degraded: internalBasis.degraded
  };
}

/**
 * @param {{
 *   constraintsSnapshot?: ConstraintsSnapshot,
 *   internalBasis?: InternalBasis,
 *   mode?: 'generate' | 'revise',
 *   previousPublicPlan?: RevisionPublicPlan | null,
 *   action?: Action | null
 * }} input
 * @returns {ScheduleResult}
 */
export function scheduleRoute(input = {}) {
  const {
    constraintsSnapshot,
    internalBasis,
    mode = 'generate',
    previousPublicPlan = null,
    action = null
  } = input;

  if (!constraintsSnapshot || !internalBasis) {
    throw new Error('constraintsSnapshot and internalBasis are required');
  }

  if (mode === 'revise') {
    return scheduleRevise({
      constraintsSnapshot,
      internalBasis,
      previousPublicPlan,
      action
    });
  }

  return scheduleGenerate(constraintsSnapshot, internalBasis);
}

function buildRouteHighlights(snapshot, days, candidateStatus) {
  const values = [
    candidateStatus,
    ...days.map((day) => day.region_key),
    ...snapshot.theme_preferences
  ].filter(Boolean);

  if (snapshot.family_friendly_only) values.push('family_friendly');
  if (snapshot.same_region_only) values.push('same_region');
  if (snapshot.avoid_far_spots) values.push('region_compact');

  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, 'zh-CN')).slice(0, 8);
}

/**
 * @param {{
 *   constraintsSnapshot: ConstraintsSnapshot,
 *   scheduleResult: ScheduleResult,
 *   planningStatus?: import('./types.js').PlanningStatus,
 *   internalBasis: InternalBasis
 * }} input
 */
export function assemblePublicRoutePlan({ constraintsSnapshot, scheduleResult, planningStatus = PLANNING_STATUS.GENERATED, internalBasis }) {
  const days = scheduleResult.days;

  return {
    task_type: ROUTE_PLANNER_TASK_TYPE,
    candidate_status: scheduleResult.candidate_status,
    planning_status: planningStatus,
    route_positioning: {
      duration_days: days.length,
      travel_mode: constraintsSnapshot.travel_mode,
      pace_preference: constraintsSnapshot.pace_preference,
      theme_preferences: [...constraintsSnapshot.theme_preferences]
    },
    summary: {
      total_days: days.length,
      total_items: totalItems(days)
    },
    days,
    route_highlights: buildRouteHighlights(constraintsSnapshot, days, scheduleResult.candidate_status),
    adjustment_options: createAdjustmentOptions(),
    warnings: [...(scheduleResult.warnings || internalBasis.warnings || [])],
    basis: buildPublicBasis(internalBasis)
  };
}

export const ROUTE_SCHEDULE_PRIVATE = {
  createDayShells,
  fillDaysWithCandidates,
  selectAnchorsForRevise,
  sortAnchorsForShrink,
  placeRouteItem,
  getAnchorValue
};
