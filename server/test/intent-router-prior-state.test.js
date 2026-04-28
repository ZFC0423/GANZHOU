import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPriorStateFromSessionContext,
  isEffectivePriorState,
  resolveDiscoveryQueryPriorState
} from '../src/services/ai/intent-router/prior-state.js';

test('isEffectivePriorState requires task_type and non-empty constraints', () => {
  assert.equal(isEffectivePriorState({}), false);
  assert.equal(isEffectivePriorState({ constraints: {} }), false);
  assert.equal(isEffectivePriorState({ task_type: 'discover_options' }), false);
  assert.equal(isEffectivePriorState({ task_type: 'discover_options', constraints: {} }), false);
  assert.equal(isEffectivePriorState({ task_type: 'discover_options', constraints: { user_query: 'previous' } }), false);
  assert.equal(isEffectivePriorState(null), false);
  assert.equal(isEffectivePriorState('bad'), false);
  assert.equal(isEffectivePriorState([]), false);
  assert.equal(isEffectivePriorState({
    task_type: 'discover_options',
    constraints: {
      pace_preference: 'relaxed'
    }
  }), true);
});

test('buildPriorStateFromSessionContext creates lightweight discovery priorState from trip constraints', () => {
  const priorState = buildPriorStateFromSessionContext({
    trip_constraints: {
      time_budget: {
        days: 2,
        date_text: '周末',
        nested: {
          start: 'bad'
        }
      },
      companions: ['elders', 'elders'],
      pace_preference: 'relaxed',
      destination_scope: '赣州',
      selected_options: ['scenic:1']
    },
    selected_options: ['scenic:2'],
    rejected_options: ['scenic:3'],
    locked_targets: ['scenic:4']
  });

  assert.deepEqual(priorState, {
    task_type: 'discover_options',
    task_confidence: 0.9,
    constraints: {
      time_budget: {
        days: 2,
        date_text: '周末'
      },
      companions: ['elders'],
      pace_preference: 'relaxed',
      destination_scope: '赣州'
    }
  });
  assert.equal(Object.hasOwn(priorState.constraints, 'selected_options'), false);
  assert.equal(Object.hasOwn(priorState.constraints, 'locked_targets'), false);
});

test('buildPriorStateFromSessionContext returns null for malformed or empty sessions', () => {
  assert.equal(buildPriorStateFromSessionContext(null), null);
  assert.equal(buildPriorStateFromSessionContext('bad'), null);
  assert.equal(buildPriorStateFromSessionContext({}), null);
  assert.equal(buildPriorStateFromSessionContext({ trip_constraints: {} }), null);
  assert.equal(buildPriorStateFromSessionContext({
    trip_constraints: {
      companions: [],
      pace_preference: '',
      time_budget: {
        date_text: ''
      }
    }
  }), null);
});

test('resolveDiscoveryQueryPriorState falls back from ineffective explicit priorState to session context', () => {
  const sessionContext = {
    trip_constraints: {
      pace_preference: 'compact'
    }
  };

  assert.deepEqual(resolveDiscoveryQueryPriorState({
    explicitPriorState: {},
    previousSessionContext: sessionContext
  }), {
    task_type: 'discover_options',
    task_confidence: 0.9,
    constraints: {
      pace_preference: 'compact'
    }
  });
});

test('resolveDiscoveryQueryPriorState prefers effective explicit priorState', () => {
  const explicitPriorState = {
    task_type: 'plan_route',
    task_confidence: 0.8,
    constraints: {
      travel_mode: 'public_transport'
    }
  };

  assert.equal(resolveDiscoveryQueryPriorState({
    explicitPriorState,
    previousSessionContext: {
      trip_constraints: {
        pace_preference: 'compact'
      }
    }
  }), explicitPriorState);
});
