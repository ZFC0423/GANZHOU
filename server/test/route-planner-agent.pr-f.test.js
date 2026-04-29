import test from 'node:test';
import assert from 'node:assert/strict';

import { noopDistanceProvider } from '../src/services/map/distance-provider.js';
import {
  CANDIDATE_STATUS,
  NARRATIVE_FALLBACK_REASONS,
  PLANNING_STATUS,
  ROUTE_WARNING_CODES,
  createRouteWarning
} from '../src/services/ai/route-planner-agent/contracts.js';
import { buildInternalBasis } from '../src/services/ai/route-planner-agent/basis.js';
import { buildGenerateFailedPlan } from '../src/services/ai/route-planner-agent/fallback.js';
import { createGenerateRoutePlanEntry } from '../src/services/ai/route-planner-agent/generate-entry.js';
import { createMapEnrichment } from '../src/services/ai/route-planner-agent/map-enrichment.js';
import { createNarrativeRoutePlanEntry } from '../src/services/ai/route-planner-agent/narrative-entry.js';
import { retrieveRouteCandidates } from '../src/services/ai/route-planner-agent/retrieve.js';
import { createReviseRoutePlanEntry } from '../src/services/ai/route-planner-agent/revise-entry.js';
import { assemblePublicRoutePlan, getCapacityTarget, scheduleRoute } from '../src/services/ai/route-planner-agent/schedule.js';
import {
  assertPublicRoutePlanContract,
  normalizeFullPublicRoutePlan,
  validateGeneratePayload
} from '../src/services/ai/route-planner-agent/validate.js';

function createSnapshot(overrides = {}) {
  return {
    time_budget: { days: 1 },
    travel_mode: 'public_transport',
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
        user_query: '基于我刚才选的景点生成路线',
        time_budget: { days: 1 },
        travel_mode: 'public_transport',
        pace_preference: 'relaxed',
        theme_preferences: ['heritage'],
        companions: [],
        hard_avoidances: [],
        physical_constraints: [],
        route_origin: null,
        destination_scope: null,
        ...constraints
      }
    }
  };
}

function scenicRecord(id, overrides = {}) {
  return {
    id,
    name: `spot ${id}`,
    region: 'Zhanggong',
    tags: 'heritage',
    family_friendly: 1,
    recommend_flag: 1,
    hot_score: 90 - id,
    status: 1,
    walking_intensity: 'light',
    category: { code: 'scenic_history', name: 'History Scenic' },
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
    ...overrides
  };
}

function buildBasis(candidates, snapshot, warnings = []) {
  return buildInternalBasis({
    retrievalResult: {
      mode: 'primary',
      candidates,
      scenic_candidates: candidates.filter((item) => item.source_type === 'scenic'),
      article_candidates: [],
      warnings,
      diagnostics: []
    },
    capacityTarget: getCapacityTarget(snapshot)
  });
}

function createRetrievalResult({ candidates = [], warnings = [], mode = 'primary' } = {}) {
  return {
    mode,
    candidates,
    scenic_candidates: candidates.filter((item) => item.source_type === 'scenic'),
    article_candidates: [],
    warnings,
    diagnostics: []
  };
}

function omitPlanContext(plan) {
  const { plan_context, ...publicPlan } = plan;
  return publicPlan;
}

function countRouteItems(plan, itemKey) {
  return plan.days
    .flatMap((day) => day.items)
    .filter((item) => item.item_key === itemKey).length;
}

test('validate accepts locked_targets default, dedupes valid keys, and rejects invalid option keys', () => {
  const defaultResult = validateGeneratePayload(createGeneratePayload());
  assert.equal(defaultResult.ok, true);
  assert.deepEqual(defaultResult.value.constraints_snapshot.locked_targets, []);

  const deduped = validateGeneratePayload(createGeneratePayload({
    locked_targets: ['scenic:2', 'scenic:1', 'scenic:2']
  }));
  assert.equal(deduped.ok, true);
  assert.deepEqual(deduped.value.constraints_snapshot.locked_targets, ['scenic:2', 'scenic:1']);

  for (const locked_targets of [['abc'], ['article:1'], ['scenic:x']]) {
    const invalid = validateGeneratePayload(createGeneratePayload({ locked_targets }));
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error.code, 'route_planner_invalid_router_result');
    assert.equal(invalid.error.httpStatus, 400);
  }
});

test('public contract accepts failed plans and strict warnings without free fields', () => {
  const snapshot = createSnapshot({ locked_targets: ['scenic:1'] });
  const failedPlan = buildGenerateFailedPlan({
    constraintsSnapshot: snapshot,
    candidateStatus: CANDIDATE_STATUS.READY,
    warnings: [
      createRouteWarning({
        code: ROUTE_WARNING_CODES.LOCKED_TARGETS_CONFLICT_WITH_PACE,
        conflictingKeys: ['scenic:1']
      })
    ]
  });

  assert.equal(failedPlan.planning_status, PLANNING_STATUS.FAILED);
  assert.doesNotThrow(() => assertPublicRoutePlanContract(failedPlan));

  const normalized = normalizeFullPublicRoutePlan({
    ...failedPlan,
    warnings: [
      {
        ...failedPlan.warnings[0],
        extra: 'not allowed'
      }
    ]
  });

  assert.equal(normalized.ok, false);
  assert.equal(normalized.error.code, 'route_planner_invalid_narrative_payload');
});

test('retrieve resolves locked targets by exact id and does not fall back or fuzzy-match missing keys', async () => {
  const calls = [];
  const scenicModel = {
    findAll: async (query) => {
      calls.push(query);
      if (query.where.id) return [scenicRecord(1)];
      return [scenicRecord(2)];
    }
  };
  const articleModel = { findAll: async () => [] };

  const result = await retrieveRouteCandidates({
    constraintsSnapshot: createSnapshot({
      locked_targets: ['scenic:1'],
      destination_scope: 'missing fuzzy scope'
    }),
    scenicModel,
    articleModel
  });

  assert.equal(result.warnings.length, 0);
  assert.equal(calls.length, 2);
  assert.equal(Object.hasOwn(calls[0].where, 'status'), false);
  assert.deepEqual(result.candidates[0].item_key, 'scenic:1');
  assert.equal(result.candidates[0].is_locked, true);
  assert.deepEqual(result.candidates[0].matched_by, ['locked_targets']);
});

test('retrieve maps locked not found and unavailable to structured warnings without ordinary fallback', async () => {
  const articleModel = { findAll: async () => [] };
  const notFoundCalls = [];
  const notFound = await retrieveRouteCandidates({
    constraintsSnapshot: createSnapshot({ locked_targets: ['scenic:404'] }),
    scenicModel: {
      findAll: async (query) => {
        notFoundCalls.push(query);
        return [];
      }
    },
    articleModel
  });

  assert.equal(notFoundCalls.length, 1);
  assert.equal(notFound.warnings[0].code, ROUTE_WARNING_CODES.LOCKED_TARGET_NOT_FOUND);

  const unavailable = await retrieveRouteCandidates({
    constraintsSnapshot: createSnapshot({ locked_targets: ['scenic:9'] }),
    scenicModel: {
      findAll: async () => [scenicRecord(9, { status: 0 })]
    },
    articleModel
  });

  assert.equal(unavailable.warnings[0].code, ROUTE_WARNING_CODES.LOCKED_TARGET_UNAVAILABLE);
});

test('schedule keeps locked targets exactly once and prunes only non-locked over capacity', () => {
  const snapshot = createSnapshot({ locked_targets: ['scenic:1', 'scenic:2'] });
  const candidates = [
    scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
    scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 }),
    scenicCandidate(3, { score: 200 })
  ];
  const schedule = scheduleRoute({
    constraintsSnapshot: snapshot,
    internalBasis: buildBasis(candidates, snapshot),
    mode: 'generate'
  });

  assert.equal(schedule.feasible, true);
  assert.deepEqual(schedule.warnings, []);

  const plan = assemblePublicRoutePlan({
    constraintsSnapshot: snapshot,
    scheduleResult: schedule,
    internalBasis: buildBasis(candidates, snapshot)
  });

  assert.equal(countRouteItems(plan, 'scenic:1'), 1);
  assert.equal(countRouteItems(plan, 'scenic:2'), 1);
  assert.equal(countRouteItems(plan, 'scenic:3'), 0);
  assert.deepEqual(plan.warnings, []);
});

test('schedule returns failed-compatible locked conflict instead of dropping locked targets', () => {
  const snapshot = createSnapshot({ locked_targets: ['scenic:1', 'scenic:2', 'scenic:3'] });
  const candidates = [1, 2, 3].map((id) => scenicCandidate(id, {
    is_locked: true,
    matched_by: ['locked_targets']
  }));
  const schedule = scheduleRoute({
    constraintsSnapshot: snapshot,
    internalBasis: buildBasis(candidates, snapshot),
    mode: 'generate'
  });

  assert.equal(schedule.feasible, false);
  assert.equal(schedule.candidate_status, CANDIDATE_STATUS.READY);
  assert.equal(schedule.warnings[0].code, ROUTE_WARNING_CODES.LOCKED_TARGETS_EXCEED_DAY_CAPACITY);
});

test('region span conflicts stay conservative without explicit same-region constraints', () => {
  const candidates = [
    scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], region_key: 'zhanggong' }),
    scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], region_key: 'anyuan' })
  ];
  const relaxedSnapshot = createSnapshot({ locked_targets: ['scenic:1', 'scenic:2'] });
  const relaxed = scheduleRoute({
    constraintsSnapshot: relaxedSnapshot,
    internalBasis: buildBasis(candidates, relaxedSnapshot),
    mode: 'generate'
  });

  assert.equal(relaxed.feasible, true);
  assert.deepEqual(relaxed.warnings, []);

  const focusedSnapshot = createSnapshot({
    locked_targets: ['scenic:1', 'scenic:2'],
    same_region_only: true,
    focused_region_key: 'zhanggong'
  });
  const focused = scheduleRoute({
    constraintsSnapshot: focusedSnapshot,
    internalBasis: buildBasis(candidates, focusedSnapshot),
    mode: 'generate'
  });

  assert.equal(focused.feasible, false);
  assert.equal(focused.warnings[0].code, ROUTE_WARNING_CODES.LOCKED_TARGETS_REGION_SPAN_CONFLICT);
});

test('generate returns failed plan for locked not found, unavailable, and locked capacity conflict', async () => {
  const notFoundWarning = createRouteWarning({
    code: ROUTE_WARNING_CODES.LOCKED_TARGET_NOT_FOUND,
    conflictingKeys: ['scenic:404']
  });
  const notFoundEntry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult({ warnings: [notFoundWarning] })
  });
  const notFound = await notFoundEntry(createGeneratePayload({ locked_targets: ['scenic:404'] }));

  assert.equal(notFound.ok, true);
  assert.equal(notFound.value.candidate_status, CANDIDATE_STATUS.EMPTY);
  assert.equal(notFound.value.planning_status, PLANNING_STATUS.FAILED);
  assert.equal(notFound.value.warnings[0].code, ROUTE_WARNING_CODES.LOCKED_TARGET_NOT_FOUND);

  const unavailableWarning = createRouteWarning({
    code: ROUTE_WARNING_CODES.LOCKED_TARGET_UNAVAILABLE,
    conflictingKeys: ['scenic:9']
  });
  const unavailableEntry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult({ warnings: [unavailableWarning] })
  });
  const unavailable = await unavailableEntry(createGeneratePayload({ locked_targets: ['scenic:9'] }));

  assert.equal(unavailable.value.candidate_status, CANDIDATE_STATUS.LIMITED);
  assert.equal(unavailable.value.planning_status, PLANNING_STATUS.FAILED);
  assert.equal(unavailable.value.warnings[0].code, ROUTE_WARNING_CODES.LOCKED_TARGET_UNAVAILABLE);

  const conflictEntry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult({
      candidates: [1, 2, 3].map((id) => scenicCandidate(id, {
        is_locked: true,
        matched_by: ['locked_targets']
      }))
    })
  });
  const conflict = await conflictEntry(createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2', 'scenic:3'] }));

  assert.equal(conflict.value.candidate_status, CANDIDATE_STATUS.READY);
  assert.equal(conflict.value.planning_status, PLANNING_STATUS.FAILED);
  assert.equal(conflict.value.summary.total_items, 0);
  assert.equal(conflict.value.warnings[0].code, ROUTE_WARNING_CODES.LOCKED_TARGETS_EXCEED_DAY_CAPACITY);
});

test('successful generate includes every locked target once and keeps noop map warnings silent', async () => {
  const entry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult({
      candidates: [
        scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
        scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 }),
        scenicCandidate(3, { score: 200 })
      ]
    })
  });
  const result = await entry(createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2'] }));

  assert.equal(result.ok, true);
  assert.equal(result.value.planning_status, PLANNING_STATUS.GENERATED);
  assert.equal(countRouteItems(result.value, 'scenic:1'), 1);
  assert.equal(countRouteItems(result.value, 'scenic:2'), 1);
  assert.deepEqual(result.value.warnings, []);
  assert.equal(result.value.warnings.some((warning) => warning.code === ROUTE_WARNING_CODES.MAP_PROVIDER_DISABLED), false);
});

test('narrative entry short-circuits failed plans before calling the LLM generation path', async () => {
  const failedPlan = buildGenerateFailedPlan({
    constraintsSnapshot: createSnapshot({ locked_targets: ['scenic:1'] }),
    warnings: [
      createRouteWarning({
        code: ROUTE_WARNING_CODES.LOCKED_TARGETS_CONFLICT_WITH_PACE,
        conflictingKeys: ['scenic:1']
      })
    ]
  });
  let generateCalled = false;
  const entry = createNarrativeRoutePlanEntry({
    generateNarrative: async () => {
      generateCalled = true;
      throw new Error('generateNarrative should not be called');
    }
  });

  const result = await entry({ public_plan: failedPlan });

  assert.equal(result.ok, true);
  assert.equal(generateCalled, false);
  assert.equal(result.value.generation_meta.reason, NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_FAILED_PLAN);
  assert.match(result.value.narrative.overview, /路线暂未成功生成/);
  assert.equal(result.value.narrative.day_summaries.every((day) => !day.text.includes('spot')), true);
});

test('revise rejects failed previous plans during validation and never enters repair', async () => {
  const failedPlan = buildGenerateFailedPlan({
    constraintsSnapshot: createSnapshot({ locked_targets: ['scenic:1'] }),
    warnings: [
      createRouteWarning({
        code: ROUTE_WARNING_CODES.LOCKED_TARGETS_CONFLICT_WITH_PACE,
        conflictingKeys: ['scenic:1']
      })
    ]
  });
  let repairCalled = false;
  const entry = createReviseRoutePlanEntry({
    repairPolicy: async () => {
      repairCalled = true;
      throw new Error('repair should not be called');
    }
  });

  const result = await entry({
    previous_public_plan: omitPlanContext(failedPlan),
    previous_plan_context: failedPlan.plan_context,
    action: { type: 'relax_pace' }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'cannot_revise_failed_plan');
  assert.equal(result.error.httpStatus, 400);
  assert.equal(repairCalled, false);
});

test('noop distance provider is unavailable internally but silent for public route warnings', async () => {
  const span = await noopDistanceProvider.estimateRouteSpan();

  assert.deepEqual(span, {
    status: 'unavailable',
    provider: 'noop',
    mode: null,
    distance_meters: null,
    duration_minutes: null,
    reason_code: 'map_provider_disabled'
  });

  const entry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult({
      candidates: [scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'] })]
    })
  });
  const result = await entry(createGeneratePayload({ locked_targets: ['scenic:1'] }));

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.warnings, []);
});

test('map enrichment failure does not fail generate or alter public route output', async () => {
  const entry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult({
      candidates: [
        scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
        scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 })
      ]
    }),
    mapEnrichment: async () => {
      throw new Error('map provider unavailable');
    }
  });

  const result = await entry(createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2'] }));

  assert.equal(result.ok, true);
  assert.equal(result.value.planning_status, PLANNING_STATUS.GENERATED);
  assert.equal(Object.hasOwn(result.value, 'map_enrichment'), false);
  assert.equal(Object.hasOwn(result.value, 'spatial_validation'), false);
  assert.doesNotThrow(() => assertPublicRoutePlanContract(result.value));
});

test('spatial validation warning is sent to diagnostics sink without altering public output', async () => {
  const diagnostics = [];
  const entry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult({
      candidates: [
        scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
        scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 })
      ]
    }),
    mapEnrichment: async () => ({
      status: 'estimated',
      provider: 'local',
      fallback_used: true,
      segments: [
        {
          from_option_key: 'scenic:1',
          to_option_key: 'scenic:2',
          mode: 'driving',
          distance_meters: 60000,
          duration_seconds: 5000,
          estimated: true
        }
      ]
    }),
    spatialDiagnosticsSink: async (input) => {
      diagnostics.push(input);
    }
  });

  const result = await entry(createGeneratePayload({
    locked_targets: ['scenic:1', 'scenic:2'],
    travel_mode: 'self_drive',
    pace_preference: 'relaxed'
  }));

  assert.equal(result.ok, true);
  assert.equal(result.value.planning_status, PLANNING_STATUS.GENERATED);
  assert.equal(countRouteItems(result.value, 'scenic:1'), 1);
  assert.equal(countRouteItems(result.value, 'scenic:2'), 1);
  assert.equal(result.value.warnings.length, 0);
  assert.equal(Object.hasOwn(result.value, 'map_enrichment'), false);
  assert.equal(Object.hasOwn(result.value, 'spatial_validation'), false);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].route_fingerprint, result.value.plan_context.fingerprint);
  assert.equal(diagnostics[0].spatial_validation.status, 'warning');
  assert.equal(diagnostics[0].spatial_validation.issues[0].code, 'route_segment_too_far');
  assert.doesNotThrow(() => assertPublicRoutePlanContract(result.value));
});

test('spatial validation and diagnostics sink failures do not fail route generation', async () => {
  const failingValidationEntry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult({
      candidates: [
        scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
        scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 })
      ]
    }),
    mapEnrichment: async () => ({ status: 'ok', provider: 'local', segments: [{}], fallback_used: false }),
    spatialValidation: async () => {
      throw new Error('spatial validation failed');
    },
    spatialDiagnosticsSink: async () => {}
  });
  const validationResult = await failingValidationEntry(createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2'] }));
  assert.equal(validationResult.ok, true);
  assert.doesNotThrow(() => assertPublicRoutePlanContract(validationResult.value));

  const failingSinkEntry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult({
      candidates: [
        scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
        scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 })
      ]
    }),
    mapEnrichment: async () => ({
      status: 'ok',
      provider: 'local',
      fallback_used: false,
      segments: [{ mode: 'driving', distance_meters: 60000, duration_seconds: 5000 }]
    }),
    spatialDiagnosticsSink: async () => {
      throw new Error('sink failed');
    }
  });
  const sinkResult = await failingSinkEntry(createGeneratePayload({
    locked_targets: ['scenic:1', 'scenic:2'],
    travel_mode: 'self_drive'
  }));
  assert.equal(sinkResult.ok, true);
  assert.doesNotThrow(() => assertPublicRoutePlanContract(sinkResult.value));
});

test('spatial diagnostics timeout does not fail route generation or write late sink output', async () => {
  const diagnostics = [];
  const entry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult({
      candidates: [
        scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
        scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 })
      ]
    }),
    mapEnrichment: async () => new Promise(() => {}),
    spatialDiagnosticsSink: async (input) => {
      diagnostics.push(input);
    },
    spatialDiagnosticsTimeoutMs: 1
  });

  const result = await entry(createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2'] }));

  assert.equal(result.ok, true);
  assert.equal(diagnostics.length, 0);
  assert.equal(Object.hasOwn(result.value, 'spatial_validation'), false);
  assert.doesNotThrow(() => assertPublicRoutePlanContract(result.value));
});

test('spatial diagnostics skips all work when sink is disabled', async () => {
  let mapCalled = false;
  let validationCalled = false;
  const entry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult({
      candidates: [
        scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
        scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 })
      ]
    }),
    mapEnrichment: async () => {
      mapCalled = true;
      return { status: 'ok', provider: 'local', segments: [], fallback_used: false };
    },
    spatialValidation: async () => {
      validationCalled = true;
      return { status: 'ok', issues: [], diagnostics: {} };
    },
    spatialDiagnosticsSink: null
  });

  const result = await entry(createGeneratePayload({ locked_targets: ['scenic:1', 'scenic:2'] }));

  assert.equal(result.ok, true);
  assert.equal(mapCalled, false);
  assert.equal(validationCalled, false);
  assert.doesNotThrow(() => assertPublicRoutePlanContract(result.value));
});

test('spatial diagnostics deadline is passed to map enrichment and prevents later route calls', async () => {
  let currentTime = 0;
  let routeCalls = 0;
  const nowCalls = [];
  const entry = createGenerateRoutePlanEntry({
    retrieve: async () => createRetrievalResult({
      candidates: [
        scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
        scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 }),
        scenicCandidate(3, { score: 98 })
      ]
    }),
    mapEnrichment: createMapEnrichment({
      coordinateResolver: (item) => ({
        lat: 25.83 + Number(item.item_key.split(':')[1]) / 1000,
        lng: 114.93 + Number(item.item_key.split(':')[1]) / 1000
      }),
      mapProvider: {
        getLightRoute: async () => {
          routeCalls += 1;
          currentTime = 150;
          return {
            provider: 'local',
            status: 'estimated',
            data: {
              distance_meters: 60000,
              duration_seconds: 5000,
              estimated: true
            },
            meta: {
              estimated: true
            }
          };
        }
      }
    }),
    spatialDiagnosticsSink: async () => {},
    spatialDiagnosticsTimeoutMs: 200,
    now: () => {
      nowCalls.push(currentTime);
      return currentTime;
    },
    maxSpatialEnrichmentSegments: 3
  });

  const result = await entry(createGeneratePayload({
    locked_targets: ['scenic:1', 'scenic:2'],
    travel_mode: 'self_drive',
    pace_preference: 'compact'
  }));

  assert.equal(result.ok, true);
  assert.equal(routeCalls, 1);
  assert.deepEqual(nowCalls.slice(0, 2), [0, 0]);
  assert.equal(nowCalls.includes(150), true);
  assert.equal(Object.hasOwn(result.value, 'spatial_validation'), false);
  assert.doesNotThrow(() => assertPublicRoutePlanContract(result.value));
});

test('map enrichment helper returns internal estimated segments with injected coordinates', async () => {
  const calls = [];
  const enrich = createMapEnrichment({
    coordinateResolver: (item) => ({
      lat: 25.83 + Number(item.item_key.split(':')[1]) / 1000,
      lng: 114.93 + Number(item.item_key.split(':')[1]) / 1000
    }),
    mapProvider: {
      getLightRoute: async (payload) => {
        calls.push(payload);
        return {
          provider: 'local',
          status: 'estimated',
          data: {
            distance_meters: 1200,
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
    constraintsSnapshot: createSnapshot({ travel_mode: 'self_drive' })
  });

  assert.equal(result.status, 'estimated');
  assert.equal(result.segments.length, 2);
  assert.equal(result.segments[0].mode, 'driving');
  assert.equal(result.segments[0].estimated, true);
  assert.equal(result.fallback_used, true);
  assert.equal(calls.length, 2);
});

test('map enrichment helper respects maxSegments limit for long routes', async () => {
  const calls = [];
  const enrich = createMapEnrichment({
    coordinateResolver: (item) => ({
      lat: 25.83 + Number(item.item_key.split(':')[1]) / 1000,
      lng: 114.93 + Number(item.item_key.split(':')[1]) / 1000
    }),
    mapProvider: {
      getLightRoute: async (payload) => {
        calls.push(payload);
        return {
          provider: 'local',
          status: 'estimated',
          data: {
            distance_meters: 1200,
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
            { item_key: 'scenic:4' },
            { item_key: 'scenic:5' }
          ]
        }
      ]
    },
    constraintsSnapshot: createSnapshot({ travel_mode: 'self_drive' }),
    maxSegments: 2
  });

  assert.equal(result.segments.length, 2);
  assert.equal(calls.length, 2);
});

test('map enrichment deadline reached before first route call avoids getLightRoute', async () => {
  let routeCalled = false;
  const enrich = createMapEnrichment({
    coordinateResolver: () => ({ lat: 25.83, lng: 114.93 }),
    mapProvider: {
      getLightRoute: async () => {
        routeCalled = true;
        throw new Error('deadline should prevent route call');
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
    constraintsSnapshot: createSnapshot({ travel_mode: 'self_drive' }),
    deadlineAt: 10,
    now: () => 10
  });

  assert.equal(routeCalled, false);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.diagnostics.timed_out, true);
  assert.equal(result.diagnostics.skip_reason, 'spatial_diagnostics_timeout');
});

test('map enrichment avoids route call when remaining deadline budget is too small', async () => {
  let routeCalled = false;
  const enrich = createMapEnrichment({
    coordinateResolver: () => ({ lat: 25.83, lng: 114.93 }),
    mapProvider: {
      getLightRoute: async () => {
        routeCalled = true;
        throw new Error('remaining budget should prevent route call');
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
    constraintsSnapshot: createSnapshot({ travel_mode: 'self_drive' }),
    deadlineAt: 1000,
    now: () => 950
  });

  assert.equal(routeCalled, false);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.diagnostics.timed_out, true);
});

test('map enrichment stops route calls when deadline expires after first segment', async () => {
  let currentTime = 0;
  let routeCalls = 0;
  const enrich = createMapEnrichment({
    coordinateResolver: () => ({ lat: 25.83, lng: 114.93 }),
    mapProvider: {
      getLightRoute: async () => {
        routeCalls += 1;
        currentTime = 150;
        return {
          provider: 'local',
          status: 'estimated',
          data: {
            distance_meters: 1200,
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
    constraintsSnapshot: createSnapshot({ travel_mode: 'self_drive' }),
    deadlineAt: 200,
    now: () => currentTime,
    maxSegments: 3
  });

  assert.equal(routeCalls, 1);
  assert.equal(result.status, 'partial');
  assert.equal(result.segments.length, 1);
  assert.equal(result.diagnostics.timed_out, true);
});

test('map enrichment limits scanned pairs when long route lacks coordinates', async () => {
  let resolverCalls = 0;
  let routeCalled = false;
  const enrich = createMapEnrichment({
    coordinateResolver: () => {
      resolverCalls += 1;
      return null;
    },
    mapProvider: {
      getLightRoute: async () => {
        routeCalled = true;
        throw new Error('missing coordinates should never call route');
      }
    }
  });

  const result = await enrich({
    publicPlan: {
      days: [
        {
          items: Array.from({ length: 20 }, (_, index) => ({ item_key: `scenic:${index + 1}` }))
        }
      ]
    },
    constraintsSnapshot: createSnapshot({ travel_mode: 'self_drive' }),
    maxSegments: 2
  });

  assert.equal(result.status, 'unavailable');
  assert.equal(routeCalled, false);
  assert.equal(resolverCalls, 12);
});

test('map enrichment helper does not geocode route item names when coordinates are missing', async () => {
  let routeCalled = false;
  let geocodeCalled = false;
  const enrich = createMapEnrichment({
    mapProvider: {
      getLightRoute: async () => {
        routeCalled = true;
        throw new Error('should not be called without coordinates');
      },
      geocodeAddress: async () => {
        geocodeCalled = true;
        throw new Error('geocode is not allowed in PR-K route enrichment');
      }
    }
  });

  const result = await enrich({
    publicPlan: {
      days: [
        {
          items: [
            { item_key: 'scenic:1', title: '通天岩' },
            { item_key: 'scenic:2', title: '郁孤台' }
          ]
        }
      ]
    },
    constraintsSnapshot: createSnapshot()
  });

  assert.equal(result.status, 'unavailable');
  assert.deepEqual(result.segments, []);
  assert.equal(routeCalled, false);
  assert.equal(geocodeCalled, false);
});

test('map enrichment skips public transport instead of treating it as walking', async () => {
  let routeCalled = false;
  const enrich = createMapEnrichment({
    coordinateResolver: () => ({ lat: 25.83, lng: 114.93 }),
    mapProvider: {
      getLightRoute: async () => {
        routeCalled = true;
        throw new Error('public_transport is not supported by PR-K map enrichment');
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
    constraintsSnapshot: createSnapshot({ travel_mode: 'public_transport' })
  });

  assert.equal(result.status, 'unavailable');
  assert.equal(result.fallback_used, false);
  assert.equal(routeCalled, false);
});

test('spatial validation does not treat public transport or mixed without segment mode as walking', async () => {
  for (const travel_mode of ['public_transport', 'mixed']) {
    const diagnostics = [];
    const entry = createGenerateRoutePlanEntry({
      retrieve: async () => createRetrievalResult({
        candidates: [
          scenicCandidate(1, { is_locked: true, matched_by: ['locked_targets'], score: 100 }),
          scenicCandidate(2, { is_locked: true, matched_by: ['locked_targets'], score: 99 })
        ]
      }),
      mapEnrichment: async () => ({
        status: 'ok',
        provider: 'local',
        fallback_used: false,
        segments: [
          {
            from_option_key: 'scenic:1',
            to_option_key: 'scenic:2',
            distance_meters: 999999,
            duration_seconds: 999999,
            estimated: false
          }
        ]
      }),
      spatialDiagnosticsSink: async (input) => {
        diagnostics.push(input);
      }
    });

    const result = await entry(createGeneratePayload({
      locked_targets: ['scenic:1', 'scenic:2'],
      travel_mode
    }));

    assert.equal(result.ok, true);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].spatial_validation.status, 'unavailable');
    assert.equal(diagnostics[0].spatial_validation.issues.length, 0);
    assert.equal(diagnostics[0].spatial_validation.diagnostics.skipped_segments, 1);
    assert.doesNotThrow(() => assertPublicRoutePlanContract(result.value));
  }
});

test('map enrichment rejects blank coordinates without calling route or geocode', async () => {
  let routeCalled = false;
  let geocodeCalled = false;
  const enrich = createMapEnrichment({
    mapProvider: {
      getLightRoute: async () => {
        routeCalled = true;
        throw new Error('blank coordinates must be skipped');
      },
      geocodeAddress: async () => {
        geocodeCalled = true;
        throw new Error('geocode is not allowed in PR-K route enrichment');
      }
    }
  });

  const result = await enrich({
    publicPlan: {
      days: [
        {
          items: [
            { item_key: 'scenic:1', location: { lat: '', lng: 114.93 } },
            { item_key: 'scenic:2', location: { lat: 25.84, lng: 114.94 } }
          ]
        }
      ]
    },
    constraintsSnapshot: createSnapshot({ travel_mode: 'self_drive' })
  });

  assert.equal(result.status, 'unavailable');
  assert.equal(routeCalled, false);
  assert.equal(geocodeCalled, false);
});
