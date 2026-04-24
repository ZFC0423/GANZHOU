import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDecisionContext } from '../src/services/ai/decision-discovery-agent/context-merge.js';
import { createDecisionDiscoveryAgent } from '../src/services/ai/decision-discovery-agent/index.js';
import { assertDiscoveryContract } from '../src/services/ai/decision-discovery-agent/validate.js';

function scenicCandidate(id, overrides = {}) {
  return {
    option_key: `scenic:${id}`,
    entity_type: 'scenic',
    entity_id: id,
    display_name: `spot ${id}`,
    region: 'Zhanggong',
    category_id: 2,
    category_code: 'scenic_history',
    category_name: 'History Scenic',
    family_friendly: true,
    tags: ['history', 'old-city'],
    recommend_flag: 1,
    hot_score: 90 - id,
    text: {
      name: `spot ${id}`,
      region: 'Zhanggong',
      intro: 'history old-city public transport citywalk',
      culture_desc: 'heritage',
      hero_caption: '',
      route_label: 'citywalk',
      quote: '',
      visit_mode: 'public transport',
      walking_intensity: 'low',
      traffic_guide: ''
    },
    record: {},
    ...overrides
  };
}

test('discover_options returns strict public contract and allowlisted context', async () => {
  const agent = createDecisionDiscoveryAgent({
    retrieve: async () => ({
      mode: 'primary',
      candidates: [scenicCandidate(1), scenicCandidate(2)],
      option_key_resolutions: [],
      diagnostics: []
    })
  });

  const result = await agent({
    task_type: 'discover_options',
    constraints: {
      theme_preferences: ['heritage'],
      travel_mode: 'public_transport',
      option_limit: 2
    },
    previous_public_result: null,
    decision_context: null,
    action: null
  });

  assertDiscoveryContract(result);
  assert.equal(result.result_status, 'ready');
  assert.equal(result.ranked_options.length, 2);
  assert.deepEqual(Object.keys(result.ranked_options[0]).sort(), [
    'category_id',
    'caution_reasons',
    'display_name',
    'entity_id',
    'entity_type',
    'evidence_refs',
    'fit_level',
    'fit_reasons',
    'fit_score',
    'option_key',
    'rank',
    'region'
  ]);
  assert.deepEqual(Object.keys(result.decision_context.continuation).sort(), [
    'companions',
    'current_selection_key',
    'destination_scope',
    'exclude_option_keys',
    'hard_avoidances',
    'option_limit',
    'pace_preference',
    'physical_constraints',
    'region_hints',
    'route_origin',
    'theme_preferences',
    'time_budget',
    'travel_mode'
  ]);
});

test('unsupported task_type returns invalid Discovery contract instead of throwing', async () => {
  const agent = createDecisionDiscoveryAgent();
  const result = await agent({
    task_type: 'not_supported',
    constraints: {}
  });

  assertDiscoveryContract(result);
  assert.equal(result.task_type, 'discover_options');
  assert.equal(result.result_status, 'invalid');
  assert.equal(result.warnings[0].code, 'unsupported_task_type');
});

test('compare_options missing target freezes ranked_options and next_actions shape', async () => {
  const agent = createDecisionDiscoveryAgent({
    resolveMention: async (requestedText) => ({
      requested_text: requestedText,
      resolution_status: requestedText === 'known' ? 'resolved' : 'missing',
      resolution_reason: requestedText === 'known' ? 'exact' : 'no_match',
      option_key: requestedText === 'known' ? 'scenic:1' : null,
      candidate: requestedText === 'known' ? scenicCandidate(1) : null
    })
  });

  const result = await agent({
    task_type: 'compare_options',
    constraints: {
      subject_entities: ['known', 'unknown']
    }
  });

  assertDiscoveryContract(result);
  assert.equal(result.result_status, 'limited');
  assert.equal(result.comparison.outcome, 'missing_target');
  assert.deepEqual(result.ranked_options, []);
  assert.deepEqual(result.comparison.axes, []);
  assert.ok(result.next_actions.length > 0);
  assert.ok(result.next_actions.every((action) => action.action_type === 'discovery.refine'));
});

test('valid previous context fingerprint is accepted without leaking extra fields', async () => {
  const decisionContext = buildDecisionContext({
    current_selection_key: 'scenic:1',
    exclude_option_keys: [],
    theme_preferences: ['heritage'],
    region_hints: [],
    travel_mode: null,
    companions: [],
    hard_avoidances: [],
    physical_constraints: [],
    time_budget: null,
    pace_preference: null,
    route_origin: null,
    destination_scope: [],
    option_limit: 2
  });
  const agent = createDecisionDiscoveryAgent({
    retrieve: async () => ({
      mode: 'primary',
      candidates: [scenicCandidate(1)],
      option_key_resolutions: [],
      diagnostics: []
    })
  });
  const result = await agent({
    task_type: 'discover_options',
    constraints: {
      option_limit: 2
    },
    decision_context: {
      ...decisionContext,
      ignored_extra: true
    }
  });

  assertDiscoveryContract(result);
  assert.equal(result.result_status, 'limited');
  assert.equal(result.decision_context.continuation.option_limit, 2);
  assert.equal(result.warnings.some((warning) => warning.code === 'context_fingerprint_mismatch'), false);
});

test('narrow_options preserves explicit option_keys even when one has hard walking conflict', async () => {
  const agent = createDecisionDiscoveryAgent({
    retrieve: async () => ({
      mode: 'primary',
      candidates: [
        scenicCandidate(1, {
          hot_score: 90,
          text: {
            ...scenicCandidate(1).text,
            walking_intensity: 'low'
          }
        }),
        scenicCandidate(2, {
          hot_score: 80,
          text: {
            ...scenicCandidate(2).text,
            walking_intensity: 'low'
          }
        }),
        scenicCandidate(3, {
          hot_score: 70,
          text: {
            ...scenicCandidate(3).text,
            walking_intensity: 'high steep climb'
          }
        })
      ],
      option_key_resolutions: [],
      diagnostics: []
    })
  });

  const result = await agent({
    task_type: 'narrow_options',
    constraints: {
      physical_constraints: ['mobility_sensitive'],
      hard_avoidances: ['avoid_steep'],
      option_limit: 3
    },
    action: {
      action_type: 'discovery.refine',
      payload: {
        option_keys: ['scenic:1', 'scenic:2', 'scenic:3'],
        option_limit: 3
      }
    }
  });
  const conflictOption = result.ranked_options.find((option) => option.option_key === 'scenic:3');

  assertDiscoveryContract(result);
  assert.equal(result.ranked_options.length, 3);
  assert.ok(conflictOption);
  assert.ok(conflictOption.fit_score < result.ranked_options.find((option) => option.option_key === 'scenic:1').fit_score);
  assert.ok(conflictOption.caution_reasons.includes('walking_intensity_conflict'));
  assert.ok(conflictOption.caution_reasons.includes('physical_constraint_conflict'));
});

test('compare_options preserves resolved explicit targets with hard conflict in ranked_options and axes', async () => {
  const conflicting = scenicCandidate(3, {
    hot_score: 70,
    text: {
      ...scenicCandidate(3).text,
      walking_intensity: 'high steep climb'
    }
  });
  const agent = createDecisionDiscoveryAgent({
    resolveOptionKey: async (optionKey) => ({
      requested_text: optionKey,
      resolution_status: 'resolved',
      resolution_reason: 'option_key',
      option_key: optionKey,
      candidate: optionKey === 'scenic:3' ? conflicting : scenicCandidate(Number(optionKey.split(':')[1]))
    })
  });

  const result = await agent({
    task_type: 'compare_options',
    constraints: {
      physical_constraints: ['mobility_sensitive'],
      hard_avoidances: ['avoid_steep']
    },
    action: {
      action_type: 'discovery.compare',
      payload: {
        option_keys: ['scenic:1', 'scenic:3']
      }
    }
  });
  const conflictOption = result.ranked_options.find((option) => option.option_key === 'scenic:3');
  const walkingAxisItem = result.comparison.axes
    .find((axis) => axis.axis_code === 'walking_fit')
    .items.find((item) => item.option_key === 'scenic:3');

  assertDiscoveryContract(result);
  assert.ok(conflictOption);
  assert.ok(conflictOption.caution_reasons.includes('walking_intensity_conflict'));
  assert.equal(walkingAxisItem.value_code, 'conflict');
});

test('expected Sequelize infrastructure errors degrade to legal contract', async () => {
  const error = new Error('database unavailable');
  error.name = 'SequelizeConnectionError';
  const agent = createDecisionDiscoveryAgent({
    retrieve: async () => {
      throw error;
    }
  });

  const result = await agent({
    task_type: 'discover_options',
    constraints: {}
  });

  assertDiscoveryContract(result);
  assert.equal(result.result_status, 'limited');
  assert.equal(result.warnings.some((warning) => warning.code === 'database_retrieval_failed'), true);
  assert.deepEqual(result.ranked_options, []);
});

test('programmer errors from score are thrown instead of converted to fallback', async () => {
  const agent = createDecisionDiscoveryAgent({
    retrieve: async () => ({
      mode: 'primary',
      candidates: [scenicCandidate(1)],
      option_key_resolutions: [],
      diagnostics: []
    }),
    score: () => {
      throw new TypeError('score panic');
    }
  });

  await assert.rejects(
    () => agent({ task_type: 'discover_options', constraints: {} }),
    TypeError
  );
});

test('internal output contract validation failure is thrown as programmer error', async () => {
  const agent = createDecisionDiscoveryAgent({
    retrieve: async () => ({
      mode: 'primary',
      candidates: [scenicCandidate(1)],
      option_key_resolutions: [],
      diagnostics: []
    }),
    project: () => [
      {
        option_key: 'scenic:1',
        entity_type: 'scenic',
        entity_id: 1,
        rank: 1,
        display_name: 'broken',
        region: 'Zhanggong',
        category_id: 2,
        fit_score: Number.NaN,
        fit_level: 'high',
        fit_reasons: [],
        caution_reasons: [],
        evidence_refs: []
      }
    ]
  });

  await assert.rejects(
    () => agent({ task_type: 'discover_options', constraints: {} }),
    /fit_score is invalid/
  );
});
