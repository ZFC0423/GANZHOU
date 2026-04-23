import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRequestMeta, createRoutePlanHandlers } from '../src/controllers/front/ai.controller.js';

function createMockResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

test('buildRequestMeta preserves explicit x-trace-id and forwarded ip', () => {
  const requestMeta = buildRequestMeta({
    headers: {
      'x-trace-id': 'trace-from-header',
      'x-forwarded-for': '203.0.113.10, 10.0.0.1',
      'user-agent': 'route-test-agent'
    },
    ip: '127.0.0.1',
    socket: {
      remoteAddress: '127.0.0.1'
    }
  });

  assert.deepEqual(requestMeta, {
    trace_id: 'trace-from-header',
    ip: '203.0.113.10',
    user_agent: 'route-test-agent'
  });
});

test('routePlanGenerate passes generated trace_id through requestMeta when header is missing', async () => {
  let receivedOptions = null;
  const handlers = createRoutePlanHandlers({
    createTraceId: () => 'generated-trace-id',
    generateRoutePlanService: async (payload, options) => {
      receivedOptions = options;
      return {
        ok: true,
        value: {
          payload
        }
      };
    }
  });

  const res = createMockResponse();

  await handlers.routePlanGenerate(
    {
      body: {
        routerResult: {
          task_type: 'plan_route'
        }
      },
      headers: {
        'user-agent': 'route-test-agent'
      },
      ip: '127.0.0.5',
      socket: {
        remoteAddress: '127.0.0.5'
      }
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(receivedOptions.requestMeta.trace_id, 'generated-trace-id');
  assert.equal(receivedOptions.requestMeta.ip, '127.0.0.5');
  assert.equal(receivedOptions.requestMeta.user_agent, 'route-test-agent');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, {
    code: 200,
    message: 'success',
    data: {
      payload: {
        routerResult: {
          task_type: 'plan_route'
        }
      }
    }
  });
});

test('routePlanGenerate maps failed service results to sendError response', async () => {
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async () => ({
      ok: false,
      error: {
        message: 'bad generate payload',
        httpStatus: 422
      }
    })
  });

  const res = createMockResponse();

  await handlers.routePlanGenerate(
    {
      body: {
        routerResult: {}
      },
      headers: {},
      ip: '127.0.0.6',
      socket: {
        remoteAddress: '127.0.0.6'
      }
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 422);
  assert.deepEqual(res.payload, {
    code: 422,
    message: 'bad generate payload',
    data: null
  });
});

test('routePlanRevise preserves x-trace-id when calling service entry', async () => {
  let receivedOptions = null;
  const handlers = createRoutePlanHandlers({
    reviseRoutePlanService: async (payload, options) => {
      receivedOptions = {
        payload,
        options
      };
      return {
        ok: false,
        error: {
          message: 'bad revise payload',
          httpStatus: 400
        }
      };
    }
  });

  const res = createMockResponse();

  await handlers.routePlanRevise(
    {
      body: {
        previous_public_plan: {},
        previous_plan_context: {},
        action: {}
      },
      headers: {
        'x-trace-id': 'trace-from-header',
        'user-agent': 'route-test-agent'
      },
      ip: '127.0.0.7',
      socket: {
        remoteAddress: '127.0.0.7'
      }
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(receivedOptions.options.requestMeta.trace_id, 'trace-from-header');
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, 400);
  assert.equal(res.payload.message, 'bad revise payload');
});

test('routePlanRevise maps successful service results to sendSuccess response', async () => {
  let receivedOptions = null;
  const handlers = createRoutePlanHandlers({
    reviseRoutePlanService: async (payload, options) => {
      receivedOptions = {
        payload,
        options
      };
      return {
        ok: true,
        value: {
          planning_status: 'revised',
          plan_context: {
            version: 2
          }
        }
      };
    }
  });

  const res = createMockResponse();

  await handlers.routePlanRevise(
    {
      body: {
        previous_public_plan: {
          task_type: 'plan_route'
        },
        previous_plan_context: {
          version: 1
        },
        action: {
          type: 'compress_to_one_day'
        }
      },
      headers: {
        'x-trace-id': 'trace-from-header'
      },
      ip: '127.0.0.8',
      socket: {
        remoteAddress: '127.0.0.8'
      }
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(receivedOptions.options.requestMeta.trace_id, 'trace-from-header');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, {
    code: 200,
    message: 'success',
    data: {
      planning_status: 'revised',
      plan_context: {
        version: 2
      }
    }
  });
});
