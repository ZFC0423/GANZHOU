import test from 'node:test';
import assert from 'node:assert/strict';

import { buildInternalBasis, classifyCandidateStatus, projectPublicBasisItems } from '../src/services/ai/route-planner-agent/basis.js';
import { CANDIDATE_STATUS } from '../src/services/ai/route-planner-agent/contracts.js';
import { createGenerateRoutePlanEntry } from '../src/services/ai/route-planner-agent/generate-entry.js';
import { createRouteFingerprint } from '../src/services/ai/route-planner-agent/mock.js';
import { collectRouteCandidates } from '../src/services/ai/route-planner-agent/retrieve.js';
import { reviseRoutePlan } from '../src/services/ai/route-planner-agent/index.js';
import { applyActionToConstraintsSnapshot, scheduleRoute } from '../src/services/ai/route-planner-agent/schedule.js';

function createSnapshot(overrides = {}) {
  return {
    time_budget: { days: 2 },
    travel_mode: 'public_transport',
    pace_preference: 'normal',
    theme_preferences: ['heritage'],
    companions: [],
    hard_avoidances: [],
    physical_constraints: [],
    route_origin: null,
    destination_scope: null,
    family_friendly_only: false,
    same_region_only: false,
    focused_region_key: null,
    avoid_far_spots: false,
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
    walking_intensity: '',
    recommend_flag: 0,
    hot_score: 10,
    matched_by: ['theme_preferences'],
    score: 20,
    direct_hit: true,
    is_route_item: true,
    record: {},
    ...overrides
  };
}

function articleCandidate(id, overrides = {}) {
  return {
    ...scenicCandidate(id, overrides),
    item_key: `article:${id}`,
    source_type: 'article',
    title: `article ${id}`,
    region_key: null,
    family_friendly: false,
    is_route_item: false
  };
}

function buildBasis(candidates, snapshot = createSnapshot()) {
  return buildInternalBasis({
    retrievalResult: {
      mode: 'primary',
      candidates,
      scenic_candidates: candidates.filter((item) => item.source_type === 'scenic'),
      article_candidates: candidates.filter((item) => item.source_type === 'article'),
      diagnostics: []
    },
    capacityTarget: snapshot.time_budget.days * 3
  });
}

function omitPlanContext(plan) {
  const { plan_context, ...publicPlan } = plan;
  return publicPlan;
}

function createGeneratePayload() {
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
        user_query: '两天公共交通，想看老城',
        time_budget: { days: 2 },
        travel_mode: 'public_transport',
        pace_preference: 'relaxed',
        theme_preferences: ['heritage'],
        companions: [],
        hard_avoidances: [],
        physical_constraints: [],
        route_origin: null,
        destination_scope: null
      }
    }
  };
}

test('retrieve primary is strict while expanded can include controlled fallback candidates', () => {
  const snapshot = createSnapshot({ theme_preferences: ['natural'], travel_mode: 'mixed' });
  const primary = collectRouteCandidates({
    constraintsSnapshot: snapshot,
    mode: 'primary',
    scenicRecords: [
      { id: 1, name: '山地森林', region: 'Anyuan', tags: 'nature,forest', family_friendly: 1, recommend_flag: 1, hot_score: 80, category: { code: 'scenic_nature' } },
      { id: 2, name: '老城楼台', region: 'Zhanggong', tags: 'history,old-city', family_friendly: 1, recommend_flag: 1, hot_score: 90, category: { code: 'scenic_history' } }
    ],
    articleRecords: []
  });
  const expanded = collectRouteCandidates({
    constraintsSnapshot: snapshot,
    mode: 'expanded',
    scenicRecords: [
      { id: 1, name: '山地森林', region: 'Anyuan', tags: 'nature,forest', family_friendly: 1, recommend_flag: 1, hot_score: 80, category: { code: 'scenic_nature' } },
      { id: 2, name: '老城楼台', region: 'Zhanggong', tags: 'history,old-city', family_friendly: 1, recommend_flag: 1, hot_score: 90, category: { code: 'scenic_history' } }
    ],
    articleRecords: []
  });

  assert.deepEqual(primary.scenic_candidates.map((item) => item.item_key), ['scenic:1']);
  assert.deepEqual(expanded.scenic_candidates.map((item) => item.item_key).sort(), ['scenic:1', 'scenic:2']);
});

test('retrieve never relaxes hard family_friendly_only constraint', () => {
  const snapshot = createSnapshot({ family_friendly_only: true });
  const expanded = collectRouteCandidates({
    constraintsSnapshot: snapshot,
    mode: 'expanded',
    scenicRecords: [
      { id: 1, name: '亲子点', region: 'Zhanggong', tags: 'history', family_friendly: 1, recommend_flag: 0, hot_score: 20, category: { code: 'scenic_history' } },
      { id: 2, name: '非亲子点', region: 'Zhanggong', tags: 'history', family_friendly: 0, recommend_flag: 1, hot_score: 99, category: { code: 'scenic_history' } }
    ],
    articleRecords: []
  });

  assert.deepEqual(expanded.scenic_candidates.map((item) => item.item_key), ['scenic:1']);
});

test('basis caps public items to stable top 20 thin references and classifies candidate status', () => {
  const candidates = Array.from({ length: 25 }, (_, index) => scenicCandidate(index + 1, {
    score: 100 - index,
    hot_score: index
  }));
  const publicItems = projectPublicBasisItems(candidates);

  assert.equal(publicItems.length, 20);
  assert.deepEqual(Object.keys(publicItems[0]).sort(), ['item_key', 'matched_by', 'region_key', 'score_rank', 'source_type', 'title']);
  assert.equal(publicItems[0].score_rank, 1);
  assert.equal(classifyCandidateStatus({ capacityTarget: 4, capacityAchieved: 4, degraded: false }), CANDIDATE_STATUS.READY);
  assert.equal(classifyCandidateStatus({ capacityTarget: 4, capacityAchieved: 2, degraded: false }), CANDIDATE_STATUS.LIMITED);
  assert.equal(classifyCandidateStatus({ capacityTarget: 4, capacityAchieved: 0, degraded: false }), CANDIDATE_STATUS.EMPTY);
});

test('compress_to_one_day avoids first-day trap and keeps higher value anchors', () => {
  const snapshot = createSnapshot({ time_budget: { days: 1 }, pace_preference: 'normal' });
  const candidates = [
    scenicCandidate(1, { score: 10, hot_score: 10 }),
    scenicCandidate(2, { score: 12, hot_score: 10 }),
    scenicCandidate(4, { score: 90, hot_score: 99, recommend_flag: 1 }),
    scenicCandidate(5, { score: 80, hot_score: 95, recommend_flag: 1 })
  ];
  const schedule = scheduleRoute({
    constraintsSnapshot: snapshot,
    internalBasis: buildBasis(candidates, snapshot),
    mode: 'revise',
    action: { type: 'compress_to_one_day', payload: {} },
    previousPublicPlan: {
      task_type: 'plan_route',
      candidate_status: 'ready',
      planning_status: 'generated',
      route_positioning: {
        duration_days: 2,
        travel_mode: 'public_transport',
        pace_preference: 'normal',
        theme_preferences: ['heritage']
      },
      summary: { total_days: 2, total_items: 4 },
      days: [
        { day_index: 1, region_key: 'zhanggong', items: [candidates[0], candidates[1]].map((item) => ({ item_key: item.item_key, title: item.title, region_key: item.region_key, family_friendly: item.family_friendly })) },
        { day_index: 2, region_key: 'zhanggong', items: [candidates[2], candidates[3]].map((item) => ({ item_key: item.item_key, title: item.title, region_key: item.region_key, family_friendly: item.family_friendly })) }
      ],
      route_highlights: [],
      adjustment_options: [],
      basis: { source: 'test', items: [] }
    }
  });

  const retainedKeys = schedule.days.flatMap((day) => day.items.map((item) => item.item_key));
  assert.ok(retainedKeys.includes('scenic:4'));
  assert.ok(retainedKeys.includes('scenic:5'));
  assert.equal(schedule.days[0].items.length, 3);
});

test('relax_pace respects new day shell capacity even when high value anchors are concentrated', () => {
  const snapshot = createSnapshot({ time_budget: { days: 2 }, pace_preference: 'relaxed' });
  const candidates = Array.from({ length: 6 }, (_, index) => scenicCandidate(index + 1, {
    score: 100 - index,
    hot_score: 100 - index
  }));
  const previousPublicPlan = {
    task_type: 'plan_route',
    candidate_status: 'ready',
    planning_status: 'generated',
    route_positioning: {
      duration_days: 2,
      travel_mode: 'public_transport',
      pace_preference: 'compact',
      theme_preferences: ['heritage']
    },
    summary: { total_days: 2, total_items: 6 },
    days: [
      { day_index: 1, region_key: 'zhanggong', items: candidates.slice(0, 4).map((item) => ({ item_key: item.item_key, title: item.title, region_key: item.region_key, family_friendly: item.family_friendly })) },
      { day_index: 2, region_key: 'zhanggong', items: candidates.slice(4).map((item) => ({ item_key: item.item_key, title: item.title, region_key: item.region_key, family_friendly: item.family_friendly })) }
    ],
    route_highlights: [],
    adjustment_options: [],
    basis: { source: 'test', items: [] }
  };

  const schedule = scheduleRoute({
    constraintsSnapshot: snapshot,
    internalBasis: buildBasis(candidates, snapshot),
    mode: 'revise',
    action: { type: 'relax_pace', payload: {} },
    previousPublicPlan
  });

  schedule.days.forEach((day) => assert.ok(day.items.length <= 2));
  assert.equal(schedule.days.reduce((count, day) => count + day.items.length, 0), 4);
});

test('focus_same_region without clear dominant region rolls back without clearing previous route', async () => {
  const generatedEntry = createGenerateRoutePlanEntry();
  const generated = await generatedEntry(createGeneratePayload());
  const previousPublicPlan = {
    ...omitPlanContext(generated.value),
    summary: { total_days: 2, total_items: 2 },
    days: [
      { day_index: 1, region_key: 'zhanggong', items: [{ item_key: 'scenic:1', title: '通天岩', region_key: 'zhanggong', family_friendly: true }] },
      { day_index: 2, region_key: 'anyuan', items: [{ item_key: 'scenic:4', title: '三百山', region_key: 'anyuan', family_friendly: true }] }
    ]
  };
  const previousPlanContext = {
    ...generated.value.plan_context,
    fingerprint: ''
  };
  previousPlanContext.fingerprint = createRouteFingerprint({
    publicPlan: previousPublicPlan,
    planContext: previousPlanContext
  });

  const revised = await reviseRoutePlan({
    previous_public_plan: previousPublicPlan,
    previous_plan_context: previousPlanContext,
    action: {
      type: 'focus_same_region'
    }
  });

  assert.equal(revised.ok, true);
  assert.equal(revised.value.plan_context.last_action_result.status, 'rejected');
  assert.equal(revised.value.plan_context.last_action_result.reason_code, 'ambiguous_target_region');
  assert.deepEqual(revised.value.days, previousPublicPlan.days);
  assert.equal(revised.value.plan_context.version, previousPlanContext.version + 1);
  assert.notEqual(revised.value.plan_context.fingerprint, previousPlanContext.fingerprint);
});

test('focus_same_region without payload applies when dominant region is clearly leading', async () => {
  const generatedEntry = createGenerateRoutePlanEntry();
  const generated = await generatedEntry(createGeneratePayload());
  const previousPublicPlan = {
    ...omitPlanContext(generated.value),
    summary: { total_days: 2, total_items: 3 },
    days: [
      {
        day_index: 1,
        region_key: 'zhanggong',
        items: [
          { item_key: 'scenic:1', title: '通天岩', region_key: 'zhanggong', family_friendly: true },
          { item_key: 'scenic:2', title: '郁孤台', region_key: 'zhanggong', family_friendly: true }
        ]
      },
      { day_index: 2, region_key: 'anyuan', items: [{ item_key: 'scenic:4', title: '三百山', region_key: 'anyuan', family_friendly: true }] }
    ]
  };
  const previousPlanContext = {
    ...generated.value.plan_context,
    fingerprint: ''
  };
  previousPlanContext.fingerprint = createRouteFingerprint({
    publicPlan: previousPublicPlan,
    planContext: previousPlanContext
  });

  const revised = await reviseRoutePlan({
    previous_public_plan: previousPublicPlan,
    previous_plan_context: previousPlanContext,
    action: {
      type: 'focus_same_region'
    }
  });

  assert.equal(revised.ok, true);
  assert.equal(revised.value.plan_context.last_action_result.status, 'applied');
  assert.equal(revised.value.plan_context.constraints_snapshot.focused_region_key, 'zhanggong');
  revised.value.days.forEach((day) => {
    day.items.forEach((item) => assert.equal(item.region_key, 'zhanggong'));
  });
});

test('focus_same_region invalid explicit target_region_key does not fall back to dominant region', () => {
  const previousPublicPlan = {
    task_type: 'plan_route',
    candidate_status: 'ready',
    planning_status: 'generated',
    route_positioning: {
      duration_days: 2,
      travel_mode: 'public_transport',
      pace_preference: 'normal',
      theme_preferences: ['heritage']
    },
    summary: { total_days: 2, total_items: 3 },
    days: [
      {
        day_index: 1,
        region_key: 'zhanggong',
        items: [
          { item_key: 'scenic:1', title: 'spot 1', region_key: 'zhanggong', family_friendly: true },
          { item_key: 'scenic:2', title: 'spot 2', region_key: 'zhanggong', family_friendly: true }
        ]
      },
      { day_index: 2, region_key: 'anyuan', items: [{ item_key: 'scenic:4', title: 'spot 4', region_key: 'anyuan', family_friendly: true }] }
    ],
    route_highlights: [],
    adjustment_options: [],
    basis: { source: 'test', items: [] }
  };

  const result = applyActionToConstraintsSnapshot(
    createSnapshot(),
    previousPublicPlan,
    {
      type: 'focus_same_region',
      payload: {
        target_region_key: 'invalid-region'
      }
    }
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason_code, 'invalid_target_region');
});

test('generate fallback returns contract-consistent empty day shells', async () => {
  const emptyRetrieve = async ({ mode }) => ({
    mode,
    candidates: [],
    scenic_candidates: [],
    article_candidates: [],
    diagnostics: []
  });
  const generateEntry = createGenerateRoutePlanEntry({ retrieve: emptyRetrieve });
  const result = await generateEntry(createGeneratePayload());

  assert.equal(result.ok, true);
  assert.equal(result.value.candidate_status, 'empty');
  assert.equal(result.value.summary.total_days, result.value.days.length);
  assert.equal(result.value.route_positioning.duration_days, result.value.summary.total_days);
  result.value.days.forEach((day) => {
    assert.ok(Number.isInteger(day.day_index));
    assert.ok(day.region_key);
    assert.deepEqual(day.items, []);
  });
});
