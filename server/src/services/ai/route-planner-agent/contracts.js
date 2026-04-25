// @ts-check

export const ROUTE_PLANNER_TASK_TYPE = /** @type {const} */ ('plan_route');
export const ROUTE_PLANNER_SOURCE = /** @type {const} */ ('route_planner_pr_b');
export const PUBLIC_BASIS_ITEM_LIMIT = 20;
export const ROUTE_NARRATIVE_TIMEOUT_ENV = 'ROUTE_NARRATIVE_LLM_TIMEOUT';
export const ROUTE_NARRATIVE_DEFAULT_TIMEOUT_MS = 5000;
export const ROUTE_NARRATIVE_MIN_TIMEOUT_MS = 1000;
export const ROUTE_NARRATIVE_MAX_TIMEOUT_MS = 15000;
export const MAX_ITEM_TITLES_PER_DAY = 4;
export const MAX_NARRATIVE_INPUT_BUDGET = 12000;

export const CANDIDATE_STATUS = /** @type {const} */ ({
  READY: 'ready',
  LIMITED: 'limited',
  EMPTY: 'empty'
});

export const PLANNING_STATUS = /** @type {const} */ ({
  GENERATED: 'generated',
  REVISED: 'revised',
  FAILED: 'failed'
});

export const LAST_ACTION_RESULT_STATUS = /** @type {const} */ ({
  APPLIED: 'applied',
  REJECTED: 'rejected'
});

export const LAST_ACTION_REJECTION_REASONS = /** @type {const} */ ({
  AMBIGUOUS_TARGET_REGION: 'ambiguous_target_region',
  INVALID_TARGET_REGION: 'invalid_target_region',
  NO_LEGAL_REPLACEMENT: 'no_legal_replacement',
  INSUFFICIENT_CANDIDATES: 'insufficient_candidates'
});

export const NARRATIVE_PROVIDER = /** @type {const} */ ({
  LLM: 'llm',
  FALLBACK: 'fallback'
});

export const NARRATIVE_FALLBACK_REASONS = /** @type {const} */ ({
  SHORT_CIRCUIT_EMPTY: 'short_circuit_empty',
  SHORT_CIRCUIT_REJECTED: 'short_circuit_rejected',
  SHORT_CIRCUIT_FAILED_PLAN: 'short_circuit_failed_plan',
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
  compress_to_one_day: '压缩为一天',
  expand_to_two_days: '扩展为两天',
  focus_same_region: '聚焦同一区域',
  relax_pace: '放慢节奏',
  replace_far_spots: '替换跨区点位',
  family_friendly_only: '仅保留亲子友好点位'
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
  'warnings',
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
export const ROUTE_WARNING_FIELDS = ['code', 'severity', 'field', 'conflicting_keys'];
export const ROUTE_WARNING_SEVERITIES = /** @type {const} */ (['info', 'warning', 'error']);
export const ROUTE_WARNING_CODES = /** @type {const} */ ({
  LOCKED_TARGET_NOT_FOUND: 'locked_target_not_found',
  LOCKED_TARGET_UNAVAILABLE: 'locked_target_unavailable',
  LOCKED_TARGETS_EXCEED_TIME_BUDGET: 'locked_targets_exceed_time_budget',
  LOCKED_TARGETS_EXCEED_DAY_CAPACITY: 'locked_targets_exceed_day_capacity',
  LOCKED_TARGETS_CONFLICT_WITH_PHYSICAL_CONSTRAINTS: 'locked_targets_conflict_with_physical_constraints',
  LOCKED_TARGETS_CONFLICT_WITH_PACE: 'locked_targets_conflict_with_pace',
  LOCKED_TARGETS_REGION_SPAN_CONFLICT: 'locked_targets_region_span_conflict',
  LOCKED_TARGETS_CROSS_REGION_UNSUPPORTED: 'locked_targets_cross_region_unsupported',
  MAP_PROVIDER_DISABLED: 'map_provider_disabled',
  MAP_DISTANCE_UNAVAILABLE: 'map_distance_unavailable',
  ROUTE_SPAN_UNRESOLVED: 'route_span_unresolved'
});
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
export const NARRATIVE_FIELDS = ['overview', 'day_summaries', 'adjustment_hint', 'constraint_note'];
export const NARRATIVE_DAY_SUMMARY_FIELDS = ['day_index', 'text'];
export const NARRATIVE_BASIS_SIGNAL_FIELDS = ['basis_source', 'basis_item_count', 'matched_by_summary'];

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
  'locked_targets',
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
  'warnings',
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
  NARRATIVE_FINGERPRINT_MISMATCH: 'route_planner_narrative_fingerprint_mismatch',
  INVALID_NARRATIVE_PAYLOAD: 'route_planner_invalid_narrative_payload',
  INVALID_NARRATIVE_OUTPUT: 'route_planner_invalid_narrative_output',
  NARRATIVE_CLIENT_ABORTED: 'route_planner_narrative_client_aborted',
  CANNOT_REVISE_FAILED_PLAN: 'cannot_revise_failed_plan',
  INVALID_ACTION_TYPE: 'route_planner_invalid_action_type',
  INVALID_ACTION_PAYLOAD: 'route_planner_invalid_action_payload',
  CONTRACT_VIOLATION: 'route_planner_contract_violation'
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
    locked_targets: [],
    family_friendly_only: false,
    same_region_only: false,
    focused_region_key: null,
    avoid_far_spots: false
  };
}

/**
 * @param {{
 *   code: typeof ROUTE_WARNING_CODES[keyof typeof ROUTE_WARNING_CODES],
 *   severity?: typeof ROUTE_WARNING_SEVERITIES[number],
 *   field?: string | null,
 *   conflictingKeys?: string[]
 * }} input
 * @returns {import('./types.js').RouteWarning}
 */
export function createRouteWarning({
  code,
  severity = 'warning',
  field = 'routerResult.constraints.locked_targets',
  conflictingKeys = []
}) {
  return {
    code,
    severity,
    field,
    conflicting_keys: Array.from(new Set(conflictingKeys.map((key) => String(key ?? '').trim()).filter(Boolean)))
  };
}
