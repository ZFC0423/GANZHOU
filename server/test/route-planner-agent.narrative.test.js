import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateRoutePlan,
  generateRoutePlanNarrative
} from '../src/services/ai/route-planner-agent/index.js';
import {
  NARRATIVE_FALLBACK_REASONS,
  NARRATIVE_PROVIDER_REASONS
} from '../src/services/ai/route-planner-agent/contracts.js';
import {
  buildNarrativeInput,
  buildNarrativePromptBundle,
  buildRouteNarrativeMessages
} from '../src/services/ai/route-planner-agent/prompt.js';
import { buildFallbackNarrative } from '../src/services/ai/route-planner-agent/fallback-generate.js';
import { generateRouteNarrative, parseRouteNarrativeJson } from '../src/services/ai/route-planner-agent/generate.js';
import { requestRouteNarrativeCompletion } from '../src/services/ai/route-planner-agent/provider.js';
import { createNarrativeRoutePlanEntry } from '../src/services/ai/route-planner-agent/narrative-entry.js';

function createGeneratePayload(overrides = {}) {
  return {
    routerResult: {
      task_type: 'plan_route',
      task_confidence: 0.93,
      clarification_needed: false,
      clarification_reason: null,
      missing_required_fields: [],
      clarification_questions: [],
      next_agent: 'ai_trip',
      constraints: {
        user_query: '两天公共交通，想看老城和美食，节奏轻松',
        time_budget: {
          days: 2
        },
        travel_mode: 'public_transport',
        pace_preference: 'relaxed',
        theme_preferences: ['food'],
        companions: [],
        hard_avoidances: [],
        physical_constraints: [],
        route_origin: null,
        destination_scope: null
      }
    },
    ...overrides
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function createGeneratedPlan() {
  const result = await generateRoutePlan(createGeneratePayload());
  assert.equal(result.ok, true);
  return result.value;
}

function createProviderResult({ text, reason = null, ok = true }) {
  return {
    ok,
    provider: ok ? 'llm' : 'fallback',
    model: ok ? 'test-model' : null,
    text: text || '',
    latency_ms: 1,
    reason
  };
}

function createNarrativeForPlan(publicPlan) {
  return {
    overview: '这是一段稳定的路线说明。',
    day_summaries: publicPlan.days.map((day) => ({
      day_index: day.day_index,
      text: `第 ${day.day_index} 天说明。`
    })),
    adjustment_hint: '可继续微调路线。',
    constraint_note: '说明层不改写路线骨架。'
  };
}

function withAiEnv(run) {
  const previous = {
    AI_BASE_URL: process.env.AI_BASE_URL,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_MODEL: process.env.AI_MODEL
  };

  process.env.AI_BASE_URL = 'https://example.test/v1';
  process.env.AI_API_KEY = 'test-key';
  process.env.AI_MODEL = 'test-model';

  return Promise.resolve()
    .then(run)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

test('narrative input sanitizer keeps days but strips raw basis item details by default', async () => {
  const plan = await createGeneratedPlan();
  plan.basis.items = [
    {
      item_key: 'basis-secret-1',
      source_type: 'scenic',
      title: '不应进入 prompt 的候选标题',
      region_key: 'zhanggong',
      matched_by: ['theme_preferences'],
      score_rank: 1
    }
  ];

  const narrativeInput = buildNarrativeInput(plan);
  const serialized = JSON.stringify(narrativeInput);

  assert.equal(narrativeInput.days.length, plan.days.length);
  assert.equal(narrativeInput.basis_source, undefined);
  assert.equal(serialized.includes('basis-secret-1'), false);
  assert.equal(serialized.includes('不应进入 prompt 的候选标题'), false);
  assert.equal(serialized.includes('score_rank'), false);
});

test('limited narrative input only exposes aggregated basis whitelist signals', async () => {
  const plan = await createGeneratedPlan();
  plan.candidate_status = 'limited';
  plan.basis.items = [
    {
      item_key: 'basis-secret-1',
      source_type: 'scenic',
      title: '不应进入 prompt 的候选标题',
      region_key: 'zhanggong',
      matched_by: ['theme_preferences', 'category_code'],
      score_rank: 1
    },
    {
      item_key: 'basis-secret-2',
      source_type: 'article',
      title: '另一条不应进入 prompt 的候选标题',
      region_key: 'dayu',
      matched_by: ['theme_preferences'],
      score_rank: 2
    }
  ];

  const narrativeInput = buildNarrativeInput(plan);
  const serialized = JSON.stringify(narrativeInput);

  assert.equal(narrativeInput.basis_source, 'route_planner_pr_b');
  assert.equal(narrativeInput.basis_item_count, 2);
  assert.deepEqual(narrativeInput.matched_by_summary, {
    theme_preferences: 2,
    category_code: 1
  });
  assert.equal(serialized.includes('basis-secret-1'), false);
  assert.equal(serialized.includes('score_rank'), false);
  assert.equal(serialized.includes('另一条不应进入 prompt 的候选标题'), false);
});

test('empty day is marked in sanitizer, constrained in prompt, and conservative in fallback', async () => {
  const plan = await createGeneratedPlan();
  const emptyDayPlan = clone(plan);
  emptyDayPlan.days[0].items = [];
  emptyDayPlan.summary.total_items = emptyDayPlan.days.reduce((total, day) => total + day.items.length, 0);

  const narrativeInput = buildNarrativeInput(emptyDayPlan);
  const messages = buildRouteNarrativeMessages(narrativeInput);
  const fallback = buildFallbackNarrative({
    publicPlan: emptyDayPlan,
    reason: NARRATIVE_FALLBACK_REASONS.INPUT_BUDGET_EXCEEDED
  });

  assert.equal(narrativeInput.days[0].is_empty_day, true);
  assert.equal(narrativeInput.days[0].item_count, 0);
  assert.deepEqual(narrativeInput.days[0].item_titles, []);
  assert.match(messages[0].content, /严禁脑补具体景点/);
  assert.match(fallback.day_summaries[0].text, /暂无固定行程安排/);
});

test('budget guard is based on sanitized narrative input and falls back before provider', async () => {
  const plan = await createGeneratedPlan();
  const promptBundle = buildNarrativePromptBundle(plan, {
    maxNarrativeInputBudget: 1
  });

  assert.equal(promptBundle.ok, false);
  assert.equal(promptBundle.reason, NARRATIVE_FALLBACK_REASONS.INPUT_BUDGET_EXCEEDED);
  assert.ok(promptBundle.input_size > promptBundle.max_budget);
});

test('generateRouteNarrative input budget fallback keeps fallback day intro call chain stable', async () => {
  const plan = await createGeneratedPlan();

  const result = await generateRouteNarrative({
    publicPlan: plan,
    maxNarrativeInputBudget: 1
  });

  assert.equal(result.generation_meta.fallback_used, true);
  assert.equal(result.generation_meta.reason, NARRATIVE_FALLBACK_REASONS.INPUT_BUDGET_EXCEEDED);
  assert.equal(result.narrative.day_summaries.length, plan.days.length);
  assert.ok(result.narrative.day_summaries.every((summary) => summary.text.length > 0));
});

test('generateRouteNarrative accepts fenced strict JSON and returns llm narrative', async () => {
  const plan = await createGeneratedPlan();
  const narrative = createNarrativeForPlan(plan);

  const result = await generateRouteNarrative({
    publicPlan: plan,
    provider: async () => createProviderResult({
      text: `\`\`\`json\n${JSON.stringify(narrative)}\n\`\`\``
    })
  });

  assert.equal(result.generation_meta.fallback_used, false);
  assert.equal(result.generation_meta.provider, 'llm');
  assert.deepEqual(result.narrative, narrative);
});

test('generateRouteNarrative falls back on invalid JSON prose without greedy extraction', async () => {
  const plan = await createGeneratedPlan();

  const result = await generateRouteNarrative({
    publicPlan: plan,
    provider: async () => createProviderResult({
      text: `这里是解释文字 ${JSON.stringify(createNarrativeForPlan(plan))}`
    })
  });

  assert.equal(result.generation_meta.fallback_used, true);
  assert.equal(result.generation_meta.reason, NARRATIVE_FALLBACK_REASONS.INVALID_JSON);
});

test('generateRouteNarrative rejects model overreach fields and falls back', async () => {
  const plan = await createGeneratedPlan();
  const overreachingNarrative = {
    ...createNarrativeForPlan(plan),
    route_highlights: ['model-owned-field']
  };

  const result = await generateRouteNarrative({
    publicPlan: plan,
    provider: async () => createProviderResult({
      text: JSON.stringify(overreachingNarrative)
    })
  });

  assert.equal(result.generation_meta.fallback_used, true);
  assert.equal(result.generation_meta.reason, NARRATIVE_FALLBACK_REASONS.SCHEMA_VIOLATION);
});

test('generateRouteNarrative timeout fallback keeps fallback day intro call chain stable', async () => {
  const plan = await createGeneratedPlan();

  const result = await generateRouteNarrative({
    publicPlan: plan,
    provider: async () => createProviderResult({
      ok: false,
      reason: NARRATIVE_PROVIDER_REASONS.TIMEOUT
    })
  });

  assert.equal(result.generation_meta.fallback_used, true);
  assert.equal(result.generation_meta.reason, NARRATIVE_FALLBACK_REASONS.TIMEOUT);
  assert.equal(result.narrative.day_summaries.length, plan.days.length);
  assert.ok(result.narrative.day_summaries.every((summary) => summary.text.length > 0));
});

test('generateRouteNarrative short-circuits empty and rejected plans before provider', async () => {
  const plan = await createGeneratedPlan();
  const emptyPlan = clone(plan);
  emptyPlan.candidate_status = 'empty';
  let providerCalled = false;

  const emptyResult = await generateRouteNarrative({
    publicPlan: emptyPlan,
    provider: async () => {
      providerCalled = true;
      throw new Error('provider should not be called');
    }
  });

  assert.equal(providerCalled, false);
  assert.equal(emptyResult.generation_meta.reason, NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_EMPTY);

  const rejectedPlan = clone(plan);
  rejectedPlan.plan_context.last_action_result = {
    status: 'rejected',
    reason_code: 'insufficient_candidates',
    message: 'rejected',
    diagnostics: []
  };

  const rejectedResult = await generateRouteNarrative({
    publicPlan: rejectedPlan,
    provider: async () => {
      throw new Error('provider should not be called');
    }
  });

  assert.equal(rejectedResult.generation_meta.reason, NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_REJECTED);
  assert.match(rejectedResult.narrative.constraint_note, /本次调整未应用/);
});

test('parseRouteNarrativeJson only strips full fenced wrappers', () => {
  const parsed = parseRouteNarrativeJson('```json\n{"overview":"ok"}\n```');
  assert.deepEqual(parsed, { overview: 'ok' });
  assert.throws(() => parseRouteNarrativeJson('prefix {"overview":"ok"} suffix'), SyntaxError);
});

test('provider hard timeout aborts pending request with timeout reason', async () => {
  await withAiEnv(async () => {
    let sawAbort = false;
    const axiosClient = {
      post: async (_url, _body, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          sawAbort = true;
          reject(new Error('aborted'));
        });
      })
    };

    const result = await requestRouteNarrativeCompletion({
      messages: [
        { role: 'system', content: 'system' },
        { role: 'user', content: 'user' }
      ],
      axiosClient,
      timeoutMs: 1
    });

    assert.equal(sawAbort, true);
    assert.equal(result.ok, false);
    assert.equal(result.reason, NARRATIVE_PROVIDER_REASONS.TIMEOUT);
  });
});

test('provider hard timeout does not wait for clients that ignore AbortSignal', async () => {
  await withAiEnv(async () => {
    const axiosClient = {
      post: async () => new Promise(() => {})
    };

    const startedAt = Date.now();
    const result = await requestRouteNarrativeCompletion({
      messages: [
        { role: 'system', content: 'system' },
        { role: 'user', content: 'user' }
      ],
      axiosClient,
      timeoutMs: 1
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, NARRATIVE_PROVIDER_REASONS.TIMEOUT);
    assert.ok(Date.now() - startedAt < 1000);
  });
});

test('provider maps request abort to client_aborted rather than provider_error', async () => {
  await withAiEnv(async () => {
    const requestAbort = new AbortController();
    const axiosClient = {
      post: async (_url, _body, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          reject(new Error('aborted'));
        });
        requestAbort.abort();
      })
    };

    const result = await requestRouteNarrativeCompletion({
      messages: [
        { role: 'system', content: 'system' },
        { role: 'user', content: 'user' }
      ],
      signal: requestAbort.signal,
      axiosClient,
      timeoutMs: 1000
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, NARRATIVE_PROVIDER_REASONS.CLIENT_ABORTED);
  });
});

test('narrative entry rejects fingerprint mismatch before generation', async () => {
  const plan = await createGeneratedPlan();
  const tamperedPlan = clone(plan);
  tamperedPlan.route_highlights.push('tampered');
  let generateCalled = false;
  const entry = createNarrativeRoutePlanEntry({
    generateNarrative: async () => {
      generateCalled = true;
      throw new Error('generate should not be called');
    }
  });

  const result = await entry({
    public_plan: tamperedPlan
  });

  assert.equal(generateCalled, false);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'route_planner_narrative_fingerprint_mismatch');
  assert.equal(result.error.httpStatus, 400);
  assert.equal(result.error.details[0].provided_fingerprint, tamperedPlan.plan_context.fingerprint);
  assert.match(result.error.details[0].recomputed_fingerprint, /^sha256:/);
  assert.notEqual(
    result.error.details[0].provided_fingerprint,
    result.error.details[0].recomputed_fingerprint
  );
  assert.equal(Object.hasOwn(result.error.details[0], 'actual'), false);
});

test('narrative entry stops immediately when request signal is already aborted', async () => {
  const abortController = new AbortController();
  abortController.abort();
  let generateCalled = false;
  const entry = createNarrativeRoutePlanEntry({
    generateNarrative: async () => {
      generateCalled = true;
      throw new Error('generate should not be called');
    }
  });

  const result = await entry({}, {
    signal: abortController.signal
  });

  assert.equal(generateCalled, false);
  assert.equal(result.ok, false);
  assert.equal(result.aborted, true);
  assert.equal(result.error.code, 'route_planner_narrative_client_aborted');
});

test('exported generateRoutePlanNarrative returns fallback narrative without public plan echo', async () => {
  const plan = await createGeneratedPlan();
  const emptyPlan = clone(plan);
  emptyPlan.candidate_status = 'empty';
  const { createRouteFingerprint } = await import('../src/services/ai/route-planner-agent/mock.js');
  const { plan_context: planContext, ...revisionPublicPlan } = emptyPlan;
  emptyPlan.plan_context.fingerprint = createRouteFingerprint({
    publicPlan: revisionPublicPlan,
    planContext
  });

  const result = await generateRoutePlanNarrative({
    public_plan: emptyPlan
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.generation_meta.reason, NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_EMPTY);
  assert.equal(Object.hasOwn(result.value, 'public_plan'), false);
});
