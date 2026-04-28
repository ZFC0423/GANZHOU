import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeTripContext } from '../src/services/ai/trip-context-manager/index.js';

test('empty input returns stable session context', () => {
  const result = mergeTripContext({});

  assert.equal(result.context_version, 1);
  assert.equal(result.update_status, 'unchanged');
  assert.deepStrictEqual(result.session_context.trip_constraints, {
    time_budget: null,
    travel_mode: null,
    companions: [],
    hard_avoidances: [],
    physical_constraints: [],
    pace_preference: null,
    route_origin: null,
    destination_scope: null,
    theme_preferences: []
  });
  assert.deepStrictEqual(result.selected_options, undefined);
  assert.equal(Object.hasOwn(result, 'profile_delta'), false);
  assert.equal(Object.hasOwn(result, 'long_term_profile'), false);
  assert.equal(Object.hasOwn(result, 'user_profile'), false);
});

test('missing and null delta fields inherit previous values', () => {
  const result = mergeTripContext({
    previous_session_context: {
      trip_constraints: {
        travel_mode: 'self_drive',
        pace_preference: 'compact',
        companions: ['elders']
      }
    },
    delta_constraints: {
      pace_preference: null
    }
  });

  assert.equal(result.session_context.trip_constraints.travel_mode, 'self_drive');
  assert.equal(result.session_context.trip_constraints.pace_preference, 'compact');
  assert.deepStrictEqual(result.session_context.trip_constraints.companions, ['elders']);
});

test('clear_fields clears array and scalar even when delta is null', () => {
  const result = mergeTripContext({
    previous_session_context: {
      trip_constraints: {
        companions: ['elders'],
        pace_preference: 'compact'
      }
    },
    delta_constraints: {
      companions: null,
      pace_preference: null
    },
    clear_fields: ['companions', 'pace_preference']
  });

  assert.deepStrictEqual(result.session_context.trip_constraints.companions, []);
  assert.equal(result.session_context.trip_constraints.pace_preference, null);
  assert.ok(result.cleared_fields.includes('companions'));
  assert.ok(result.cleared_fields.includes('pace_preference'));
});

test('clear_fields clears whole time_budget object', () => {
  const result = mergeTripContext({
    previous_session_context: {
      trip_constraints: {
        time_budget: { days: 3, date_text: '三天' }
      }
    },
    clear_fields: ['time_budget']
  });

  assert.equal(result.session_context.trip_constraints.time_budget, null);
  assert.deepStrictEqual(result.cleared_fields, ['time_budget']);
});

test('invalid clear_fields are ignored with warning', () => {
  const result = mergeTripContext({
    clear_fields: ['internal_user_id']
  });

  assert.ok(result.warnings.some((warning) => warning.code === 'invalid_clear_field' && warning.field === 'internal_user_id'));
});

test('constraint arrays replace instead of append and [] clears arrays', () => {
  const replaced = mergeTripContext({
    previous_session_context: {
      trip_constraints: {
        theme_preferences: ['food', 'photography']
      }
    },
    delta_constraints: {
      theme_preferences: ['red_culture', 'red_culture']
    }
  });

  assert.deepStrictEqual(replaced.session_context.trip_constraints.theme_preferences, ['red_culture']);

  const cleared = mergeTripContext({
    previous_session_context: {
      trip_constraints: {
        theme_preferences: ['food']
      }
    },
    delta_constraints: {
      theme_preferences: []
    }
  });

  assert.deepStrictEqual(cleared.session_context.trip_constraints.theme_preferences, []);
});

test('substantive delta wins over clear_fields for same field', () => {
  const result = mergeTripContext({
    previous_session_context: {
      trip_constraints: {
        destination_scope: 'zhanggong',
        pace_preference: 'relaxed',
        companions: ['elders']
      }
    },
    delta_constraints: {
      destination_scope: 'nankang',
      pace_preference: 'compact',
      companions: ['friends']
    },
    clear_fields: ['destination_scope', 'pace_preference', 'companions']
  });

  assert.equal(result.session_context.trip_constraints.destination_scope, 'nankang');
  assert.equal(result.session_context.trip_constraints.pace_preference, 'compact');
  assert.deepStrictEqual(result.session_context.trip_constraints.companions, ['friends']);
  assert.ok(result.warnings.some((warning) => warning.code === 'clear_field_conflicts_with_delta'));
});

test('empty array delta with clear_fields remains a clear operation', () => {
  const result = mergeTripContext({
    previous_session_context: {
      trip_constraints: {
        companions: ['elders']
      }
    },
    delta_constraints: {
      companions: []
    },
    clear_fields: ['companions']
  });

  assert.deepStrictEqual(result.session_context.trip_constraints.companions, []);
  assert.ok(result.cleared_fields.includes('companions'));
});

test('time_budget shallow merge and path clear rules', () => {
  const clearDate = mergeTripContext({
    previous_session_context: {
      trip_constraints: {
        time_budget: { days: 3, date_text: '三天' }
      }
    },
    clear_fields: ['time_budget.date_text']
  });
  assert.deepStrictEqual(clearDate.session_context.trip_constraints.time_budget, { days: 3 });

  const clearDays = mergeTripContext({
    previous_session_context: {
      trip_constraints: {
        time_budget: { days: 3 }
      }
    },
    clear_fields: ['time_budget.days']
  });
  assert.equal(clearDays.session_context.trip_constraints.time_budget, null);

  const mergeDays = mergeTripContext({
    previous_session_context: {
      trip_constraints: {
        time_budget: { days: 3, date_text: 'old' }
      }
    },
    delta_constraints: {
      time_budget: { days: 2 }
    }
  });
  assert.deepStrictEqual(mergeDays.session_context.trip_constraints.time_budget, { days: 2, date_text: 'old' });
});

test('invalid time_budget values and paths warn without polluting context', () => {
  const result = mergeTripContext({
    previous_session_context: {
      trip_constraints: {
        time_budget: { days: 3 }
      }
    },
    delta_constraints: {
      time_budget: {
        days: 0,
        specific_dates: { start: 'x' }
      },
      scenic_hints: ['x'],
      fit_score: 99
    },
    clear_fields: ['time_budget.specific_dates.start']
  });

  assert.deepStrictEqual(result.session_context.trip_constraints.time_budget, { days: 3 });
  assert.ok(result.warnings.some((warning) => warning.code === 'invalid_clear_field'));
  assert.ok(result.warnings.some((warning) => warning.code === 'invalid_constraint_field' && warning.field === 'scenic_hints'));
  assert.ok(result.warnings.some((warning) => warning.code === 'invalid_constraint_field' && warning.field === 'fit_score'));
});

test('time_budget path clear loses to substantive delta for same path', () => {
  const result = mergeTripContext({
    previous_session_context: {
      trip_constraints: {
        time_budget: { days: 3, date_text: 'old' }
      }
    },
    delta_constraints: {
      time_budget: { days: 2 }
    },
    clear_fields: ['time_budget.days']
  });

  assert.deepStrictEqual(result.session_context.trip_constraints.time_budget, { days: 2, date_text: 'old' });
  assert.ok(result.warnings.some((warning) => warning.code === 'clear_field_conflicts_with_delta' && warning.field === 'time_budget.days'));
});

test('selected and rejected options append dedupe and only clear via event flags', () => {
  const result = mergeTripContext({
    previous_session_context: {
      selected_options: ['scenic:1'],
      rejected_options: ['scenic:2']
    },
    structured_events: {
      selected_options: ['scenic:1', 'scenic:3'],
      rejected_options: ['scenic:2', 'scenic:4']
    }
  });

  assert.deepStrictEqual(result.session_context.selected_options, ['scenic:1', 'scenic:3']);
  assert.deepStrictEqual(result.session_context.rejected_options, ['scenic:2', 'scenic:4']);

  const unchanged = mergeTripContext({
    previous_session_context: {
      selected_options: ['scenic:1'],
      rejected_options: ['scenic:2']
    },
    structured_events: {
      selected_options: [],
      rejected_options: []
    }
  });

  assert.deepStrictEqual(unchanged.session_context.selected_options, ['scenic:1']);
  assert.deepStrictEqual(unchanged.session_context.rejected_options, ['scenic:2']);
});

test('selected and rejected options support single item undo', () => {
  const result = mergeTripContext({
    previous_session_context: {
      selected_options: ['scenic:1', 'scenic:2'],
      rejected_options: ['scenic:1', 'scenic:2']
    },
    structured_events: {
      unselected_options: ['scenic:1'],
      unrejected_options: ['scenic:1'],
      rejected_options: ['scenic:3']
    }
  });

  assert.deepStrictEqual(result.session_context.selected_options, ['scenic:2']);
  assert.deepStrictEqual(result.session_context.rejected_options, ['scenic:2', 'scenic:3']);
});

test('clear event flags clear first then append this turn additions', () => {
  const result = mergeTripContext({
    previous_session_context: {
      rejected_options: ['scenic:1', 'scenic:2']
    },
    structured_events: {
      clear_rejected_options: true,
      rejected_options: ['scenic:3']
    }
  });

  assert.deepStrictEqual(result.session_context.rejected_options, ['scenic:3']);
});

test('invalid option keys warn and same remove/add keeps the option', () => {
  const result = mergeTripContext({
    previous_session_context: {
      rejected_options: ['scenic:1']
    },
    structured_events: {
      unselected_options: ['article:1'],
      unrejected_options: ['scenic:1'],
      rejected_options: ['scenic:1']
    }
  });

  assert.deepStrictEqual(result.session_context.rejected_options, ['scenic:1']);
  assert.ok(result.warnings.some((warning) => warning.code === 'invalid_option_key' && warning.field === 'unselected_options'));
  assert.ok(result.warnings.some((warning) => warning.code === 'event_remove_and_add_same_option'));
});

test('locked_targets replace and are not inferred from selected options', () => {
  const result = mergeTripContext({
    previous_session_context: {
      locked_targets: ['scenic:1']
    },
    structured_events: {
      selected_options: ['scenic:2'],
      locked_targets: ['scenic:3', 'bad']
    }
  });

  assert.deepStrictEqual(result.session_context.selected_options, ['scenic:2']);
  assert.deepStrictEqual(result.session_context.locked_targets, ['scenic:3']);
  assert.ok(result.warnings.some((warning) => warning.code === 'invalid_option_key' && warning.field === 'locked_targets'));
});
