import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import app from '../src/app.js';
import { createDiscoveryQueryHandler } from '../src/controllers/front/ai.controller.js';

function createDiscoveryOutput(overrides = {}) {
  return {
    task_type: 'discover_options',
    result_status: 'ready',
    ranked_options: [],
    comparison: null,
    next_actions: [],
    warnings: [],
    decision_context: {
      context_version: 1,
      fingerprint: 'sha256:test',
      continuation: {}
    },
    ...overrides
  };
}

function makeRequest({ port, path = '/api/front/ai/discovery/query', body }) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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

test('discovery query returns router safe clarify without entering Discovery', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      body: {
        user_query: '帮我选一个'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.next_agent, 'safe_clarify');
    assert.equal(response.json.data.clarification_needed, true);
    assert.equal(Object.hasOwn(response.json.data, 'ranked_options'), false);
  });
});

test('discovery query routes natural language discovery into Discovery contract', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      body: {
        user_query: '帮我推荐几个适合带老人去的景点'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.task_type, 'discover_options');
    assert.ok(['ready', 'limited', 'empty', 'invalid'].includes(response.json.data.result_status));
    assert.ok(Array.isArray(response.json.data.ranked_options));
    assert.ok(response.json.data.decision_context);
    assert.ok(response.json.data.session_context);
    assert.ok(response.json.data.session_context.trip_constraints);
  });
});

test('discovery query returns invalid Discovery-style response for unsupported next_agent', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      body: {
        user_query: '介绍郁孤台历史'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.result_status, 'invalid');
    assert.equal(response.json.data.warnings[0].code, 'unsupported_next_agent');
    assert.equal(response.json.data.task_type, 'discover_options');
  });
});

test('direct discovery endpoint remains available after discovery query integration', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      path: '/api/front/ai/discovery',
      body: {
        task_type: 'discover_options',
        constraints: {
          option_limit: 2
        }
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.task_type, 'discover_options');
    assert.ok(Array.isArray(response.json.data.ranked_options));
  });
});

test('discovery query handler passes priorState to Intent Router service', async () => {
  const received = [];
  const priorState = {
    task_type: 'plan_route',
    task_confidence: 0.91,
    constraints: {
      time_budget: { days: 3 },
      travel_mode: 'public_transport',
      pace_preference: 'relaxed'
    }
  };
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async (payload) => {
      received.push(payload);
      return {
        task_type: 'discover_options',
        task_confidence: 0.88,
        constraints: {
          user_query: payload.input,
          time_budget: { days: 3 },
          travel_mode: 'public_transport',
          pace_preference: 'relaxed'
        },
        clarification_needed: false,
        clarification_reason: null,
        missing_required_fields: [],
        clarification_questions: [],
        next_agent: 'decision_discovery'
      };
    },
    runDecisionDiscoveryAgentService: async () => ({
      task_type: 'discover_options',
      result_status: 'empty',
      ranked_options: [],
      comparison: null,
      next_actions: [],
      warnings: [],
      decision_context: {
        context_version: 1,
        fingerprint: 'sha256:test',
        continuation: {}
      }
    })
  });
  let jsonBody = null;
  const req = {
    body: {
      user_query: '3天',
      priorState
    },
    headers: {},
    socket: {}
  };
  const res = {
    json(body) {
      jsonBody = body;
    }
  };

  await handler(req, res, assert.fail);

  assert.equal(received.length, 1);
  assert.deepEqual(received[0], {
    input: '3天',
    priorState
  });
  assert.equal(jsonBody.code, 200);
});

test('discovery query handler builds priorState from previous_session_context', async () => {
  let receivedPayload = null;
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async (payload) => {
      receivedPayload = payload;
      return {
        task_type: null,
        task_confidence: 0.2,
        constraints: {
          user_query: payload.input
        },
        clear_fields: [],
        clarification_needed: true,
        clarification_reason: 'intent_ambiguous',
        missing_required_fields: [],
        clarification_questions: [],
        next_agent: 'safe_clarify'
      };
    },
    runDecisionDiscoveryAgentService: async () => {
      assert.fail('Discovery agent should not run for this test');
    }
  });
  let jsonBody = null;

  await handler({
    body: {
      user_query: '不带老人了，节奏紧凑点',
      previous_session_context: {
        trip_constraints: {
          companions: ['elders'],
          pace_preference: 'relaxed',
          time_budget: {
            days: 2,
            date_text: '周末'
          }
        },
        selected_options: ['scenic:1'],
        rejected_options: ['scenic:2'],
        locked_targets: ['scenic:3']
      }
    },
    headers: {},
    socket: {}
  }, {
    json(body) {
      jsonBody = body;
    }
  }, assert.fail);

  assert.equal(jsonBody.code, 200);
  assert.equal(receivedPayload.priorState.task_type, 'discover_options');
  assert.equal(receivedPayload.priorState.task_confidence, 0.9);
  assert.deepEqual(receivedPayload.priorState.constraints.companions, ['elders']);
  assert.equal(receivedPayload.priorState.constraints.pace_preference, 'relaxed');
  assert.deepEqual(receivedPayload.priorState.constraints.time_budget, {
    days: 2,
    date_text: '周末'
  });
  assert.equal(Object.hasOwn(receivedPayload.priorState.constraints, 'selected_options'), false);
  assert.equal(Object.hasOwn(receivedPayload.priorState.constraints, 'rejected_options'), false);
  assert.equal(Object.hasOwn(receivedPayload.priorState.constraints, 'locked_targets'), false);
});

test('discovery query handler lets invalid explicit priorState fall back to previous_session_context', async () => {
  let receivedPayload = null;
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async (payload) => {
      receivedPayload = payload;
      return {
        task_type: null,
        task_confidence: 0.2,
        constraints: {
          user_query: payload.input
        },
        clear_fields: [],
        clarification_needed: true,
        clarification_reason: 'intent_ambiguous',
        missing_required_fields: [],
        clarification_questions: [],
        next_agent: 'safe_clarify'
      };
    }
  });

  await handler({
    body: {
      user_query: '换成轻松一点',
      priorState: {},
      previous_session_context: {
        trip_constraints: {
          pace_preference: 'compact'
        }
      }
    },
    headers: {},
    socket: {}
  }, {
    json() {}
  }, assert.fail);

  assert.equal(receivedPayload.priorState.task_type, 'discover_options');
  assert.deepEqual(receivedPayload.priorState.constraints, {
    pace_preference: 'compact'
  });
});

test('discovery query handler prefers effective explicit priorState over previous_session_context', async () => {
  let receivedPayload = null;
  const explicitPriorState = {
    task_type: 'plan_route',
    task_confidence: 0.88,
    constraints: {
      travel_mode: 'public_transport'
    }
  };
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async (payload) => {
      receivedPayload = payload;
      return {
        task_type: null,
        task_confidence: 0.2,
        constraints: {
          user_query: payload.input
        },
        clear_fields: [],
        clarification_needed: true,
        clarification_reason: 'intent_ambiguous',
        missing_required_fields: [],
        clarification_questions: [],
        next_agent: 'safe_clarify'
      };
    }
  });

  await handler({
    body: {
      user_query: '继续',
      priorState: explicitPriorState,
      previous_session_context: {
        trip_constraints: {
          pace_preference: 'compact'
        }
      }
    },
    headers: {},
    socket: {}
  }, {
    json() {}
  }, assert.fail);

  assert.equal(receivedPayload.priorState, explicitPriorState);
});

test('discovery query handler safely ignores malformed previous_session_context', async () => {
  let receivedPayload = null;
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async (payload) => {
      receivedPayload = payload;
      return {
        task_type: null,
        task_confidence: 0.2,
        constraints: {
          user_query: payload.input
        },
        clear_fields: [],
        clarification_needed: true,
        clarification_reason: 'intent_ambiguous',
        missing_required_fields: [],
        clarification_questions: [],
        next_agent: 'safe_clarify'
      };
    }
  });
  let jsonBody = null;

  await handler({
    body: {
      user_query: '换成轻松一点',
      previous_session_context: {
        trip_constraints: {}
      }
    },
    headers: {},
    socket: {}
  }, {
    json(body) {
      jsonBody = body;
    }
  }, assert.fail);

  assert.equal(jsonBody.code, 200);
  assert.equal(receivedPayload.priorState, null);
});

test('discovery query handler treats safe_clarify next_agent as Router clarify even when flag is false', async () => {
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async () => ({
      task_type: 'discover_options',
      task_confidence: 0.81,
      constraints: {
        user_query: 'help me choose',
        time_budget: null,
        travel_mode: null,
        pace_preference: null
      },
      clarification_needed: false,
      clarification_reason: 'missing_required_fields',
      missing_required_fields: ['time_budget'],
      clarification_questions: ['How many days do you plan to travel?'],
      next_agent: 'safe_clarify'
    }),
    runDecisionDiscoveryAgentService: async () => {
      assert.fail('Discovery agent should not run for Router safe_clarify output');
    },
    mergeTripContextService: () => {
      assert.fail('Trip Context Manager should not run for Router safe_clarify output');
    }
  });
  let jsonBody = null;
  const req = {
    body: {
      user_query: 'help me choose'
    },
    headers: {},
    socket: {}
  };
  const res = {
    json(body) {
      jsonBody = body;
    }
  };

  await handler(req, res, assert.fail);

  assert.equal(jsonBody.code, 200);
  assert.equal(jsonBody.data.next_agent, 'safe_clarify');
  assert.equal(jsonBody.data.clarification_needed, false);
  assert.equal(Object.hasOwn(jsonBody.data, 'ranked_options'), false);
  assert.equal(Object.hasOwn(jsonBody.data, 'session_context'), false);
});

test('discovery query with previous_session_context keeps candidate-less choice request in safe_clarify', async () => {
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async (payload) => {
      assert.equal(payload.priorState.task_type, 'discover_options');
      assert.equal(payload.priorState.constraints.destination_scope, '赣州');
      return {
        task_type: null,
        task_confidence: 0.25,
        constraints: {
          user_query: '帮我选一个'
        },
        clear_fields: [],
        clarification_needed: true,
        clarification_reason: 'intent_ambiguous',
        missing_required_fields: [],
        clarification_questions: [],
        next_agent: 'safe_clarify'
      };
    },
    runDecisionDiscoveryAgentService: async () => {
      assert.fail('Discovery agent should not run for candidate-less choice clarify');
    },
    mergeTripContextService: () => {
      assert.fail('Trip Context Manager should not run for candidate-less choice clarify');
    }
  });
  let jsonBody = null;

  await handler({
    body: {
      user_query: '帮我选一个',
      previous_session_context: {
        trip_constraints: {
          destination_scope: '赣州',
          pace_preference: 'relaxed'
        }
      }
    },
    headers: {},
    socket: {}
  }, {
    json(body) {
      jsonBody = body;
    }
  }, assert.fail);

  assert.equal(jsonBody.code, 200);
  assert.equal(jsonBody.data.next_agent, 'safe_clarify');
  assert.equal(jsonBody.data.clarification_needed, true);
  assert.equal(Object.hasOwn(jsonBody.data, 'session_context'), false);
});

test('discovery query clarifies empty discovery update without candidate context', async () => {
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async () => ({
      task_type: 'discover_options',
      task_confidence: 0.8,
      constraints: {
        user_query: 'help me choose',
        pace_preference: null,
        companions: [],
        time_budget: {}
      },
      clear_fields: [],
      clarification_needed: false,
      clarification_reason: null,
      missing_required_fields: [],
      clarification_questions: [],
      next_agent: 'decision_discovery'
    }),
    runDecisionDiscoveryAgentService: async () => {
      assert.fail('Discovery agent should not run for empty discovery update without candidates');
    },
    mergeTripContextService: () => {
      assert.fail('Trip Context Manager should not run for empty discovery update without candidates');
    }
  });
  let jsonBody = null;

  await handler({
    body: {
      user_query: 'help me choose',
      previous_session_context: {
        trip_constraints: {
          destination_scope: '赣州',
          pace_preference: 'relaxed'
        }
      },
      previous_public_result: null
    },
    headers: {},
    socket: {}
  }, {
    json(body) {
      jsonBody = body;
    }
  }, assert.fail);

  assert.equal(jsonBody.code, 200);
  assert.equal(jsonBody.data.next_agent, 'safe_clarify');
  assert.equal(jsonBody.data.clarification_needed, true);
  assert.equal(jsonBody.data.clarification_reason, 'missing_candidate_context');
  assert.match(jsonBody.data.clarification_questions[0], /候选项/);
  assert.equal(Object.hasOwn(jsonBody.data, 'session_context'), false);
});

test('discovery query allows candidate-backed empty discovery tasks', async () => {
  let discoveryCalled = false;
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async () => ({
      task_type: 'narrow_options',
      task_confidence: 0.8,
      constraints: {
        user_query: 'help me choose'
      },
      clear_fields: [],
      clarification_needed: false,
      clarification_reason: null,
      missing_required_fields: [],
      clarification_questions: [],
      next_agent: 'decision_discovery'
    }),
    runDecisionDiscoveryAgentService: async () => {
      discoveryCalled = true;
      return createDiscoveryOutput({
        task_type: 'narrow_options',
        result_status: 'ready'
      });
    }
  });
  let jsonBody = null;

  await handler({
    body: {
      user_query: 'help me choose',
      previous_session_context: {
        trip_constraints: {
          destination_scope: '赣州'
        }
      },
      previous_public_result: {
        ranked_options: [
          { option_key: 'scenic:1' },
          { option_key: 'scenic:2' }
        ]
      }
    },
    headers: {},
    socket: {}
  }, {
    json(body) {
      jsonBody = body;
    }
  }, assert.fail);

  assert.equal(discoveryCalled, true);
  assert.equal(jsonBody.code, 200);
  assert.equal(jsonBody.data.task_type, 'narrow_options');
  assert.ok(jsonBody.data.session_context);
});

test('discovery query ignores structured_events.locked_targets from request body', async () => {
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async () => ({
      task_type: 'discover_options',
      task_confidence: 0.9,
      constraints: {
        user_query: 'discover places',
        companions: ['elders']
      },
      clear_fields: [],
      clarification_needed: false,
      clarification_reason: null,
      missing_required_fields: [],
      clarification_questions: [],
      next_agent: 'decision_discovery'
    }),
    runDecisionDiscoveryAgentService: async () => createDiscoveryOutput()
  });
  let jsonBody = null;

  await handler({
    body: {
      user_query: 'discover places',
      structured_events: {
        locked_targets: ['scenic:1']
      }
    },
    headers: {},
    socket: {}
  }, {
    json(body) {
      jsonBody = body;
    }
  }, assert.fail);

  assert.deepEqual(jsonBody.data.session_context.trip_constraints.companions, ['elders']);
  assert.deepEqual(jsonBody.data.session_context.locked_targets, []);
});

test('discovery query carries session_context and clear_fields across turns', async () => {
  const routerOutputs = [
    {
      task_type: 'discover_options',
      task_confidence: 0.9,
      constraints: {
        user_query: 'weekend relaxed with elders',
        companions: ['elders'],
        pace_preference: 'relaxed'
      },
      clear_fields: [],
      clarification_needed: false,
      clarification_reason: null,
      missing_required_fields: [],
      clarification_questions: [],
      next_agent: 'decision_discovery'
    },
    {
      task_type: 'discover_options',
      task_confidence: 0.9,
      constraints: {
        user_query: 'no elders, compact pace',
        companions: null,
        pace_preference: 'compact'
      },
      clear_fields: ['companions'],
      clarification_needed: false,
      clarification_reason: null,
      missing_required_fields: [],
      clarification_questions: [],
      next_agent: 'decision_discovery'
    }
  ];
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async () => routerOutputs.shift(),
    runDecisionDiscoveryAgentService: async () => createDiscoveryOutput()
  });
  const responses = [];
  const createRes = () => ({
    json(body) {
      responses.push(body);
    }
  });

  await handler({
    body: {
      user_query: 'weekend relaxed with elders'
    },
    headers: {},
    socket: {}
  }, createRes(), assert.fail);

  await handler({
    body: {
      user_query: 'no elders, compact pace',
      previous_session_context: responses[0].data.session_context
    },
    headers: {},
    socket: {}
  }, createRes(), assert.fail);

  assert.deepEqual(responses[0].data.session_context.trip_constraints.companions, ['elders']);
  assert.equal(responses[0].data.session_context.trip_constraints.pace_preference, 'relaxed');
  assert.deepEqual(responses[1].data.session_context.trip_constraints.companions, []);
  assert.equal(responses[1].data.session_context.trip_constraints.pace_preference, 'compact');
});

test('discovery query keeps same-field substantive delta when clear_fields also includes the field', async () => {
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async () => ({
      task_type: 'discover_options',
      task_confidence: 0.9,
      constraints: {
        user_query: 'switch to nankang',
        destination_scope: 'nankang'
      },
      clear_fields: ['destination_scope'],
      clarification_needed: false,
      clarification_reason: null,
      missing_required_fields: [],
      clarification_questions: [],
      next_agent: 'decision_discovery'
    }),
    runDecisionDiscoveryAgentService: async (payload) => {
      assert.deepEqual(payload.constraints.destination_scope, ['nankang']);
      return createDiscoveryOutput();
    }
  });
  let jsonBody = null;

  await handler({
    body: {
      user_query: 'switch to nankang',
      previous_session_context: {
        trip_constraints: {
          destination_scope: 'zhanggong'
        }
      }
    },
    headers: {},
    socket: {}
  }, {
    json(body) {
      jsonBody = body;
    }
  }, assert.fail);

  assert.equal(jsonBody.data.session_context.trip_constraints.destination_scope, 'nankang');
});

test('discovery query tolerates invalid previous_session_context without 500', async () => {
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async () => ({
      task_type: 'discover_options',
      task_confidence: 0.9,
      constraints: {
        user_query: 'relaxed pace',
        pace_preference: 'relaxed'
      },
      clear_fields: [],
      clarification_needed: false,
      clarification_reason: null,
      missing_required_fields: [],
      clarification_questions: [],
      next_agent: 'decision_discovery'
    }),
    runDecisionDiscoveryAgentService: async () => createDiscoveryOutput()
  });
  let jsonBody = null;

  await handler({
    body: {
      user_query: 'relaxed pace',
      previous_session_context: 'bad-context'
    },
    headers: {},
    socket: {}
  }, {
    json(body) {
      jsonBody = body;
    }
  }, assert.fail);

  assert.equal(jsonBody.code, 200);
  assert.equal(jsonBody.data.session_context.trip_constraints.pace_preference, 'relaxed');
});

test('discovery query clear_fields time_budget does not carry old days', async () => {
  let receivedPayload = null;
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async () => ({
      task_type: 'discover_options',
      task_confidence: 0.9,
      constraints: {
        user_query: 'clear time budget',
        time_budget: null
      },
      clear_fields: ['time_budget'],
      clarification_needed: false,
      clarification_reason: null,
      missing_required_fields: [],
      clarification_questions: [],
      next_agent: 'decision_discovery'
    }),
    runDecisionDiscoveryAgentService: async (payload) => {
      receivedPayload = payload;
      return createDiscoveryOutput();
    }
  });
  let jsonBody = null;

  await handler({
    body: {
      user_query: 'clear time budget',
      previous_session_context: {
        trip_constraints: {
          time_budget: {
            days: 2
          }
        }
      }
    },
    headers: {},
    socket: {}
  }, {
    json(body) {
      jsonBody = body;
    }
  }, assert.fail);

  assert.equal(jsonBody.code, 200);
  assert.equal(receivedPayload.constraints.time_budget, null);
  assert.equal(jsonBody.data.session_context.trip_constraints.time_budget, null);
});
