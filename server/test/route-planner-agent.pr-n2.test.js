import test from 'node:test';
import assert from 'node:assert/strict';

import { buildNarrativeInput } from '../src/services/ai/route-planner-agent/prompt.js';
import { buildInternalBasis, buildPublicBasis } from '../src/services/ai/route-planner-agent/basis.js';
import { createCoordinateResolver } from '../src/services/ai/route-planner-agent/coordinate-context.js';
import { createGenerateRoutePlanEntry } from '../src/services/ai/route-planner-agent/generate-entry.js';
import { createMapEnrichment } from '../src/services/ai/route-planner-agent/map-enrichment.js';
import { collectRouteCandidates, retrieveRouteCandidates, ROUTE_RETRIEVAL_PRIVATE } from '../src/services/ai/route-planner-agent/retrieve.js';
import { assertPublicRoutePlanContract } from '../src/services/ai/route-planner-agent/validate.js';

const COORDINATE_FIELDS = ['latitude', 'longitude', 'coordinate_source', 'coordinate_precision'];

function createSnapshot(overrides = {}) {
  return {
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
    family_friendly_only: false,
    same_region_only: false,
    focused_region_key: null,
    avoid_far_spots: false,
    ...overrides
  };
}

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
        user_query: 'generate route',
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

function scenicRecord(id, overrides = {}) {
  return {
    id,
    category_id: 10,
    name: `spot ${id}`,
    region: 'Zhanggong',
    tags: 'heritage',
    intro: 'heritage route spot',
    culture_desc: 'heritage culture',
    family_friendly: 1,
    route_label: 'heritage label',
    walking_intensity: 'light',
    recommend_flag: 1,
    hot_score: 90 - id,
    status: 1,
    latitude: null,
    longitude: null,
    coordinate_source: null,
    coordinate_precision: null,
    category: { id: 1, code: 'scenic_history', name: 'History Scenic' },
    ...overrides
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
    coordinates: {
      lat: 25.8 + id / 1000,
      lng: 114.9 + id / 1000,
      source: 'manual',
      precision: 'exact'
    },
    ...overrides
  };
}

function createRetrievalResult(candidates) {
  return {
    mode: 'primary',
    candidates,
    scenic_candidates: candidates,
    article_candidates: [],
    warnings: [],
    diagnostics: []
  };
}

function assertCoordinateAttributes(query) {
  assert.ok(query.attributes);
  assert.ok(Array.isArray(query.attributes.include));

  for (const field of COORDINATE_FIELDS) {
    assert.ok(query.attributes.include.includes(field), `${field} should be explicitly included`);
  }
}

test('route planner scenic retrieval appends coordinate attributes without dropping business query shape', async () => {
  const calls = [];
  const scenicModel = {
    findAll: async (query) => {
      calls.push(query);
      return [
        scenicRecord(1, {
          latitude: '25.8292000',
          longitude: '114.9336000',
          coordinate_source: 'manual',
          coordinate_precision: 'exact'
        })
      ];
    }
  };

  const result = await retrieveRouteCandidates({
    constraintsSnapshot: createSnapshot(),
    scenicModel,
    articleModel: { findAll: async () => [] }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].where.status, 1);
  assert.equal(calls[0].include[0].as, 'category');
  assert.deepEqual(calls[0].include[0].attributes, ['id', 'name', 'code']);
  assert.deepEqual(calls[0].order, [['recommend_flag', 'DESC'], ['hot_score', 'DESC'], ['id', 'ASC']]);
  assert.equal(calls[0].limit, 40);
  assertCoordinateAttributes(calls[0]);

  const candidate = result.candidates[0];
  assert.equal(candidate.item_key, 'scenic:1');
  assert.equal(candidate.source_id, 1);
  assert.equal(candidate.category_code, 'scenic_history');
  assert.equal(candidate.record.category_id, 10);
  assert.equal(candidate.record.status, 1);
  assert.deepEqual(candidate.coordinates, {
    lat: 25.8292,
    lng: 114.9336,
    source: 'manual',
    precision: 'exact'
  });
});

test('route planner retrieval degrades safely when a stale database lacks coordinate columns', async () => {
  const calls = [];
  const scenicModel = {
    findAll: async (query) => {
      calls.push(query);
      if (query.attributes?.include?.includes('latitude')) {
        throw new Error("Unknown column 'ScenicSpot.latitude' in 'field list'");
      }

      return [scenicRecord(8)];
    }
  };

  const result = await retrieveRouteCandidates({
    constraintsSnapshot: createSnapshot(),
    scenicModel,
    articleModel: { findAll: async () => [] }
  });

  assert.equal(calls.length, 2);
  assertCoordinateAttributes(calls[0]);
  assert.equal(Object.hasOwn(calls[1], 'attributes'), false);
  assert.equal(calls[1].where.status, 1);
  assert.equal(result.candidates[0].item_key, 'scenic:8');
  assert.equal(result.candidates[0].coordinates, null);
});

test('locked target retrieval also appends coordinate attributes and preserves displayability checks', async () => {
  const calls = [];
  const result = await retrieveRouteCandidates({
    constraintsSnapshot: createSnapshot({ locked_targets: ['scenic:2'] }),
    scenicModel: {
      findAll: async (query) => {
        calls.push(query);
        if (query.where.id) {
          return [
            scenicRecord(2, {
              latitude: 25.83,
              longitude: 114.94,
              coordinate_source: 'seed',
              coordinate_precision: 'scenic_area'
            })
          ];
        }

        return [];
      }
    },
    articleModel: { findAll: async () => [] }
  });

  assert.equal(calls.length, 2);
  assert.equal(Object.hasOwn(calls[0].where, 'status'), false);
  assert.ok(calls[0].where.id);
  assertCoordinateAttributes(calls[0]);
  assert.equal(calls[1].where.status, 1);
  assertCoordinateAttributes(calls[1]);
  assert.equal(result.candidates[0].is_locked, true);
  assert.deepEqual(result.candidates[0].coordinates, {
    lat: 25.83,
    lng: 114.94,
    source: 'seed',
    precision: 'scenic_area'
  });
});

test('candidate coordinates are plain snapshots and candidate construction does not mutate records', () => {
  const record = scenicRecord(3, {
    latitude: '25.83',
    longitude: '114.94',
    coordinate_source: 'unexpected',
    coordinate_precision: 'unexpected',
    dataValues: {}
  });

  const result = collectRouteCandidates({
    scenicRecords: [record],
    articleRecords: [],
    constraintsSnapshot: createSnapshot(),
    mode: 'primary'
  });

  const candidate = result.candidates[0];
  assert.deepEqual(candidate.coordinates, {
    lat: 25.83,
    lng: 114.94,
    source: 'unknown',
    precision: 'unknown'
  });
  assert.equal(Object.hasOwn(record, 'coordinates'), false);
  assert.equal(Object.hasOwn(record.dataValues, 'coordinates'), false);
  assert.equal(Object.hasOwn(candidate.record, 'coordinates'), false);
  assert.notEqual(candidate.coordinates, record);
  assert.notEqual(candidate.coordinates, record.dataValues);
});

test('candidate coordinate normalizer keeps invalid historical coordinates as null without dropping candidate', () => {
  const records = [
    scenicRecord(4, { latitude: null, longitude: null }),
    scenicRecord(5, { latitude: '25.8abc', longitude: '114.94' }),
    scenicRecord(6, { latitude: '91', longitude: '114.94' })
  ];

  const result = collectRouteCandidates({
    scenicRecords: records,
    articleRecords: [],
    constraintsSnapshot: createSnapshot(),
    mode: 'primary'
  });

  assert.equal(result.candidates.length, 3);
  result.candidates.forEach((candidate) => assert.equal(candidate.coordinates, null));
});

test('public basis and narrative prompt projection never include internal coordinates', () => {
  const candidate = scenicCandidate(7);
  const internalBasis = buildInternalBasis({
    retrievalResult: createRetrievalResult([candidate]),
    capacityTarget: 1,
    capacityAchieved: 1
  });
  const publicBasis = buildPublicBasis(internalBasis);
  const publicPlan = {
    task_type: 'plan_route',
    candidate_status: 'ready',
    planning_status: 'generated',
    route_positioning: {
      duration_days: 1,
      travel_mode: 'self_drive',
      pace_preference: 'relaxed',
      theme_preferences: ['heritage']
    },
    summary: { total_days: 1, total_items: 1 },
    days: [
      {
        day_index: 1,
        region_key: 'zhanggong',
        items: [
          {
            item_key: candidate.item_key,
            title: candidate.title,
            region_key: candidate.region_key,
            family_friendly: candidate.family_friendly
          }
        ]
      }
    ],
    route_highlights: ['heritage'],
    adjustment_options: [],
    warnings: [],
    basis: publicBasis,
    plan_context: {
      version: 1,
      fingerprint: 'fp',
      parent_fingerprint: null,
      source: 'route_planner_agent',
      constraints_snapshot: createSnapshot(),
      last_action: null,
      last_action_result: null
    }
  };

  const promptInput = buildNarrativeInput(publicPlan);
  const serialized = JSON.stringify({
    publicBasis,
    promptInput
  });

  assert.ok(candidate.coordinates);
  assert.equal(createCoordinateResolver([candidate])({ item_key: candidate.item_key })?.lat, candidate.coordinates.lat);
  assert.doesNotMatch(serialized, /coordinates|location|latitude|longitude|coordinate_source|coordinate_precision|coordinate_updated_at|lat|lng/);
});

test('coordinate resolver is request-scoped, snapshot based, and conservative', () => {
  const firstCandidates = [
    scenicCandidate(1, { title: ' 通 天 岩 ' }),
    scenicCandidate(2, { title: 'same title' }),
    scenicCandidate(3, { title: 'same title' })
  ];
  const secondCandidates = [
    scenicCandidate(1, {
      coordinates: {
        lat: 26.1,
        lng: 115.1,
        source: 'manual',
        precision: 'exact'
      }
    })
  ];
  const firstResolver = createCoordinateResolver(firstCandidates);
  const secondResolver = createCoordinateResolver(secondCandidates);
  const originalFirstLat = firstCandidates[0].coordinates.lat;

  firstCandidates.length = 0;
  secondCandidates[0].coordinates.lat = 0;

  assert.equal(firstResolver({ item_key: 'scenic:1' }).lat, originalFirstLat);
  assert.equal(secondResolver({ item_key: 'scenic:1' }).lat, 26.1);
  assert.equal(firstResolver({ source_id: 1 }).lat, originalFirstLat);
  assert.equal(firstResolver({ scenic_id: 1 }).lat, originalFirstLat);
  assert.equal(firstResolver({ id: 1 }).lat, originalFirstLat);
  assert.equal(firstResolver({ title: '通天岩' }).lat, originalFirstLat);
  assert.equal(firstResolver({ title: 'same title' }), null);
  assert.equal(firstResolver({ title: 'same' }), null);
  assert.equal(firstResolver({ title: 'unknown spot' }), null);
  assert.equal(firstResolver(null), null);
  assert.equal(firstResolver({ item_key: 1, title: {} }), null);

  const throwingItem = {};
  Object.defineProperty(throwingItem, 'item_key', {
    get() {
      throw new Error('item getter failed');
    }
  });
  assert.equal(firstResolver(throwingItem), null);
});

test('map enrichment keeps factory resolver compatibility and supports per-call resolver override', async () => {
  const calls = [];
  const enrich = createMapEnrichment({
    coordinateResolver: () => ({ lat: 25.83, lng: 114.93 }),
    mapProvider: {
      getLightRoute: async (payload) => {
        calls.push(payload);
        return {
          provider: 'local',
          status: 'estimated',
          data: {
            distance_meters: 1000,
            duration_seconds: 600,
            estimated: true
          },
          meta: {
            estimated: true
          }
        };
      }
    }
  });
  const publicPlan = {
    days: [
      {
        items: [
          { item_key: 'scenic:1' },
          { item_key: 'scenic:2' }
        ]
      }
    ]
  };

  const oldBehavior = await enrich({
    publicPlan,
    constraintsSnapshot: createSnapshot()
  });
  assert.equal(oldBehavior.segments.length, 1);
  assert.equal(calls.length, 1);

  const overridden = await enrich({
    publicPlan,
    constraintsSnapshot: createSnapshot(),
    coordinateResolver: () => null
  });
  assert.equal(overridden.status, 'unavailable');
  assert.equal(calls.length, 1);
});

test('map enrichment rejects null and invalid resolver locations before getLightRoute', async () => {
  for (const invalidLocation of [
    null,
    undefined,
    { lat: null, lng: null },
    { lat: Number.NaN, lng: 114 },
    { lat: 25, lng: Infinity }
  ]) {
    let routeCalls = 0;
    const enrich = createMapEnrichment({
      mapProvider: {
        getLightRoute: async () => {
          routeCalls += 1;
          throw new Error('invalid location should not call map provider');
        }
      }
    });

    const result = await enrich({
      publicPlan: {
        days: [
          {
            items: [
              { item_key: 'scenic:1' },
              { item_key: 'scenic:2' }
            ]
          }
        ]
      },
      constraintsSnapshot: createSnapshot(),
      coordinateResolver: () => invalidLocation
    });

    assert.equal(result.status, 'unavailable');
    assert.equal(routeCalls, 0);
  }
});

test('map enrichment treats resolver exceptions as missing coordinates', async () => {
  let routeCalls = 0;
  const enrich = createMapEnrichment({
    mapProvider: {
      getLightRoute: async () => {
        routeCalls += 1;
        throw new Error('throwing resolver should skip the pair');
      }
    }
  });

  const result = await enrich({
    publicPlan: {
      days: [
        {
          items: [
            { item_key: 'scenic:1' },
            { item_key: 'scenic:2' }
          ]
        }
      ]
    },
    constraintsSnapshot: createSnapshot(),
    coordinateResolver: () => {
      throw new Error('resolver failed');
    }
  });

  assert.equal(result.status, 'unavailable');
  assert.equal(routeCalls, 0);
});

test('map enrichment only skips adjacent missing-coordinate pairs and never bridges gaps', async () => {
  const calls = [];
  const enrich = createMapEnrichment({
    mapProvider: {
      getLightRoute: async (payload) => {
        calls.push(payload);
        return {
          provider: 'local',
          status: 'estimated',
          data: {
            distance_meters: 1000,
            duration_seconds: 600,
            estimated: true
          },
          meta: {
            estimated: true
          }
        };
      }
    }
  });

  const result = await enrich({
    publicPlan: {
      days: [
        {
          items: [
            { item_key: 'scenic:1' },
            { item_key: 'scenic:2' },
            { item_key: 'scenic:3' }
          ]
        }
      ]
    },
    constraintsSnapshot: createSnapshot(),
    coordinateResolver: (item) => {
      if (item.item_key === 'scenic:2') {
        return null;
      }

      return {
        lat: item.item_key === 'scenic:1' ? 25.83 : 25.85,
        lng: item.item_key === 'scenic:1' ? 114.93 : 114.95
      };
    }
  });

  assert.equal(result.status, 'unavailable');
  assert.equal(calls.length, 0);
  assert.deepEqual(result.segments, []);
});

test('generate entry passes request candidate coordinates to map enrichment without changing public route response', async () => {
  let routeCalls = 0;
  let mapArgs = null;
  const candidates = [
    scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
    scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 })
  ];
  const entry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult(candidates),
    spatialDiagnosticsSink: async () => {},
    spatialValidation: () => ({
      status: 'ok',
      issues: [],
      diagnostics: {
        checked_segments: 1,
        skipped_segments: 0,
        unavailable_segments: 0,
        estimated_segments: 0
      }
    }),
    mapEnrichment: createMapEnrichment({
      mapProvider: {
        getLightRoute: async (payload) => {
          routeCalls += 1;
          mapArgs = payload;
          return {
            provider: 'local',
            status: 'estimated',
            data: {
              distance_meters: 1000,
              duration_seconds: 600,
              estimated: true
            },
            meta: {
              estimated: true
            }
          };
        }
      }
    })
  });

  const result = await entry(createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2'] }));
  const serialized = JSON.stringify(result.value);

  assert.equal(result.ok, true);
  assert.equal(routeCalls, 1);
  assert.deepEqual(mapArgs.origin, { lat: candidates[0].coordinates.lat, lng: candidates[0].coordinates.lng });
  assert.deepEqual(mapArgs.destination, { lat: candidates[1].coordinates.lat, lng: candidates[1].coordinates.lng });
  assert.doesNotThrow(() => assertPublicRoutePlanContract(result.value));
  assert.doesNotMatch(serialized, /coordinates|location|latitude|longitude|coordinate_source|coordinate_precision|coordinate_updated_at|lat|lng/);
  assert.deepEqual(result.value.plan_context.constraints_snapshot.locked_targets, ['scenic:1', 'scenic:2']);
});

test('debug collector does not change map route call count for the same coordinate input', async () => {
  const candidates = [
    scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
    scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 })
  ];

  function createEntry(counter) {
    return createGenerateRoutePlanEntry({
      retrieve: async () => createRetrievalResult(candidates),
      spatialDiagnosticsSink: async () => {},
      spatialValidation: () => ({ status: 'ok', issues: [], diagnostics: {} }),
      mapEnrichment: createMapEnrichment({
        mapProvider: {
          getLightRoute: async () => {
            counter.count += 1;
            return {
              provider: 'local',
              status: 'estimated',
              data: {
                distance_meters: 1000,
                duration_seconds: 600,
                estimated: true
              },
              meta: {
                estimated: true
              }
            };
          }
        }
      })
    });
  }

  const withoutCollectorCounter = { count: 0 };
  const withCollectorCounter = { count: 0 };
  const withoutCollector = await createEntry(withoutCollectorCounter)(createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2'] }));
  const withCollector = await createEntry(withCollectorCounter)(createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2'] }), {
    spatialDiagnosticsCollector: () => {}
  });

  assert.equal(withoutCollector.ok, true);
  assert.equal(withCollector.ok, true);
  assert.equal(withoutCollectorCounter.count, 1);
  assert.equal(withCollectorCounter.count, 1);
});

test('map enrichment keeps max segment and deadline protections with per-call resolver', async () => {
  let currentTime = 0;
  let routeCalls = 0;
  const enrich = createMapEnrichment({
    mapProvider: {
      getLightRoute: async () => {
        routeCalls += 1;
        currentTime = 150;
        return {
          provider: 'local',
          status: 'estimated',
          data: {
            distance_meters: 1000,
            duration_seconds: 600,
            estimated: true
          },
          meta: {
            estimated: true
          }
        };
      }
    }
  });

  const result = await enrich({
    publicPlan: {
      days: [
        {
          items: [
            { item_key: 'scenic:1' },
            { item_key: 'scenic:2' },
            { item_key: 'scenic:3' },
            { item_key: 'scenic:4' }
          ]
        }
      ]
    },
    constraintsSnapshot: createSnapshot(),
    maxSegments: 3,
    deadlineAt: 200,
    now: () => currentTime,
    coordinateResolver: () => ({ lat: 25.83, lng: 114.93 })
  });

  assert.equal(result.status, 'partial');
  assert.equal(routeCalls, 1);
});
