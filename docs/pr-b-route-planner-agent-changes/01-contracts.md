# server/src/services/ai/route-planner-agent/contracts.js

```js
// @ts-check

export const ROUTE_PLANNER_TASK_TYPE = /** @type {const} */ ('plan_route');
export const ROUTE_PLANNER_SOURCE = /** @type {const} */ ('route_planner_pr_b');
export const PUBLIC_BASIS_ITEM_LIMIT = 20;

export const CANDIDATE_STATUS = /** @type {const} */ ({
  READY: 'ready',
  LIMITED: 'limited',
  EMPTY: 'empty'
});

export const PLANNING_STATUS = /** @type {const} */ ({
  GENERATED: 'generated',
  REVISED: 'revised'
});

export const LAST_ACTION_RESULT_STATUS = /** @type {const} */ ({
  APPLIED: 'applied',
  REJECTED: 'rejected'
});

export const LAST_ACTION_REJECTION_REASONS = /** @type {const} */ ({
  AMBIGUOUS_TARGET_REGION: 'ambiguous_target_region',
  NO_LEGAL_REPLACEMENT: 'no_legal_replacement',
  INSUFFICIENT_CANDIDATES: 'insufficient_candidates'
});

export const TRAVEL_MODES = /** @type {const} */ (['public_transport', 'self_drive', 'mixed']);
export const PACE_PREFERENCES = /** @type {const} */ (['relaxed', 'normal', 'compact']);

export const ACTION_TYPES = /** @type {const} */ ([
  'compress_to_one_day',
  'expand_to_two_days',
  'focus_same_region',
  'relax_pace',
  'replace_far_spots',
  'family_friendly_only'
]);

/** @typedef {typeof ACTION_TYPES[number]} ActionType */
/** @typedef {{ mode: 'empty_object' } | { mode: 'focus_same_region' }} ActionPayloadRule */

/** @type {Record<ActionType, string>} */
export const ACTION_LABELS = {
  compress_to_one_day: '鍘嬬缉涓轰竴澶?,
  expand_to_two_days: '鎵╁睍涓轰袱澶?,
  focus_same_region: '鑱氱劍鍚屼竴鍖哄煙',
  relax_pace: '鏀炬參鑺傚',
  replace_far_spots: '鏇挎崲璺ㄥ尯鐐逛綅',
  family_friendly_only: '浠呬繚鐣欎翰瀛愬弸濂界偣浣?
};

export const ACTION_PAYLOAD_RULES = Object.freeze(
  ACTION_TYPES.reduce(
    /**
     * @param {Record<ActionType, ActionPayloadRule>} rules
     * @param {ActionType} type
     */
    (rules, type) => {
      rules[type] = { mode: type === 'focus_same_region' ? 'focus_same_region' : 'empty_object' };
      return rules;
    },
    /** @type {Record<ActionType, ActionPayloadRule>} */ ({})
  )
);

export const PUBLIC_PLAN_TOP_LEVEL_FIELDS = [
  'task_type',
  'candidate_status',
  'planning_status',
  'route_positioning',
  'summary',
  'days',
  'route_highlights',
  'adjustment_options',
  'basis',
  'plan_context'
];

export const REVISION_PUBLIC_PLAN_FIELDS = PUBLIC_PLAN_TOP_LEVEL_FIELDS.filter((field) => field !== 'plan_context');

export const ROUTE_POSITIONING_FIELDS = ['duration_days', 'travel_mode', 'pace_preference', 'theme_preferences'];
export const SUMMARY_FIELDS = ['total_days', 'total_items'];
export const DAY_FIELDS = ['day_index', 'region_key', 'items'];
export const ITEM_FIELDS = ['item_key', 'title', 'region_key', 'family_friendly'];
export const ADJUSTMENT_OPTION_FIELDS = ['type', 'label'];
export const BASIS_FIELDS = ['source', 'items'];
export const PUBLIC_BASIS_ITEM_FIELDS = ['item_key', 'source_type', 'title', 'region_key', 'matched_by', 'score_rank'];
export const PLAN_CONTEXT_FIELDS = [
  'version',
  'fingerprint',
  'parent_fingerprint',
  'source',
  'constraints_snapshot',
  'last_action',
  'last_action_result'
];
export const LAST_ACTION_RESULT_FIELDS = ['status', 'reason_code', 'message', 'diagnostics'];

export const CONSTRAINT_SNAPSHOT_FIELDS = [
  'time_budget',
  'travel_mode',
  'pace_preference',
  'theme_preferences',
  'companions',
  'hard_avoidances',
  'physical_constraints',
  'route_origin',
  'destination_scope',
  'family_friendly_only',
  'same_region_only',
  'focused_region_key',
  'avoid_far_spots'
];

export const FINGERPRINT_PUBLIC_PLAN_FIELDS = [
  'task_type',
  'candidate_status',
  'planning_status',
  'route_positioning',
  'summary',
  'days',
  'route_highlights',
  'adjustment_options',
  'basis'
];

export const FINGERPRINT_PLAN_CONTEXT_FIELDS = [
  'version',
  'parent_fingerprint',
  'source',
  'constraints_snapshot',
  'last_action',
  'last_action_result'
];

export const ERROR_CODES = {
  INVALID_GENERATE_PAYLOAD: 'route_planner_invalid_generate_payload',
  INVALID_REVISE_PAYLOAD: 'route_planner_invalid_revise_payload',
  INVALID_ROUTER_RESULT: 'route_planner_invalid_router_result',
  INVALID_PREVIOUS_PUBLIC_PLAN: 'route_planner_invalid_previous_public_plan',
  INVALID_PREVIOUS_PLAN_CONTEXT: 'route_planner_invalid_previous_plan_context',
  PREVIOUS_FINGERPRINT_MISMATCH: 'route_planner_previous_fingerprint_mismatch',
  INVALID_ACTION_TYPE: 'route_planner_invalid_action_type',
  INVALID_ACTION_PAYLOAD: 'route_planner_invalid_action_payload',
  CONTRACT_VIOLATION: 'route_planner_contract_violation'
};

export const REGION_ALIASES = Object.freeze({
  zhanggong: 'zhanggong',
  '绔犺础': 'zhanggong',
  '绔犺础鍖?: 'zhanggong',
  anyuan: 'anyuan',
  '瀹夎繙': 'anyuan',
  '瀹夎繙鍘?: 'anyuan',
  dayu: 'dayu',
  '澶т綑': 'dayu',
  '澶т綑鍘?: 'dayu',
  ganxian: 'ganxian',
  '璧ｅ幙': 'ganxian',
  '璧ｅ幙鍖?: 'ganxian',
  ruijin: 'ruijin',
  '鐟為噾': 'ruijin',
  '鐟為噾甯?: 'ruijin',
  ganzhou: 'ganzhou',
  '璧ｅ窞': 'ganzhou'
});

/**
 * @returns {Array<{ type: ActionType, label: string }>}
 */
export function createAdjustmentOptions() {
  return ACTION_TYPES.map((type) => ({
    type,
    label: ACTION_LABELS[type]
  }));
}

export function createEmptyConstraintsSnapshot() {
  return {
    time_budget: {
      days: null
    },
    travel_mode: null,
    pace_preference: null,
    theme_preferences: [],
    companions: [],
    hard_avoidances: [],
    physical_constraints: [],
    route_origin: null,
    destination_scope: null,
    family_friendly_only: false,
    same_region_only: false,
    focused_region_key: null,
    avoid_far_spots: false
  };
}
```

