import test from 'node:test';
import assert from 'node:assert/strict';

import { createRoutePlannerAgent } from '../src/services/ai/route-planner-agent/index.js';
import { createGenerateRoutePlanEntry } from '../src/services/ai/route-planner-agent/generate-entry.js';
import {
  createSpatialDiagnosticsCollector,
  sanitizeSpatialDiagnosticsDebugSnapshot
} from '../src/services/ai/route-planner-agent/spatial-debug-diagnostics.js';
import { assertPublicRoutePlanContract } from '../src/services/ai/route-planner-agent/validate.js';

function createGeneratePayload(constraints = {}) {
  return {
    routerResult: {
      task_type: 'plan_route',
      task_confidence: 0.9,
      clarification_needed: false,
      clarification_reason: null,
      missing_required_fields: [],
      clarification_questions: [],
      next_agent: 'ai_trip',
      constraints: {
        user_query: 'generate a route',
        time_budget: { days: 1 },
        travel_mode: 'self_drive',
        pace_preference: 'relaxed',
        theme_preferences: ['heritage'],
        companions: [],
        hard_avoidances: [],
        physical_constraints: [],
        route_origin: null,
        destination_scope: null,
        locked_targets: [],
        ...constraints
      }
    }
  };
}

function scenicCandidate(id, overrides = {}) {
  return {
    item_key: `scenic:${id}`,
    source_type: 'scenic',
    source_id: id,
    title: `spot ${id}`,
    region_key: 'zhanggong',
    family_friendly: true,
    tags: ['heritage'],
    category_code: 'scenic_history',
    route_label: '',
    walking_intensity: 'light',
    recommend_flag: 1,
    hot_score: 90 - id,
    matched_by: ['theme_preferences'],
    score: 20,
    direct_hit: true,
    is_locked: false,
    is_route_item: true,
    record: {},
    ...overrides
  };
}

function createRetrievalResult() {
  const candidates = [
    scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
    scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 })
  ];

  return {
    mode: 'primary',
    candidates,
    scenic_candidates: candidates,
    article_candidates: [],
    warnings: [],
    diagnostics: []
  };
}

function createDebugEvent(overrides = {}) {
  return {
    map_enrichment: {
      status: 'estimated',
      provider: 'mock',
      fallback_used: true,
      segments: [
        {
          mode: 'driving',
          distance_meters: 60000,
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
          distance_meters: 60000,
          duration_seconds: 5000,
          estimated: true,
          ak: 'fake-ak',
          requestUrl: 'https://api.map.baidu.com/xxx?ak=fake-ak',
          rawPayload: { secret: 'x' }
        }
      ],
      diagnostics: {
        checked_segments: 1,
        estimated_segments: 1
      }
    },
    ak: 'fake-ak',
    token: 'fake-token',
    requestUrl: 'https://api.map.baidu.com/xxx?ak=fake-ak',
    rawPayload: { secret: 'x' },
    rawError: { stack: 'stack text' },
    headers: { authorization: 'Bearer x' },
    userQuery: '用户原始问题',
    ...overrides
  };
}

test('spatial debug sanitizer rebuilds a safe summary without sensitive fields', () => {
  const snapshot = sanitizeSpatialDiagnosticsDebugSnapshot(createDebugEvent());
  const serialized = JSON.stringify(snapshot);

  assert.equal(snapshot.enabled, true);
  assert.equal(snapshot.provider, 'mock');
  assert.equal(snapshot.spatial_warning_count, 1);
  assert.equal(snapshot.warnings[0].code, 'route_segment_too_far');
  assert.doesNotMatch(serialized, /fake-ak/);
  assert.doesNotMatch(serialized, /fake-token/);
  assert.doesNotMatch(serialized, /api\.map\.baidu\.com/);
  assert.doesNotMatch(serialized, /authorization/);
  assert.doesNotMatch(serialized, /用户原始问题/);
  assert.doesNotMatch(serialized, /stack text/);
  assert.doesNotMatch(serialized, /rawPayload|rawError|headers/);
});

test('spatial debug sanitizer and collector tolerate cyclic input and throwing getters', () => {
  const cyclic = {};
  cyclic.self = cyclic;

  const throwingGetter = {};
  Object.defineProperty(throwingGetter, 'rawPayload', {
    get() {
      throw new Error('getter exploded');
    }
  });
  Object.defineProperty(throwingGetter, 'map_enrichment', {
    get() {
      throw new Error('getter exploded');
    }
  });

  assert.doesNotThrow(() => sanitizeSpatialDiagnosticsDebugSnapshot(cyclic));
  assert.doesNotThrow(() => sanitizeSpatialDiagnosticsDebugSnapshot(throwingGetter));

  const collector = createSpatialDiagnosticsCollector();
  assert.doesNotThrow(() => collector.record(cyclic));
  assert.doesNotThrow(() => collector.record(throwingGetter));
  assert.doesNotMatch(JSON.stringify(collector.getSnapshot()), /getter exploded|stack|rawPayload/);
});

test('spatial debug collector ignores late writes after terminal timeout snapshot', () => {
  const collector = createSpatialDiagnosticsCollector();
  collector.record({
    map_enrichment: {
      status: 'unavailable',
      provider: 'local',
      segments: []
    },
    spatial_validation: {
      status: 'unavailable',
      issues: [],
      diagnostics: {
        skip_reason: 'spatial_diagnostics_timeout'
      }
    },
    terminal: true
  });
  const timeoutSnapshot = collector.getSnapshot();

  collector.record(createDebugEvent());

  assert.deepEqual(collector.getSnapshot(), timeoutSnapshot);
  assert.equal(collector.getSnapshot().skipped_reason, 'spatial_diagnostics_timeout');
});

test('generate route entry remains compatible with missing and invalid spatial collector options', async () => {
  const entry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult(),
    spatialDiagnosticsSink: async () => {},
    mapEnrichment: async () => ({
      status: 'estimated',
      provider: 'mock',
      fallback_used: true,
      segments: []
    })
  });
  const payload = createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2'] });

  for (const options of [undefined, {}, { spatialDiagnosticsCollector: null }, { spatialDiagnosticsCollector: 'not-a-function' }]) {
    const result = await entry(payload, options);
    assert.equal(result.ok, true);
    assert.doesNotThrow(() => assertPublicRoutePlanContract(result.value));
    assert.equal(Object.hasOwn(result.value, '_debug'), false);
    assert.equal(Object.hasOwn(result.value, 'map_enrichment'), false);
    assert.equal(Object.hasOwn(result.value, 'spatial_validation'), false);
  }

  const agent = createRoutePlannerAgent({ generateEntry: entry });
  const agentResult = await agent.generateRoutePlan(payload);
  assert.equal(agentResult.ok, true);
  assert.doesNotThrow(() => assertPublicRoutePlanContract(agentResult.value));
});

test('spatial diagnostics collector and sink failures do not affect generate route entry', async () => {
  const entry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult(),
    spatialDiagnosticsSink: async () => {
      throw new Error('sink failed');
    },
    mapEnrichment: async () => createDebugEvent().map_enrichment
  });

  const result = await entry(createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2'] }), {
    spatialDiagnosticsCollector: () => {
      throw new Error('collector failed');
    }
  });

  assert.equal(result.ok, true);
  assert.doesNotThrow(() => assertPublicRoutePlanContract(result.value));
});

test('spatial debug collector observes diagnostics without increasing enrichment calls', async () => {
  let mapCallsWithoutCollector = 0;
  let mapCallsWithCollector = 0;
  const payload = createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2'] });
  const baseDependencies = {
    retrieve: async () => createRetrievalResult(),
    spatialDiagnosticsSink: async () => {},
    spatialValidation: () => createDebugEvent().spatial_validation
  };
  const entryWithoutCollector = createGenerateRoutePlanEntry({
    ...baseDependencies,
    mapEnrichment: async () => {
      mapCallsWithoutCollector += 1;
      return createDebugEvent().map_enrichment;
    }
  });
  const entryWithCollector = createGenerateRoutePlanEntry({
    ...baseDependencies,
    mapEnrichment: async () => {
      mapCallsWithCollector += 1;
      return createDebugEvent().map_enrichment;
    }
  });
  const collector = createSpatialDiagnosticsCollector();

  const withoutCollector = await entryWithoutCollector(payload);
  const withCollector = await entryWithCollector(payload, {
    spatialDiagnosticsCollector: (event) => collector.record(event)
  });

  assert.equal(withoutCollector.ok, true);
  assert.equal(withCollector.ok, true);
  assert.equal(mapCallsWithoutCollector, 1);
  assert.equal(mapCallsWithCollector, 1);
  assert.equal(collector.getSnapshot().spatial_warning_count, 1);
});

test('spatial diagnostics timeout records terminal debug snapshot and blocks late overwrite', async () => {
  const collector = createSpatialDiagnosticsCollector();
  const entry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult(),
    spatialDiagnosticsSink: async () => {},
    mapEnrichment: async () => new Promise(() => {}),
    spatialDiagnosticsTimeoutMs: 1
  });

  const result = await entry(createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2'] }), {
    spatialDiagnosticsCollector: (event) => collector.record(event)
  });
  const timeoutSnapshot = collector.getSnapshot();
  collector.record(createDebugEvent());

  assert.equal(result.ok, true);
  assert.equal(timeoutSnapshot.skipped_reason, 'spatial_diagnostics_timeout');
  assert.deepEqual(collector.getSnapshot(), timeoutSnapshot);
});
