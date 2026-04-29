import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRequestMeta,
  createRoutePlanHandlers,
  shouldExposeSpatialDiagnosticsDebug
} from '../src/controllers/front/ai.controller.js';

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

function restoreEnvValue(key, originalValue, existed) {
  if (existed) {
    process.env[key] = originalValue;
  } else {
    delete process.env[key];
  }
}

function createDebugEvent(distanceMeters = 60000) {
  return {
    map_enrichment: {
      status: 'estimated',
      provider: 'mock',
      fallback_used: true,
      segments: [
        {
          mode: 'driving',
          distance_meters: distanceMeters,
          duration_seconds: 5000,
          estimated: true,
          source_status: 'estimated',
          provider: 'mock'
        }
      ]
    },
    spatial_validation: {
      status: 'warning',
      issues: [
        {
          code: 'route_segment_too_far',
          mode: 'driving',
          distance_meters: distanceMeters,
          duration_seconds: 5000,
          estimated: true
        }
      ],
      diagnostics: {
        checked_segments: 1,
        estimated_segments: 1
      }
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

test('spatial diagnostics debug gate is disabled by default and forced off in production', () => {
  assert.equal(shouldExposeSpatialDiagnosticsDebug({
    req: {
      headers: {},
      query: {}
    },
    env: {
      NODE_ENV: 'development'
    }
  }), false);

  assert.equal(shouldExposeSpatialDiagnosticsDebug({
    req: {
      headers: {},
      query: {
        debug_spatial_diagnostics: '1'
      }
    },
    env: {
      NODE_ENV: 'development'
    }
  }), true);

  assert.equal(shouldExposeSpatialDiagnosticsDebug({
    req: {
      headers: {
        'x-debug-spatial-diagnostics': '1'
      },
      query: {}
    },
    env: {
      NODE_ENV: 'test'
    }
  }), true);

  assert.equal(shouldExposeSpatialDiagnosticsDebug({
    req: {
      headers: {
        'x-debug-spatial-diagnostics': '1'
      },
      query: {
        debug_spatial_diagnostics: '1'
      }
    },
    env: {
      NODE_ENV: 'production'
    }
  }), false);
});

test('spatial diagnostics NODE_ENV production test restores originally missing env key', () => {
  const outerHadNodeEnv = Object.prototype.hasOwnProperty.call(process.env, 'NODE_ENV');
  const outerNodeEnv = process.env.NODE_ENV;

  try {
    delete process.env.NODE_ENV;
    const hadNodeEnv = Object.prototype.hasOwnProperty.call(process.env, 'NODE_ENV');
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = 'production';
      assert.equal(shouldExposeSpatialDiagnosticsDebug({
        req: {
          headers: {
            'x-debug-spatial-diagnostics': '1'
          },
          query: {
            debug_spatial_diagnostics: '1'
          }
        }
      }), false);
    } finally {
      restoreEnvValue('NODE_ENV', originalNodeEnv, hadNodeEnv);
    }

    assert.equal(Object.prototype.hasOwnProperty.call(process.env, 'NODE_ENV'), false);
  } finally {
    restoreEnvValue('NODE_ENV', outerNodeEnv, outerHadNodeEnv);
  }
});

test('routePlanGenerate does not expose spatial diagnostics without debug query or header', async () => {
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async (payload, options) => {
      assert.equal(options.spatialDiagnosticsCollector, null);
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
      }
    },
    headers: {},
    query: {},
    socket: {}
  }, res, assert.fail);

  assert.equal(Object.hasOwn(res.payload.data, '_debug'), false);
  assert.equal(Object.hasOwn(res.payload.data, '_meta'), false);
  assert.equal(Object.hasOwn(res.payload.data, 'map_enrichment'), false);
  assert.equal(Object.hasOwn(res.payload.data, 'spatial_validation'), false);
});

test('routePlanGenerate exposes sanitized spatial diagnostics for query debug gate', async () => {
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async (payload, options) => {
      options.spatialDiagnosticsCollector(createDebugEvent());
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
      }
    },
    headers: {},
    query: {
      debug_spatial_diagnostics: '1'
    },
    socket: {}
  }, res, assert.fail);

  const snapshot = res.payload.data._debug.spatial_diagnostics;
  const serialized = JSON.stringify(snapshot);
  assert.equal(snapshot.provider, 'mock');
  assert.equal(snapshot.spatial_warning_count, 1);
  assert.equal(snapshot.warnings[0].distance_meters, 60000);
  assert.doesNotMatch(serialized, /ak|api\.map\.baidu\.com|authorization|rawPayload|rawError|headers|stack|userQuery/i);
});

test('routePlanGenerate exposes sanitized spatial diagnostics for header debug gate', async () => {
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async (payload, options) => {
      options.spatialDiagnosticsCollector(createDebugEvent(61000));
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
      }
    },
    headers: {
      'x-debug-spatial-diagnostics': '1'
    },
    query: {},
    socket: {}
  }, res, assert.fail);

  assert.equal(res.payload.data._debug.spatial_diagnostics.warnings[0].distance_meters, 61000);
});

test('routePlanGenerate does not create collector or expose debug response in production', async () => {
  const hadNodeEnv = Object.prototype.hasOwnProperty.call(process.env, 'NODE_ENV');
  const originalNodeEnv = process.env.NODE_ENV;
  let collectorCreated = false;

  try {
    process.env.NODE_ENV = 'production';
    const handlers = createRoutePlanHandlers({
      createSpatialDiagnosticsCollectorService: () => {
        collectorCreated = true;
        throw new Error('collector should not be created in production');
      },
      generateRoutePlanService: async (payload, options) => {
        assert.equal(options.spatialDiagnosticsCollector, null);
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
        }
      },
      headers: {
        'x-debug-spatial-diagnostics': '1'
      },
      query: {
        debug_spatial_diagnostics: '1'
      },
      socket: {}
    }, res, assert.fail);

    assert.equal(collectorCreated, false);
    assert.equal(Object.hasOwn(res.payload.data, '_debug'), false);
  } finally {
    restoreEnvValue('NODE_ENV', originalNodeEnv, hadNodeEnv);
  }
});

test('routePlanGenerate passes spatial diagnostics through a safe wrapper callback', async () => {
  const collector = {
    events: [],
    finalized: false,
    record(event) {
      this.events.push(event);
    },
    getSnapshot() {
      return {
        enabled: true,
        provider: 'mock',
        real_call_used: false,
        cache_status: 'unknown',
        enriched_segment_count: this.events.length,
        scanned_pair_count: 0,
        skipped_reason: null,
        spatial_warning_count: 0,
        warnings: []
      };
    },
    finalize() {
      this.finalized = true;
    }
  };
  const handlers = createRoutePlanHandlers({
    createSpatialDiagnosticsCollectorService: () => collector,
    generateRoutePlanService: async (payload, options) => {
      options.spatialDiagnosticsCollector({ ok: true });
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
      }
    },
    headers: {
      'x-debug-spatial-diagnostics': '1'
    },
    query: {},
    socket: {}
  }, res, assert.fail);

  assert.equal(collector.events.length, 1);
  assert.equal(collector.finalized, true);
  assert.equal(res.payload.data._debug.spatial_diagnostics.enriched_segment_count, 1);
});

test('routePlanGenerate keeps request-scoped spatial collectors isolated', async () => {
  const handlers = createRoutePlanHandlers({
    generateRoutePlanService: async (payload, options) => {
      if (typeof options.spatialDiagnosticsCollector === 'function') {
        const distance = payload.routerResult.constraints.locked_targets[0] === 'scenic:1' ? 11111 : 22222;
        options.spatialDiagnosticsCollector(createDebugEvent(distance));
      }
      return {
        ok: true,
        value: {
          planning_status: 'generated'
        }
      };
    }
  });

  const resA = createMockResponse();
  const resB = createMockResponse();
  const resNoDebug = createMockResponse();

  await handlers.routePlanGenerate({
    body: {
      routerResult: {
        task_type: 'plan_route',
        constraints: {}
      },
      structured_events: {
        locked_targets: ['scenic:1']
      }
    },
    headers: {
      'x-debug-spatial-diagnostics': '1'
    },
    query: {},
    socket: {}
  }, resA, assert.fail);

  await handlers.routePlanGenerate({
    body: {
      routerResult: {
        task_type: 'plan_route',
        constraints: {}
      },
      structured_events: {
        locked_targets: ['scenic:2']
      }
    },
    headers: {
      'x-debug-spatial-diagnostics': '1'
    },
    query: {},
    socket: {}
  }, resB, assert.fail);

  await handlers.routePlanGenerate({
    body: {
      routerResult: {
        task_type: 'plan_route',
        constraints: {}
      }
    },
    headers: {},
    query: {},
    socket: {}
  }, resNoDebug, assert.fail);

  assert.equal(resA.payload.data._debug.spatial_diagnostics.warnings[0].distance_meters, 11111);
  assert.equal(resB.payload.data._debug.spatial_diagnostics.warnings[0].distance_meters, 22222);
  assert.equal(Object.hasOwn(resNoDebug.payload.data, '_debug'), false);
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
