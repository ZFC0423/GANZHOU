export const TRIP_CONTEXT_VERSION = 1;

export const TRIP_CONSTRAINT_FIELDS = [
  'time_budget',
  'travel_mode',
  'companions',
  'hard_avoidances',
  'physical_constraints',
  'pace_preference',
  'route_origin',
  'destination_scope',
  'theme_preferences'
];

export const ARRAY_CONSTRAINT_FIELDS = [
  'companions',
  'hard_avoidances',
  'physical_constraints',
  'theme_preferences'
];

export const SCALAR_CONSTRAINT_FIELDS = [
  'travel_mode',
  'pace_preference',
  'route_origin',
  'destination_scope'
];

export const TIME_BUDGET_FIELDS = ['days', 'date_text'];
export const TIME_BUDGET_CLEAR_FIELDS = ['time_budget.days', 'time_budget.date_text'];

export const ALLOWED_CLEAR_FIELDS = [
  'time_budget',
  ...TIME_BUDGET_CLEAR_FIELDS,
  'travel_mode',
  'companions',
  'hard_avoidances',
  'physical_constraints',
  'pace_preference',
  'route_origin',
  'destination_scope',
  'theme_preferences'
];

export const FORBIDDEN_DELTA_FIELDS = [
  'scenic_hints',
  'ranked_options',
  'comparison',
  'fit_score',
  'fit_reasons',
  'caution_reasons',
  'locked_targets',
  'selected_options',
  'rejected_options',
  'user_query'
];

export const TRAVEL_MODES = ['public_transport', 'self_drive', 'mixed'];
export const PACE_PREFERENCES = ['relaxed', 'normal', 'compact'];
export const OPTION_KEY_PATTERN = /^scenic:\d+$/;

export const WARNING_CODES = {
  INVALID_CLEAR_FIELD: 'invalid_clear_field',
  CLEAR_FIELD_CONFLICTS_WITH_DELTA: 'clear_field_conflicts_with_delta',
  INVALID_CONSTRAINT_FIELD: 'invalid_constraint_field',
  INVALID_CONSTRAINT_VALUE: 'invalid_constraint_value',
  INVALID_OPTION_KEY: 'invalid_option_key',
  EVENT_REMOVE_AND_ADD_SAME_OPTION: 'event_remove_and_add_same_option'
};

// P0 keeps time_budget as a shallow, flat object. If Route Planner later starts
// consuming date ranges or flexibility flags, design explicit internal
// time_budget precedence and derivation rules before adding those fields here.
export function createDefaultTripConstraints() {
  return {
    time_budget: null,
    travel_mode: null,
    companions: [],
    hard_avoidances: [],
    physical_constraints: [],
    pace_preference: null,
    route_origin: null,
    destination_scope: null,
    theme_preferences: []
  };
}

export function createDefaultSessionContext() {
  return {
    trip_constraints: createDefaultTripConstraints(),
    selected_options: [],
    rejected_options: [],
    locked_targets: [],
    last_task_type: null,
    last_agent: null,
    last_result_status: null
  };
}

export function createWarning({ code, field = null, option_key = null }) {
  return {
    code,
    field,
    option_key
  };
}
