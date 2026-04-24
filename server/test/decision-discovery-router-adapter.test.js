import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDiscoveryPayloadFromRouterResult } from '../src/services/ai/decision-discovery-agent/router-adapter.js';

test('router adapter keeps non-scenic subject entities out of scenic_hints', () => {
  const payload = buildDiscoveryPayloadFromRouterResult({
    task_type: 'discover_options',
    next_agent: 'decision_discovery',
    constraints: {
      subject_entities: ['老人', '红色文化'],
      scenic_hints: []
    }
  });

  assert.deepEqual(payload.constraints.subject_entities, ['老人', '红色文化']);
  assert.deepEqual(payload.constraints.scenic_hints, []);
});

test('router adapter preserves explicit scenic_hints without inferring from subject_entities', () => {
  const payload = buildDiscoveryPayloadFromRouterResult({
    task_type: 'compare_options',
    next_agent: 'decision_discovery',
    constraints: {
      subject_entities: ['老人'],
      mentioned_entities: ['亲子'],
      scenic_hints: ['郁孤台']
    }
  });

  assert.deepEqual(payload.constraints.subject_entities, ['老人', '亲子']);
  assert.deepEqual(payload.constraints.scenic_hints, ['郁孤台']);
});

test('router adapter passes continuation inputs through and does not inject forbidden fields', () => {
  const previousPublicResult = { ranked_options: [{ option_key: 'scenic:1' }] };
  const decisionContext = { context_version: 1, fingerprint: 'sha256:test', continuation: {} };
  const action = { action_type: 'discovery.refine', payload: { option_keys: ['scenic:1'] } };
  const payload = buildDiscoveryPayloadFromRouterResult(
    {
      task_type: 'narrow_options',
      next_agent: 'decision_discovery',
      constraints: {
        mentioned_entities: ['通天岩'],
        theme_preferences: ['heritage'],
        destination_scope: 'ganzhou',
        option_limit: 99,
        current_selection_key: 'scenic:9',
        candidate_entity_keys: ['scenic:9'],
        winner: 'scenic:9',
        score: 100,
        rank: 1
      }
    },
    {
      previous_public_result: previousPublicResult,
      decision_context: decisionContext,
      action
    }
  );

  assert.equal(payload.previous_public_result, previousPublicResult);
  assert.equal(payload.decision_context, decisionContext);
  assert.equal(payload.action, action);
  assert.deepEqual(payload.constraints.destination_scope, ['ganzhou']);
  assert.equal(payload.constraints.option_limit, 99);

  assert.equal(Object.hasOwn(payload.constraints, 'current_selection_key'), false);
  assert.equal(Object.hasOwn(payload.constraints, 'candidate_entity_keys'), false);
  assert.equal(Object.hasOwn(payload.constraints, 'winner'), false);
  assert.equal(Object.hasOwn(payload.constraints, 'score'), false);
  assert.equal(Object.hasOwn(payload.constraints, 'rank'), false);
});
