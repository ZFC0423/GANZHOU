import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import app from '../src/app.js';
import { createRouteFingerprint } from '../src/services/ai/route-planner-agent/mock.js';

function createGenerateBody() {
  return {
    routerResult: {
      task_type: 'plan_route',
      task_confidence: 0.91,
      clarification_needed: false,
      clarification_reason: null,
      missing_required_fields: [],
      clarification_questions: [],
      next_agent: 'ai_trip',
      constraints: {
        user_query: '两天公共交通看老城和美食',
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
    }
  };
}

function makeRequest({ port, path, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      },
      (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            json: JSON.parse(data)
          });
        });
      }
    );

    request.on('error', reject);
    request.write(JSON.stringify(body));
    request.end();
  });
}

async function withServer(run) {
  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address();

  try {
    await run(port);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

function refreshPlanFingerprint(fullPlan) {
  const { plan_context: planContext, ...publicPlan } = fullPlan;
  fullPlan.plan_context.fingerprint = createRouteFingerprint({
    publicPlan,
    planContext
  });
  return fullPlan;
}

function inflatePlanTitlesForNarrativeBudget(fullPlan) {
  fullPlan.days.forEach((day) => {
    day.items.forEach((item, index) => {
      item.title = `budget-title-${day.day_index}-${index}-${'x'.repeat(4000)}`;
    });
  });

  return refreshPlanFingerprint(fullPlan);
}

function stripSessionContext(fullPlan) {
  const { session_context, ...publicPlan } = fullPlan;
  return publicPlan;
}

test('route-plan generate route returns wrapped PR-B route planner payload', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/generate',
      body: createGenerateBody()
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.task_type, 'plan_route');
    assert.ok(['ready', 'limited', 'empty'].includes(response.json.data.candidate_status));
    assert.equal(response.json.data.planning_status, 'generated');
    assert.equal(response.json.data.route_positioning.duration_days, 2);
    assert.equal(response.json.data.plan_context.version, 1);
    assert.equal(response.json.data.plan_context.last_action_result, null);
    assert.ok(response.json.data.session_context);
    assert.deepEqual(response.json.data.session_context.locked_targets, []);
  });
});

test('route-plan revise route returns wrapped revised payload', async () => {
  await withServer(async (port) => {
    const generateResponse = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/generate',
      body: createGenerateBody()
    });

    const { plan_context, ...previousPublicPlan } = stripSessionContext(generateResponse.json.data);

    const reviseResponse = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/revise',
      body: {
        previous_public_plan: previousPublicPlan,
        previous_plan_context: plan_context,
        action: {
          type: 'compress_to_one_day'
        }
      }
    });

    assert.equal(reviseResponse.statusCode, 200);
    assert.equal(reviseResponse.json.code, 200);
    assert.equal(reviseResponse.json.data.planning_status, 'revised');
    assert.equal(reviseResponse.json.data.route_positioning.duration_days, 1);
    assert.equal(reviseResponse.json.data.plan_context.version, 2);
    assert.equal(reviseResponse.json.data.plan_context.constraints_snapshot.time_budget.days, 1);
  });
});

test('route-plan generate route enforces thin object guard before deep validation', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/generate',
      body: {}
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json.code, 400);
    assert.equal(response.json.message, 'routerResult must be an object');
  });
});

test('route-plan generate route normalizes invalid legacy locked option keys before planning', async () => {
  await withServer(async (port) => {
    const body = createGenerateBody();
    body.routerResult.constraints.locked_targets = ['article:1'];

    const response = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/generate',
      body
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.deepEqual(response.json.data.plan_context.constraints_snapshot.locked_targets, []);
    assert.deepEqual(response.json.data.session_context.locked_targets, []);
  });
});

test('route-plan generate route returns session_context for business failed plans', async () => {
  await withServer(async (port) => {
    const body = createGenerateBody();
    body.structured_events = {
      locked_targets: ['scenic:999999']
    };

    const response = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/generate',
      body
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.planning_status, 'failed');
    assert.equal(response.json.data.session_context.last_result_status, 'failed');
    assert.deepEqual(response.json.data.session_context.locked_targets, ['scenic:999999']);
  });
});

test('route-plan revise route enforces thin object guards for required top-level objects', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/revise',
      body: {
        previous_public_plan: {},
        action: {}
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json.code, 400);
    assert.equal(response.json.message, 'previous_plan_context must be an object');
  });
});

test('route-plan revise route rejects missing previous_public_plan before deep validation', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/revise',
      body: {
        previous_plan_context: {},
        action: {}
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json.code, 400);
    assert.equal(response.json.message, 'previous_public_plan must be an object');
  });
});

test('route-plan revise route rejects missing action before deep validation', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/revise',
      body: {
        previous_public_plan: {},
        previous_plan_context: {}
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json.code, 400);
    assert.equal(response.json.message, 'action must be an object');
  });
});

test('route-plan narrative route returns wrapped narrative without echoing public_plan', async () => {
  await withServer(async (port) => {
    const generateResponse = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/generate',
      body: createGenerateBody()
    });
    const publicPlan = stripSessionContext(generateResponse.json.data);
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

test('route-plan narrative route returns no debug meta when debug gate is off', async () => {
  await withServer(async (port) => {
    const generateResponse = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/generate',
      body: createGenerateBody()
    });
    const publicPlan = stripSessionContext(generateResponse.json.data);
    publicPlan.candidate_status = 'empty';
    refreshPlanFingerprint(publicPlan);

    const narrativeResponse = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/narrative',
      body: {
        public_plan: publicPlan
      }
    });

    assert.equal(narrativeResponse.statusCode, 200);
    assert.equal(narrativeResponse.json.code, 200);
    assert.equal(typeof narrativeResponse.json.data.narrative.overview, 'string');
    assert.equal(Object.hasOwn(narrativeResponse.json.data, '_meta'), false);
    assert.equal(Object.hasOwn(narrativeResponse.json.data, 'public_plan'), false);
  });
});

test('route-plan narrative route maps input budget exceeded to HTTP 200 fallback', async () => {
  await withServer(async (port) => {
    const generateResponse = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/generate',
      body: createGenerateBody()
    });
    const publicPlan = inflatePlanTitlesForNarrativeBudget(stripSessionContext(generateResponse.json.data));

    const narrativeResponse = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/narrative?debug=1',
      body: {
        public_plan: publicPlan
      }
    });

    assert.notEqual(narrativeResponse.statusCode, 400);
    assert.equal(narrativeResponse.statusCode, 200);
    assert.equal(narrativeResponse.json.code, 200);
    assert.equal(typeof narrativeResponse.json.data.narrative.overview, 'string');
    assert.equal(narrativeResponse.json.data.narrative.day_summaries.length, publicPlan.days.length);
    assert.equal(narrativeResponse.json.data._meta.generation.fallback_used, true);
    assert.equal(
      narrativeResponse.json.data._meta.generation.reason,
      'input_budget_exceeded'
    );
    assert.equal(Object.hasOwn(narrativeResponse.json.data, 'public_plan'), false);
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
    const publicPlan = stripSessionContext(generateResponse.json.data);
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
