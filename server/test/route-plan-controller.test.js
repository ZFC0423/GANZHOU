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
          task_type: 'plan_route',
          constraints: {
            locked_targets: []
          }
        }
      },
      session_context: {
        trip_constraints: {
          time_budget: null,
          travel_mode: null,
          companions: [],
          hard_avoidances: [],
          physical_constraints: [],
          pace_preference: null,
          route_origin: null,
          destination_scope: null,
          theme_preferences: []
        },
        selected_options: [],
        rejected_options: [],
        locked_targets: [],
        last_task_type: 'plan_route',
        last_agent: 'route_planner',
        last_result_status: null
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
  assert.equal(res.payload.data, null);
});

test('routePlanGenerate new protocol uses structured_events.locked_targets even when empty', async () => {
  let receivedPayload = null;
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async (payload) => {
      receivedPayload = payload;
      return {
        ok: true,
        value: {
          planning_status: 'generated'
        }
      };
    }
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      routerResult: {
        task_type: 'plan_route',
        constraints: {
          locked_targets: ['scenic:99']
        }
      },
      structured_events: {
        locked_targets: []
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.deepEqual(receivedPayload.routerResult.constraints.locked_targets, []);
  assert.deepEqual(res.payload.data.session_context.locked_targets, []);
});

test('routePlanGenerate filters invalid structured_events locked targets before service call', async () => {
  let receivedPayload = null;
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async (payload) => {
      receivedPayload = payload;
      return {
        ok: true,
        value: {
          planning_status: 'generated'
        }
      };
    }
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      routerResult: {
        task_type: 'plan_route',
        constraints: {}
      },
      structured_events: {
        locked_targets: ['article:1', 'scenic:2', 'scenic:2']
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.deepEqual(receivedPayload.routerResult.constraints.locked_targets, ['scenic:2']);
  assert.deepEqual(res.payload.data.session_context.locked_targets, ['scenic:2']);
});

test('routePlanGenerate legacy fallback uses normalized routerResult locked targets only without structured_events', async () => {
  let receivedPayload = null;
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async (payload) => {
      receivedPayload = payload;
      return {
        ok: true,
        value: {
          planning_status: 'generated'
        }
      };
    }
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      routerResult: {
        task_type: 'plan_route',
        constraints: {
          locked_targets: ['article:1', 'scenic:3', 'scenic:3']
        }
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.deepEqual(receivedPayload.routerResult.constraints.locked_targets, ['scenic:3']);
  assert.deepEqual(res.payload.data.session_context.locked_targets, ['scenic:3']);
});

test('routePlanGenerate preserves router constraints when previous_session_context is absent', async () => {
  let receivedPayload = null;
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async (payload) => {
      receivedPayload = payload;
      return {
        ok: true,
        value: {
          planning_status: 'generated'
        }
      };
    }
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      routerResult: {
        task_type: 'plan_route',
        constraints: {
          companions: ['elders'],
          pace_preference: 'relaxed',
          locked_targets: ['scenic:3']
        }
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.deepEqual(receivedPayload.routerResult.constraints.companions, ['elders']);
  assert.equal(receivedPayload.routerResult.constraints.pace_preference, 'relaxed');
  assert.deepEqual(receivedPayload.routerResult.constraints.locked_targets, ['scenic:3']);
});

test('routePlanGenerate merges routerResult constraints into session_context', async () => {
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async () => ({
      ok: true,
      value: {
        planning_status: 'generated'
      }
    })
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      routerResult: {
        task_type: 'plan_route',
        constraints: {
          pace_preference: 'compact'
        }
      },
      structured_events: {
        locked_targets: []
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.equal(res.payload.data.session_context.trip_constraints.pace_preference, 'compact');
});

test('routePlanGenerate applies routerResult clear_fields to previous session constraints', async () => {
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async () => ({
      ok: true,
      value: {
        planning_status: 'generated'
      }
    })
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      previous_session_context: {
        trip_constraints: {
          companions: ['elders']
        }
      },
      routerResult: {
        task_type: 'plan_route',
        clear_fields: ['companions'],
        constraints: {}
      },
      structured_events: {
        locked_targets: []
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.deepEqual(res.payload.data.session_context.trip_constraints.companions, []);
});

test('routePlanGenerate clear_fields prevents stale route constraints from reviving cleared pace', async () => {
  let receivedPayload = null;
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async (payload) => {
      receivedPayload = payload;
      return {
        ok: true,
        value: {
          planning_status: 'generated'
        }
      };
    }
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      previous_session_context: {
        trip_constraints: {
          pace_preference: 'relaxed'
        }
      },
      routerResult: {
        task_type: 'plan_route',
        clear_fields: ['pace_preference'],
        constraints: {
          pace_preference: 'relaxed'
        }
      },
      structured_events: {
        locked_targets: []
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.notEqual(receivedPayload.routerResult.constraints.pace_preference, 'relaxed');
  assert.equal(receivedPayload.routerResult.constraints.pace_preference, null);
  assert.equal(res.payload.data.session_context.trip_constraints.pace_preference, null);
});

test('routePlanGenerate keeps locked_targets out of trip_constraints', async () => {
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async () => ({
      ok: true,
      value: {
        planning_status: 'generated'
      }
    })
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      routerResult: {
        task_type: 'plan_route',
        constraints: {
          locked_targets: ['scenic:1']
        }
      },
      structured_events: {
        locked_targets: ['scenic:2']
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.equal(Object.hasOwn(res.payload.data.session_context.trip_constraints, 'locked_targets'), false);
  assert.deepEqual(res.payload.data.session_context.locked_targets, ['scenic:2']);
});

test('routePlanGenerate clear_fields prevents stale time_budget days from reaching service', async () => {
  let receivedPayload = null;
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async (payload) => {
      receivedPayload = payload;
      return {
        ok: true,
        value: {
          planning_status: 'generated'
        }
      };
    }
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      previous_session_context: {
        trip_constraints: {
          time_budget: {
            days: 2
          }
        }
      },
      routerResult: {
        task_type: 'plan_route',
        clear_fields: ['time_budget'],
        constraints: {
          time_budget: {
            days: 2
          }
        }
      },
      structured_events: {
        locked_targets: []
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.notDeepEqual(receivedPayload.routerResult.constraints.time_budget, { days: 2 });
  assert.equal(receivedPayload.routerResult.constraints.time_budget, null);
  assert.equal(res.payload.data.session_context.trip_constraints.time_budget, null);
});

test('routePlanGenerate strips session time_budget date_text before Route Planner service', async () => {
  let receivedPayload = null;
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async (payload) => {
      receivedPayload = payload;
      return {
        ok: true,
        value: {
          planning_status: 'generated'
        }
      };
    }
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      previous_session_context: {
        trip_constraints: {
          time_budget: {
            date_text: '周末'
          }
        }
      },
      routerResult: {
        task_type: 'plan_route',
        constraints: {
          time_budget: {
            days: 1
          }
        }
      },
      structured_events: {
        locked_targets: []
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.deepEqual(receivedPayload.routerResult.constraints.time_budget, { days: 1 });
  assert.equal(Object.hasOwn(receivedPayload.routerResult.constraints.time_budget, 'date_text'), false);
});

test('routePlanGenerate structured_events wins over routerResult locked targets when both exist', async () => {
  let receivedPayload = null;
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async (payload) => {
      receivedPayload = payload;
      return {
        ok: true,
        value: {
          planning_status: 'generated'
        }
      };
    }
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      routerResult: {
        task_type: 'plan_route',
        constraints: {
          locked_targets: ['scenic:9']
        }
      },
      structured_events: {
        locked_targets: ['scenic:4']
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.deepEqual(receivedPayload.routerResult.constraints.locked_targets, ['scenic:4']);
  assert.deepEqual(res.payload.data.session_context.locked_targets, ['scenic:4']);
});

test('routePlanGenerate does not infer or mutate selected and rejected event state', async () => {
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async () => ({
      ok: true,
      value: {
        planning_status: 'generated'
      }
    })
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      previous_session_context: {
        selected_options: ['scenic:5'],
        rejected_options: ['scenic:6'],
        locked_targets: ['scenic:7'],
        trip_constraints: {}
      },
      routerResult: {
        task_type: 'plan_route',
        constraints: {}
      },
      structured_events: {
        selected_options: ['scenic:1'],
        rejected_options: ['scenic:2'],
        clear_selected_options: true,
        clear_rejected_options: true,
        locked_targets: ['scenic:8']
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.deepEqual(res.payload.data.session_context.selected_options, ['scenic:5']);
  assert.deepEqual(res.payload.data.session_context.rejected_options, ['scenic:6']);
  assert.deepEqual(res.payload.data.session_context.locked_targets, ['scenic:8']);
});

test('business failed plan returns session_context', async () => {
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async () => ({
      ok: true,
      value: {
        planning_status: 'failed',
        warnings: []
      }
    })
  });
  const res = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      routerResult: {
        task_type: 'plan_route',
        constraints: {}
      },
      structured_events: {
        locked_targets: ['scenic:404']
      }
    },
    headers: {},
    socket: {}
  }, res, assert.fail);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.data.planning_status, 'failed');
  assert.equal(res.payload.data.session_context.last_result_status, 'failed');
  assert.deepEqual(res.payload.data.session_context.locked_targets, ['scenic:404']);
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
