import test from 'node:test';
import assert from 'node:assert/strict';

import { createIntentRouter } from '../src/services/ai/intent-router/index.js';

function createRouterWithResult(result) {
  return createIntentRouter({
    llmExtract: async () => result
  });
}

test('intent router accepts discover_options and routes to decision_discovery', async () => {
  const routeIntent = createRouterWithResult({
    task_type: 'discover_options',
    task_confidence: 0.9,
    constraints: {
      user_query: '帮我推荐几个适合带老人去的景点',
      subject_entities: ['老人'],
      theme_preferences: ['red_culture'],
      physical_constraints: ['mobility_sensitive']
    },
    clarification_reason: null
  });
  const result = await routeIntent({ input: '帮我推荐几个适合带老人去的景点' });

  assert.equal(result.task_type, 'discover_options');
  assert.equal(result.next_agent, 'decision_discovery');
  assert.equal(result.clarification_needed, false);
  assert.deepEqual(result.constraints.subject_entities, ['老人']);
});

test('intent router accepts compare, narrow and alternative discovery task types', async () => {
  for (const taskType of ['compare_options', 'narrow_options', 'suggest_alternatives']) {
    const routeIntent = createRouterWithResult({
      task_type: taskType,
      task_confidence: 0.88,
      constraints: {
        user_query: taskType,
        scenic_hints: ['郁孤台', '通天岩']
      },
      clarification_reason: null
    });
    const result = await routeIntent({ input: taskType });

    assert.equal(result.task_type, taskType);
    assert.equal(result.next_agent, 'decision_discovery');
    assert.equal(result.clarification_needed, false);
    assert.equal(Object.hasOwn(result.constraints, 'current_selection'), false);
    assert.equal(Object.hasOwn(result.constraints, 'candidate_entities'), false);
    assert.equal(Object.hasOwn(result.constraints, 'candidate_entity_keys'), false);
  }
});

test('intent router fallback keeps route recommendation as plan_route', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({ skipped: true })
  });
  const result = await routeIntent({ input: '帮我推荐一条赣州一日游路线' });

  assert.equal(result.task_type, 'plan_route');
  assert.notEqual(result.next_agent, 'decision_discovery');
});

test('intent router fallback maps scenic spot recommendation to discover_options', async () => {
  const routeIntent = createIntentRouter({
    llmExtract: async () => ({ skipped: true })
  });
  const result = await routeIntent({ input: '帮我推荐几个适合带老人去的景点' });

  assert.equal(result.task_type, 'discover_options');
  assert.equal(result.next_agent, 'decision_discovery');
});

test('intent router rejects forbidden discovery candidate fields through fallback', async () => {
  const routeIntent = createRouterWithResult({
    task_type: 'discover_options',
    task_confidence: 0.92,
    constraints: {
      user_query: '帮我推荐几个景点',
      candidate_entity_keys: ['scenic:1'],
      winner: 'scenic:1'
    },
    clarification_reason: null
  });
  const result = await routeIntent({ input: '帮我推荐几个景点' });

  assert.equal(Object.hasOwn(result.constraints, 'candidate_entity_keys'), false);
  assert.equal(Object.hasOwn(result.constraints, 'winner'), false);
});
