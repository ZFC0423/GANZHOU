import test from 'node:test';
import assert from 'node:assert/strict';

import { INTENT_CONTRACT } from '../src/services/ai/intent-router/contracts.js';
import { createIntentRouter } from '../src/services/ai/intent-router/index.js';

function createTimeoutError() {
  const error = new Error('timeout');
  error.code = 'timeout';
  return error;
}

function createRouterWithRawIntent(rawIntent) {
  return createIntentRouter({
    llmExtract: async () => rawIntent
  });
}

test('top-level normalization snapshot: plan_route missing-value encoding is stable', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'plan_route',
      task_confidence: 0.91,
      constraints: {
        user_query: '周末两天，公共交通，节奏适中',
        time_budget: { days: 2, date_text: '周末' },
        travel_mode: 'public_transport',
        pace_preference: 'normal'
      },
      clarification_reason: null
    })
  });

  const result = await routeIntent({
    input: '周末两天，公共交通，节奏适中',
    priorState: null
  });

  assert.deepStrictEqual(result, {
    task_type: 'plan_route',
    task_confidence: 0.91,
    constraints: {
      user_query: '周末两天，公共交通，节奏适中',
      time_budget: { days: 2, date_text: '周末' },
      money_budget: null,
      travel_mode: 'public_transport',
      companions: null,
      pace_preference: 'normal',
      theme_preferences: null,
      hard_avoidances: null,
      physical_constraints: null,
      status_flags: null,
      route_origin: null,
      destination_scope: null
    },
    clear_fields: [],
    clarification_needed: false,
    clarification_reason: null,
    missing_required_fields: [],
    clarification_questions: [],
    next_agent: 'ai_trip',
    _meta: {
      decision_source: 'llm',
      prior_state_usage: 'none',
      fallback_reason: null,
      missing_required_fields: [],
      rule_hits: ['llm_result_received'],
      conflict_codes: [],
      fallback_resolution: null,
      model_name: null,
      token_usage: 0
    }
  });
});

test('top-level normalization snapshot: null task keeps all protocol fields and unknowns as null', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: null,
      task_confidence: 0.23,
      constraints: {
        user_query: '推荐一个吧'
      },
      clarification_reason: 'intent_ambiguous'
    })
  });

  const result = await routeIntent({
    input: '推荐一个吧',
    priorState: null
  });

  assert.deepStrictEqual(result, {
    task_type: null,
    task_confidence: 0.23,
    constraints: {
      user_query: '推荐一个吧',
      time_budget: null,
      money_budget: null,
      travel_mode: null,
      companions: null,
      pace_preference: null,
      theme_preferences: null,
      hard_avoidances: null,
      physical_constraints: null,
      status_flags: null,
      route_origin: null,
      destination_scope: null,
      subject_entities: null,
      region_hints: null,
      scenic_hints: null,
      mentioned_entities: null,
      exclude_entities: null,
      option_limit: null
    },
    clear_fields: [],
    clarification_needed: true,
    clarification_reason: 'intent_ambiguous',
    missing_required_fields: [],
    clarification_questions: [
      '你这一步更想先听讲解，还是直接让我帮你排路线？',
      '如果你想做路线，我会继续按几天、交通方式和节奏把信息补齐。'
    ],
    next_agent: 'safe_clarify',
    _meta: {
      decision_source: 'llm',
      prior_state_usage: 'none',
      fallback_reason: null,
      missing_required_fields: [],
      rule_hits: ['llm_result_received'],
      conflict_codes: [],
      fallback_resolution: null,
      model_name: null,
      token_usage: 0
    }
  });
});

test('array runtime semantics: null means unknown_or_not_provided', async () => {
  assert.equal(
    INTENT_CONTRACT.MISSING_VALUE_ENCODING.array_runtime_semantics.null,
    'unknown_or_not_provided'
  );

  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'plan_route',
      task_confidence: 0.9,
      constraints: {
        user_query: '周末两天，公共交通，节奏适中',
        time_budget: { days: 2, date_text: '周末' },
        travel_mode: 'public_transport',
        pace_preference: 'normal',
        theme_preferences: null
      },
      clarification_reason: null
    })
  });

  const result = await routeIntent({
    input: '周末两天，公共交通，节奏适中',
    priorState: null
  });

  assert.strictEqual(
    result.constraints.theme_preferences,
    INTENT_CONTRACT.MISSING_VALUE_ENCODING.list_unknown
  );
});

test('array runtime semantics: [] means explicit_empty and must not be overwritten by prior merge', async () => {
  assert.deepStrictEqual(
    INTENT_CONTRACT.MISSING_VALUE_ENCODING.list_explicit_empty,
    []
  );
  assert.equal(
    INTENT_CONTRACT.MISSING_VALUE_ENCODING.array_runtime_semantics.empty_array,
    'explicit_empty'
  );

  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'plan_route',
      task_confidence: 0.94,
      constraints: {
        user_query: '还是两天，公共交通，节奏适中，这次主题都可以',
        time_budget: { days: 2, date_text: null },
        travel_mode: 'public_transport',
        pace_preference: 'normal',
        theme_preferences: []
      },
      clarification_reason: null
    })
  });

  const result = await routeIntent({
    input: '还是两天，公共交通，节奏适中，这次主题都可以',
    priorState: {
      task_type: 'plan_route',
      task_confidence: 0.91,
      constraints: {
        theme_preferences: ['food', 'heritage']
      }
    }
  });

  assert.deepStrictEqual(
    result.constraints.theme_preferences,
    INTENT_CONTRACT.MISSING_VALUE_ENCODING.list_explicit_empty
  );
});

test('trace meta keeps decision source and prior state usage orthogonal for llm merge', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'plan_route',
      task_confidence: 0.92,
      constraints: {
        user_query: '还是两天，节奏适中',
        time_budget: { days: 2, date_text: null },
        pace_preference: 'normal'
      },
      clarification_reason: null
    })
  });

  const result = await routeIntent({
    input: '还是两天，节奏适中',
    priorState: {
      task_type: 'plan_route',
      task_confidence: 0.88,
      constraints: {
        travel_mode: 'self_drive',
        theme_preferences: ['natural']
      }
    }
  });

  assert.equal(result._meta.decision_source, 'llm');
  assert.equal(result._meta.prior_state_usage, 'merged');
  assert.ok(result._meta.rule_hits.includes('prior_state_constraints_merged'));
  assert.equal(result.constraints.travel_mode, 'self_drive');
  assert.deepStrictEqual(result.constraints.theme_preferences, ['natural']);
});

test('trace meta keeps decision source and prior state usage orthogonal for fallback hint-only path', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => {
      throw createTimeoutError();
    }
  });

  const result = await routeIntent({
    input: '推荐一个吧',
    priorState: {
      task_type: 'plan_route',
      task_confidence: 0.91,
      constraints: {
        travel_mode: 'self_drive',
        time_budget: { days: 2, date_text: null }
      }
    }
  });

  assert.equal(result._meta.decision_source, 'fallback');
  assert.equal(result._meta.prior_state_usage, 'hint_only');
  assert.ok(result._meta.rule_hits.includes('prior_state_hint_only'));
  assert.equal(result.constraints.travel_mode, null);
  assert.equal(result.constraints.time_budget, null);
});

test('fallback reason is timeout when llm extract throws timeout', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => {
      throw createTimeoutError();
    }
  });

  const result = await routeIntent({
    input: '周末两天，自驾，节奏适中',
    priorState: null
  });

  assert.equal(result._meta.decision_source, 'fallback');
  assert.equal(result._meta.fallback_reason, 'timeout');
});

test('fallback reason is invalid_json when llm extract throws invalid_json', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => {
      const error = new Error('invalid json');
      error.code = 'invalid_json';
      throw error;
    }
  });

  const result = await routeIntent({
    input: '介绍一下赣州为什么适合先从老城看起',
    priorState: null
  });

  assert.equal(result._meta.decision_source, 'fallback');
  assert.equal(result._meta.fallback_reason, 'invalid_json');
});

test('clear_fields defaults and filters unsupported fields', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'plan_route',
      task_confidence: 0.91,
      constraints: {
        user_query: 'plan',
        time_budget: { days: 2, date_text: null },
        travel_mode: 'public_transport',
        pace_preference: 'normal'
      },
      clear_fields: ['pace_preference', 'internal_user_id', 'time_budget.specific_dates.start'],
      clarification_reason: null
    })
  });

  const result = await routeIntent({ input: 'plan' });

  assert.deepStrictEqual(result.clear_fields, []);
  assert.equal(result.constraints.pace_preference, 'normal');
});

test('clear_fields allows explicit clear when constraint is null', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'discover_options',
      task_confidence: 0.91,
      constraints: {
        user_query: 'anything',
        pace_preference: null
      },
      clear_fields: ['pace_preference'],
      clarification_reason: null
    })
  });

  const result = await routeIntent({ input: 'anything' });

  assert.deepStrictEqual(result.clear_fields, ['pace_preference']);
});

test('clear_fields mutual exclusion keeps substantive scalar and array constraints', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'discover_options',
      task_confidence: 0.91,
      constraints: {
        user_query: 'new scope',
        destination_scope: ['nankang'],
        pace_preference: 'compact',
        companions: ['friends']
      },
      clear_fields: ['destination_scope', 'pace_preference', 'companions'],
      clarification_reason: null
    })
  });

  const result = await routeIntent({ input: 'new scope' });

  assert.deepStrictEqual(result.clear_fields, []);
  assert.deepStrictEqual(result.constraints.destination_scope, ['nankang']);
  assert.equal(result.constraints.pace_preference, 'compact');
  assert.deepStrictEqual(result.constraints.companions, ['friends']);
});

test('clear_fields keeps array clear when constraint is explicit empty array', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'discover_options',
      task_confidence: 0.91,
      constraints: {
        user_query: 'clear companions',
        companions: []
      },
      clear_fields: ['companions'],
      clarification_reason: null
    })
  });

  const result = await routeIntent({ input: 'clear companions' });

  assert.deepStrictEqual(result.clear_fields, ['companions']);
  assert.deepStrictEqual(result.constraints.companions, []);
});

test('time_budget rejects nested and unsupported fields through fallback', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'plan_route',
      task_confidence: 0.94,
      constraints: {
        user_query: 'two day route',
        time_budget: {
          days: 2,
          specific_dates: { start: '2026-05-01', end: '2026-05-02' }
        },
        travel_mode: 'public_transport',
        pace_preference: 'normal'
      },
      clarification_reason: null
    })
  });

  const result = await routeIntent({ input: 'two day route' });

  assert.equal(result._meta.decision_source, 'fallback');
  assert.ok(!result.constraints.time_budget || !Object.hasOwn(result.constraints.time_budget, 'specific_dates'));
});

test('cross-intent prior discard is surfaced as clear_fields', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({
      task_type: 'guide_understand',
      task_confidence: 0.95,
      constraints: {
        user_query: 'explain history'
      },
      clarification_reason: null
    })
  });

  const result = await routeIntent({
    input: 'explain history',
    priorState: {
      task_type: 'plan_route',
      task_confidence: 0.92,
      constraints: {
        companions: ['elders'],
        pace_preference: 'compact'
      }
    }
  });

  assert.ok(result.clear_fields.includes('companions'));
  assert.ok(result.clear_fields.includes('pace_preference'));
});

test('chinese discovery fixtures normalize to decision_discovery without route required fields', async () => {
  const fixtures = [
    {
      input: '我周末想带老人轻松玩赣州',
      constraints: {
        user_query: '我周末想带老人轻松玩赣州',
        companions: ['elders'],
        pace_preference: 'relaxed',
        destination_scope: '赣州',
        time_budget: { date_text: '周末' }
      }
    },
    {
      input: '周末想在赣州轻松玩一天',
      constraints: {
        user_query: '周末想在赣州轻松玩一天',
        pace_preference: 'relaxed',
        destination_scope: '赣州',
        time_budget: { days: 1, date_text: '周末' }
      }
    },
    {
      input: '赣州适合老人玩的地方',
      constraints: {
        user_query: '赣州适合老人玩的地方',
        companions: ['elders'],
        destination_scope: '赣州'
      }
    },
    {
      input: '想找几个不要太累的赣州景点',
      constraints: {
        user_query: '想找几个不要太累的赣州景点',
        pace_preference: 'relaxed',
        destination_scope: '赣州'
      }
    },
    {
      input: '第一次来赣州，有哪些必去但别太赶的地方',
      constraints: {
        user_query: '第一次来赣州，有哪些必去但别太赶的地方',
        pace_preference: 'relaxed',
        destination_scope: '赣州'
      }
    }
  ];

  for (const fixture of fixtures) {
    const routeIntent = createRouterWithRawIntent({
      task_type: 'discover_options',
      task_confidence: 0.88,
      constraints: fixture.constraints,
      clarification_reason: null
    });

    const result = await routeIntent({ input: fixture.input });

    assert.equal(result.task_type, 'discover_options', fixture.input);
    assert.equal(result.next_agent, 'decision_discovery', fixture.input);
    assert.equal(result.clarification_needed, false, fixture.input);
    assert.deepStrictEqual(result.missing_required_fields, [], fixture.input);
  }
});

test('discover_options raw missing slots do not cascade into safe_clarify', async () => {
  const routeIntent = createRouterWithRawIntent({
    task_type: 'discover_options',
    task_confidence: 0.88,
    constraints: {
      user_query: '赣州适合老人玩的地方',
      companions: ['elders'],
      destination_scope: '赣州'
    },
    clarification_needed: true,
    clarification_reason: 'missing_slots',
    missing_required_fields: ['travel_mode', 'route_origin', 'time_budget'],
    next_agent: 'safe_clarify'
  });

  const result = await routeIntent({ input: '赣州适合老人玩的地方' });

  assert.equal(result.task_type, 'discover_options');
  assert.equal(result.next_agent, 'decision_discovery');
  assert.equal(result.clarification_needed, false);
  assert.equal(result.clarification_reason, null);
  assert.deepStrictEqual(result.missing_required_fields, []);
});

test('red culture places query can be discovery or guide but must not safe_clarify for route-field gaps', async () => {
  const discoveryIntent = createRouterWithRawIntent({
    task_type: 'discover_options',
    task_confidence: 0.87,
    constraints: {
      user_query: '赣州有哪些红色文化景点值得看',
      theme_preferences: ['red_culture'],
      destination_scope: '赣州'
    },
    clarification_reason: null
  });
  const guideIntent = createRouterWithRawIntent({
    task_type: 'guide_understand',
    task_confidence: 0.84,
    constraints: {
      user_query: '赣州有哪些红色文化景点值得看',
      theme_preferences: ['red_culture'],
      region_hints: ['赣州']
    },
    clarification_reason: null
  });

  const discoveryResult = await discoveryIntent({ input: '赣州有哪些红色文化景点值得看' });
  const guideResult = await guideIntent({ input: '赣州有哪些红色文化景点值得看' });

  assert.ok(['discover_options', 'guide_understand'].includes(discoveryResult.task_type));
  assert.notEqual(discoveryResult.next_agent, 'safe_clarify');
  assert.equal(discoveryResult.clarification_needed, false);

  assert.ok(['discover_options', 'guide_understand'].includes(guideResult.task_type));
  assert.notEqual(guideResult.next_agent, 'safe_clarify');
  assert.equal(guideResult.clarification_needed, false);
});

test('plan_route still keeps high threshold for missing route-critical fields', async () => {
  const routeIntent = createRouterWithRawIntent({
    task_type: 'plan_route',
    task_confidence: 0.89,
    constraints: {
      user_query: '帮我安排一条赣州路线',
      destination_scope: '赣州'
    },
    clarification_reason: null
  });

  const result = await routeIntent({ input: '帮我安排一条赣州路线' });

  assert.equal(result.task_type, 'plan_route');
  assert.equal(result.next_agent, 'safe_clarify');
  assert.equal(result.clarification_needed, true);
  assert.ok(result.missing_required_fields.includes('time_budget'));
  assert.ok(result.missing_required_fields.includes('travel_mode'));
  assert.ok(result.missing_required_fields.includes('pace_preference'));
});

test('ambiguous chinese prompts remain safe_clarify when mock LLM returns null task', async () => {
  const fixtures = ['帮我选一个', '推荐一下', '哪个好', '安排一下'];

  for (const input of fixtures) {
    const routeIntent = createRouterWithRawIntent({
      task_type: null,
      task_confidence: 0.25,
      constraints: { user_query: input },
      clarification_reason: 'intent_ambiguous'
    });

    const result = await routeIntent({ input });

    assert.equal(result.task_type, null, input);
    assert.equal(result.next_agent, 'safe_clarify', input);
    assert.equal(result.clarification_needed, true, input);
  }
});

test('contextual short-turn with priorState keeps discover_options delta stable', async () => {
  const routeIntent = createRouterWithRawIntent({
    task_type: 'discover_options',
    task_confidence: 0.91,
    constraints: {
      user_query: 'no elders, compact pace',
      companions: null,
      pace_preference: 'compact'
    },
    clear_fields: ['companions'],
    clarification_reason: null
  });

  const result = await routeIntent({
    input: 'no elders, compact pace',
    priorState: {
      task_type: 'discover_options',
      task_confidence: 0.9,
      constraints: {
        companions: ['elders'],
        pace_preference: 'relaxed'
      }
    }
  });

  assert.equal(result.task_type, 'discover_options');
  assert.equal(result.next_agent, 'decision_discovery');
  assert.equal(result.clarification_needed, false);
  assert.deepStrictEqual(result.clear_fields, ['companions']);
  assert.equal(result.constraints.pace_preference, 'compact');
});

test('short-turn without priorState can remain safe_clarify', async () => {
  const routeIntent = createRouterWithRawIntent({
    task_type: null,
    task_confidence: 0.25,
    constraints: {
      user_query: 'make it relaxed'
    },
    clarification_reason: 'intent_ambiguous'
  });

  const result = await routeIntent({ input: 'make it relaxed' });

  assert.equal(result.task_type, null);
  assert.equal(result.next_agent, 'safe_clarify');
  assert.equal(result.clarification_needed, true);
});

test('choice request with discovery priorState can remain safe_clarify when no candidates exist', async () => {
  const routeIntent = createRouterWithRawIntent({
    task_type: null,
    task_confidence: 0.25,
    constraints: {
      user_query: '帮我选一个'
    },
    clarification_reason: 'intent_ambiguous'
  });

  const result = await routeIntent({
    input: '帮我选一个',
    priorState: {
      task_type: 'discover_options',
      task_confidence: 0.9,
      constraints: {
        destination_scope: '赣州',
        pace_preference: 'relaxed'
      }
    }
  });

  assert.equal(result.task_type, null);
  assert.equal(result.next_agent, 'safe_clarify');
  assert.equal(result.clarification_needed, true);
});

test('explicit replan route request remains plan_route with discovery priorState', async () => {
  const routeIntent = createRouterWithRawIntent({
    task_type: 'plan_route',
    task_confidence: 0.92,
    constraints: {
      user_query: 'replan a three day route without elders',
      time_budget: { days: 3 },
      travel_mode: 'public_transport',
      pace_preference: 'compact',
      companions: null
    },
    clear_fields: ['companions'],
    clarification_reason: null
  });

  const result = await routeIntent({
    input: 'replan a three day route without elders',
    priorState: {
      task_type: 'discover_options',
      task_confidence: 0.9,
      constraints: {
        companions: ['elders'],
        pace_preference: 'relaxed'
      }
    }
  });

  assert.equal(result.task_type, 'plan_route');
  assert.equal(result.next_agent, 'ai_trip');
  assert.equal(result.clarification_needed, false);
  assert.deepStrictEqual(result.clear_fields, ['companions']);
});
