# PR-C route narrative 第二批源码整理

## 1. Controller：`server/src/controllers/front/ai.controller.js`

````js
import { generateRoutePlan, generateRoutePlanNarrative, reviseRoutePlan } from '../../services/ai/route-planner-agent/index.js';

export function createRoutePlanHandlers({
  generateRoutePlanService = generateRoutePlan,
  generateRoutePlanNarrativeService = generateRoutePlanNarrative,
  reviseRoutePlanService = reviseRoutePlan,
  createTraceId = randomUUID
} = {}) {
  return {
    async routePlanGenerate(req, res, next) {
      try {
        const result = await generateRoutePlanService(req.body || {}, {
          requestMeta: buildRequestMeta(req, { createTraceId })
        });

        if (!result.ok) {
          sendError(res, result.error.message, result.error.httpStatus || 400);
          return;
        }

        sendSuccess(res, result.value);
      } catch (error) {
        next(error);
      }
    },
    async routePlanNarrative(req, res, next) {
      const abortController = new AbortController();
      const requestMeta = buildRequestMeta(req, { createTraceId });

      const abortIfClientDisconnected = () => {
        if (!res.writableEnded && !abortController.signal.aborted) {
          abortController.abort();
        }
      };
      const onRequestClosed = () => {
        if (req.aborted || (res.destroyed && !res.writableEnded)) {
          abortIfClientDisconnected();
        }
      };
      const onResponseClosed = () => {
        if (!res.writableEnded) {
          abortIfClientDisconnected();
        }
      };

      if (typeof req.on === 'function') {
        req.on('aborted', abortIfClientDisconnected);
        req.on('close', onRequestClosed);
      }

      if (typeof res.on === 'function') {
        res.on('close', onResponseClosed);
      }

      try {
        const result = await generateRoutePlanNarrativeService(req.body || {}, {
          requestMeta,
          signal: abortController.signal
        });

        if (result.aborted || abortController.signal.aborted || res.writableEnded || res.headersSent) {
          return;
        }

        if (!result.ok) {
          sendError(res, result.error.message, result.error.httpStatus || 400);
          return;
        }

        const data = {
          narrative: result.value.narrative
        };

        if (shouldExposeIntentMeta(req)) {
          data._meta = {
            generation: result.value.generation_meta
          };
        }

        sendSuccess(res, data);
      } catch (error) {
        if (abortController.signal.aborted || res.writableEnded || res.headersSent) {
          return;
        }

        next(error);
      } finally {
        if (typeof req.off === 'function') {
          req.off('aborted', abortIfClientDisconnected);
          req.off('close', onRequestClosed);
        }

        if (typeof res.off === 'function') {
          res.off('close', onResponseClosed);
        }
      }
    },
    async routePlanRevise(req, res, next) {
      try {
        const result = await reviseRoutePlanService(req.body || {}, {
          requestMeta: buildRequestMeta(req, { createTraceId })
        });

        if (!result.ok) {
          sendError(res, result.error.message, result.error.httpStatus || 400);
          return;
        }

        sendSuccess(res, result.value);
      } catch (error) {
        next(error);
      }
    }
  };
}

const routePlanHandlers = createRoutePlanHandlers();
export const routePlanGenerate = routePlanHandlers.routePlanGenerate;
export const routePlanNarrative = routePlanHandlers.routePlanNarrative;
export const routePlanRevise = routePlanHandlers.routePlanRevise;
````

## 2. Routes：`server/src/routes/front/ai.routes.js`

````js
import {
  chat,
  intent,
  knowledge,
  recommendQuestions,
  routePlanGenerate,
  routePlanNarrative,
  routePlanRevise,
  tripPlan
} from '../../controllers/front/ai.controller.js';

function createRequirePlainObjectField(field) {
  return function requirePlainObjectField(req, res, next) {
    const value = req.body?.[field];

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      res.status(400).json({
        code: 400,
        message: `${field} must be an object`,
        data: null
      });
      return;
    }

    next();
  };
}

router.post(
  '/route-plan/generate',
  [
    createRequirePlainObjectField('routerResult')
  ],
  routePlanGenerate
);

router.post(
  '/route-plan/narrative',
  [
    createRequirePlainObjectField('public_plan')
  ],
  routePlanNarrative
);

router.post(
  '/route-plan/revise',
  [
    createRequirePlainObjectField('previous_public_plan'),
    createRequirePlainObjectField('previous_plan_context'),
    createRequirePlainObjectField('action')
  ],
  routePlanRevise
);
````

## 3. Narrative 单元测试：`server/test/route-planner-agent.narrative.test.js`

````js
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
````

## 4. HTTP 路由测试：`server/test/route-plan-route.http.test.js`

````js
import { createRouteFingerprint } from '../src/services/ai/route-planner-agent/mock.js';

function refreshPlanFingerprint(fullPlan) {
  const { plan_context: planContext, ...publicPlan } = fullPlan;
  fullPlan.plan_context.fingerprint = createRouteFingerprint({
    publicPlan,
    planContext
  });
  return fullPlan;
}

test('route-plan narrative route returns wrapped narrative without echoing public_plan', async () => {
  await withServer(async (port) => {
    const generateResponse = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/generate',
      body: createGenerateBody()
    });
    const publicPlan = generateResponse.json.data;
    publicPlan.candidate_status = 'empty';
    refreshPlanFingerprint(publicPlan);

    const narrativeResponse = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/narrative?debug=1',
      body: {
        public_plan: publicPlan
      }
    });

    assert.equal(narrativeResponse.statusCode, 200);
    assert.equal(narrativeResponse.json.code, 200);
    assert.equal(Object.hasOwn(narrativeResponse.json.data, 'public_plan'), false);
    assert.equal(typeof narrativeResponse.json.data.narrative.overview, 'string');
    assert.equal(narrativeResponse.json.data.narrative.day_summaries.length, publicPlan.days.length);
    assert.equal(
      narrativeResponse.json.data._meta.generation.reason,
      'short_circuit_empty'
    );
  });
});

test('route-plan narrative route rejects missing public_plan with thin guard', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/narrative',
      body: {}
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json.code, 400);
    assert.equal(response.json.message, 'public_plan must be an object');
  });
});

test('route-plan narrative route rejects fingerprint mismatch as 400', async () => {
  await withServer(async (port) => {
    const generateResponse = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/generate',
      body: createGenerateBody()
    });
    const publicPlan = generateResponse.json.data;
    publicPlan.route_highlights.push('tampered');

    const narrativeResponse = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/narrative',
      body: {
        public_plan: publicPlan
      }
    });

    assert.equal(narrativeResponse.statusCode, 400);
    assert.equal(narrativeResponse.json.code, 400);
    assert.equal(narrativeResponse.json.message, 'public plan fingerprint does not match public plan');
  });
});
````
