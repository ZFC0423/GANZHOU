# server/src/services/ai/route-planner-agent/mock.js

```js
// @ts-check

/** @typedef {import('./types.js').Action} Action */
/** @typedef {import('./types.js').ConstraintsSnapshot} ConstraintsSnapshot */
/** @typedef {import('./types.js').PlanContext} PlanContext */
/** @typedef {import('./types.js').PublicRoutePlan} PublicRoutePlan */
/** @typedef {import('./types.js').RevisionPublicPlan} RevisionPublicPlan */
/** @typedef {ReturnType<typeof import('./validate.js').projectPublicPlanForFingerprint>} FingerprintPublicProjection */
/** @typedef {ReturnType<typeof import('./validate.js').projectPlanContextForFingerprint>} FingerprintContextProjection */

/**
 * @typedef {{
 *   public_plan: FingerprintPublicProjection,
 *   plan_context: FingerprintContextProjection
 * }} FingerprintPayload
 */

/**
 * @typedef {{
 *   version: number,
 *   parentFingerprint: string | null,
 *   constraintsSnapshot: ConstraintsSnapshot,
 *   lastAction: Action | null,
 *   lastActionResult?: import('./types.js').LastActionResult | null
 * }} PlanContextDraftInput
 */

import { createHash } from 'node:crypto';

import {
  ACTION_LABELS,
  ACTION_TYPES,
  CANDIDATE_STATUS,
  PLANNING_STATUS,
  ROUTE_PLANNER_SOURCE,
  ROUTE_PLANNER_TASK_TYPE,
  createAdjustmentOptions
} from './contracts.js';
import { projectPlanContextForFingerprint, projectPublicPlanForFingerprint } from './validate.js';

const ITEMS_PER_DAY = {
  relaxed: 2,
  normal: 3,
  compact: 4
};

const REGION_LABELS = {
  zhanggong: '绔犺础',
  dayu: '澶т綑',
  anyuan: '瀹夎繙',
  ruijin: '鐟為噾'
};

const THEME_LABELS = {
  food: '鍛宠',
  heritage: '鍩庤剦',
  red_culture: '绾㈠彶',
  natural: '灞辨按',
  hakka_culture: '瀹㈠',
  family: '浜叉父',
  photography: '鍙栨櫙'
};

const REGION_ALIASES = {
  绔犺础: 'zhanggong',
  zhanggong: 'zhanggong',
  澶т綑: 'dayu',
  dayu: 'dayu',
  瀹夎繙: 'anyuan',
  anyuan: 'anyuan',
  鐟為噾: 'ruijin',
  ruijin: 'ruijin'
};

function normalizeText(value) {
  return String(value ?? '').trim();
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((accumulator, key) => {
      accumulator[key] = sortObjectKeys(value[key]);
      return accumulator;
    }, {});
}

function canonicalSerialize(value) {
  return JSON.stringify(sortObjectKeys(value));
}

function hashValue(value) {
  return `sha256:${createHash('sha256').update(canonicalSerialize(value)).digest('hex')}`;
}

function toRegionKey(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  return REGION_ALIASES[normalized] || REGION_ALIASES[normalized.toLowerCase()] || null;
}

function resolvePrimaryRegion(snapshot) {
  if (snapshot.focused_region_key) {
    return snapshot.focused_region_key;
  }

  const scopedRegion = toRegionKey(snapshot.destination_scope) || toRegionKey(snapshot.route_origin);
  if (scopedRegion) {
    return scopedRegion;
  }

  if (snapshot.theme_preferences.includes('red_culture')) {
    return 'ruijin';
  }

  if (snapshot.theme_preferences.includes('natural')) {
    return 'anyuan';
  }

  if (snapshot.travel_mode === 'self_drive') {
    return 'dayu';
  }

  return 'zhanggong';
}

function resolveAlternateRegion(primaryRegion) {
  const mapping = {
    zhanggong: 'dayu',
    dayu: 'zhanggong',
    anyuan: 'ruijin',
    ruijin: 'zhanggong'
  };

  return mapping[primaryRegion] || 'zhanggong';
}

function resolveThemeLabel(snapshot) {
  const primaryTheme = snapshot.theme_preferences[0];
  return THEME_LABELS[primaryTheme] || '琛屾梾';
}

function resolveRegionLabel(regionKey) {
  return REGION_LABELS[regionKey] || regionKey;
}

function createTitle(regionKey, snapshot, itemNumber) {
  const parts = [
    resolveRegionLabel(regionKey),
    resolveThemeLabel(snapshot),
    `绔欑偣${itemNumber}`
  ];

  if (snapshot.family_friendly_only) {
    parts.push('浜插瓙');
  }

  if (snapshot.avoid_far_spots) {
    parts.push('杩戠▼');
  }

  return parts.join('路');
}

function buildRegionSequence(snapshot, dayCount) {
  const primaryRegion = resolvePrimaryRegion(snapshot);
  const alternateRegion = resolveAlternateRegion(primaryRegion);

  if (snapshot.same_region_only || dayCount === 1) {
    return Array.from({ length: dayCount }, () => primaryRegion);
  }

  return Array.from({ length: dayCount }, (_, index) => (index % 2 === 0 ? primaryRegion : alternateRegion));
}

function buildDays(snapshot) {
  const totalDays = snapshot.time_budget.days;
  const itemsPerDay = ITEMS_PER_DAY[snapshot.pace_preference] || ITEMS_PER_DAY.normal;
  const regionSequence = buildRegionSequence(snapshot, totalDays);
  let itemCounter = 1;

  return regionSequence.map((regionKey, dayIndex) => ({
    day_index: dayIndex + 1,
    region_key: regionKey,
    items: Array.from({ length: itemsPerDay }, (_, itemIndex) => {
      const currentItemNumber = itemCounter;
      itemCounter += 1;

      return {
        item_key: `d${dayIndex + 1}-i${itemIndex + 1}`,
        title: createTitle(regionKey, snapshot, currentItemNumber),
        region_key: regionKey,
        family_friendly: snapshot.family_friendly_only ? true : itemIndex % 2 === 0
      };
    })
  }));
}

function buildRouteHighlights(snapshot, days) {
  const highlights = [
    days[0]?.region_key || resolvePrimaryRegion(snapshot),
    ...(snapshot.theme_preferences.length ? snapshot.theme_preferences : ['balanced'])
  ];

  if (snapshot.family_friendly_only) {
    highlights.push('family');
  }

  if (snapshot.same_region_only) {
    highlights.push('same-region');
  }

  if (snapshot.avoid_far_spots) {
    highlights.push('nearby-focus');
  }

  return Array.from(new Set(highlights)).sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function buildPublicRoutePlan(snapshot, planningStatus) {
  const days = buildDays(snapshot);
  const totalItems = days.reduce((count, day) => count + day.items.length, 0);

  return {
    task_type: ROUTE_PLANNER_TASK_TYPE,
    candidate_status: CANDIDATE_STATUS.READY,
    planning_status: planningStatus,
    route_positioning: {
      duration_days: snapshot.time_budget.days,
      travel_mode: snapshot.travel_mode,
      pace_preference: snapshot.pace_preference,
      theme_preferences: [...snapshot.theme_preferences]
    },
    summary: {
      total_days: snapshot.time_budget.days,
      total_items: totalItems
    },
    days,
    route_highlights: buildRouteHighlights(snapshot, days),
    adjustment_options: createAdjustmentOptions(),
    basis: {
      source: ROUTE_PLANNER_SOURCE,
      items: []
    }
  };
}

/**
 * @param {RevisionPublicPlan} publicPlan
 * @param {PlanContext} planContext
 * @returns {FingerprintPayload}
 */
function buildFingerprintPayload(publicPlan, planContext) {
  return {
    public_plan: projectPublicPlanForFingerprint(publicPlan),
    plan_context: projectPlanContextForFingerprint(planContext)
  };
}

/**
 * @param {PlanContextDraftInput} input
 * @returns {PlanContext}
 */
function createPlanContext({ version, parentFingerprint, constraintsSnapshot, lastAction, lastActionResult = null }) {
  return {
    version,
    fingerprint: '',
    parent_fingerprint: parentFingerprint,
    source: ROUTE_PLANNER_SOURCE,
    constraints_snapshot: constraintsSnapshot,
    last_action: lastAction,
    last_action_result: lastActionResult
  };
}

export function createRouteFingerprint({ publicPlan, planContext }) {
  return hashValue(buildFingerprintPayload(publicPlan, planContext));
}

export function verifyRouteFingerprint({ publicPlan, planContext }) {
  return createRouteFingerprint({ publicPlan, planContext }) === planContext.fingerprint;
}

function getDominantRegionKey(previousPublicPlan) {
  const counts = new Map();

  previousPublicPlan.days.forEach((day) => {
    counts.set(day.region_key, (counts.get(day.region_key) || 0) + day.items.length + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0], 'zh-CN');
    })[0]?.[0] || previousPublicPlan.days[0]?.region_key || 'zhanggong';
}

function applyActionToConstraintsSnapshot(previousSnapshot, previousPublicPlan, action) {
  const nextSnapshot = sortObjectKeys({
    ...previousSnapshot,
    time_budget: {
      days: previousSnapshot.time_budget.days
    },
    theme_preferences: [...previousSnapshot.theme_preferences],
    companions: [...previousSnapshot.companions],
    hard_avoidances: [...previousSnapshot.hard_avoidances],
    physical_constraints: [...previousSnapshot.physical_constraints]
  });

  switch (action.type) {
    case 'compress_to_one_day':
      nextSnapshot.time_budget.days = 1;
      break;
    case 'expand_to_two_days':
      nextSnapshot.time_budget.days = 2;
      break;
    case 'focus_same_region':
      nextSnapshot.same_region_only = true;
      nextSnapshot.focused_region_key = action.payload?.target_region_key || getDominantRegionKey(previousPublicPlan);
      break;
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

  return nextSnapshot;
}

export function buildMockGeneratedRoutePlan({ constraintsSnapshot }) {
  const publicPlan = buildPublicRoutePlan(constraintsSnapshot, PLANNING_STATUS.GENERATED);
  const planContext = createPlanContext({
    version: 1,
    parentFingerprint: null,
    constraintsSnapshot,
    lastAction: null,
    lastActionResult: null
  });

  planContext.fingerprint = createRouteFingerprint({
    publicPlan,
    planContext
  });

  return {
    ...publicPlan,
    plan_context: planContext
  };
}

export function buildMockRevisedRoutePlan({ previousPublicPlan, previousPlanContext, action }) {
  const nextSnapshot = applyActionToConstraintsSnapshot(
    previousPlanContext.constraints_snapshot,
    previousPublicPlan,
    action
  );

  const publicPlan = buildPublicRoutePlan(nextSnapshot, PLANNING_STATUS.REVISED);
  const planContext = createPlanContext({
    version: previousPlanContext.version + 1,
    parentFingerprint: previousPlanContext.fingerprint,
    constraintsSnapshot: nextSnapshot,
    lastAction: action,
    lastActionResult: {
      status: 'applied',
      reason_code: null,
      message: '',
      diagnostics: []
    }
  });

  planContext.fingerprint = createRouteFingerprint({
    publicPlan,
    planContext
  });

  return {
    ...publicPlan,
    plan_context: planContext
  };
}

export const ROUTE_PLANNER_MOCK_PRIVATE = {
  ACTION_LABELS,
  buildFingerprintPayload,
  buildPublicRoutePlan,
  applyActionToConstraintsSnapshot
};
```

