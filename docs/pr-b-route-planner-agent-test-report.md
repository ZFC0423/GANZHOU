# PR-B route-planner-agent ?????????

## ??????

- ???????`server/test/route-planner-agent.contract.test.js`
- ???????`server/test/route-planner-agent.validation.test.js`
- ???????`server/test/route-plan-controller.test.js`
- ???????`server/test/route-plan-route.http.test.js`
- ??????`server/test/route-planner-agent.retrieve.test.js`
- ??????`server/test/route-planner-agent.basis.test.js`
- ??????`server/test/route-planner-agent.schedule.test.js`
- ??????`server/test/route-planner-agent.repair-policy.test.js`
- ??????`server/test/route-planner-agent.rollback.test.js`
- ?? retrieve / basis / schedule / repair-policy / rollback / fallback ?????????`server/test/route-planner-agent.pr-b.test.js`

## ????????

```powershell
cd server
node --test --test-isolation=none test/route-planner-agent.contract.test.js test/route-planner-agent.validation.test.js test/route-planner-agent.pr-b.test.js test/route-plan-controller.test.js test/route-plan-route.http.test.js
```

```text
tests 34
pass 34
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 11639.7991
```

## ??Contract Tests

???`server/test/route-planner-agent.contract.test.js`

?? PR-B public shape?fingerprint allowlist?last_action_result ????????

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { generateRoutePlan, reviseRoutePlan } from '../src/services/ai/route-planner-agent/index.js';
import { createRouteFingerprint } from '../src/services/ai/route-planner-agent/mock.js';

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

function omitPlanContext(plan) {
  const { plan_context, ...publicPlan } = plan;
  return publicPlan;
}

test('generate returns fixed PR-B public shape with lightweight plan_context', async () => {
  const result = await generateRoutePlan(createGeneratePayload());

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.value).sort(), [
    'adjustment_options',
    'basis',
    'candidate_status',
    'days',
    'plan_context',
    'planning_status',
    'route_highlights',
    'route_positioning',
    'summary',
    'task_type'
  ]);
  assert.deepEqual(Object.keys(result.value.plan_context).sort(), [
    'constraints_snapshot',
    'fingerprint',
    'last_action',
    'last_action_result',
    'parent_fingerprint',
    'source',
    'version'
  ]);
  assert.ok(['ready', 'limited', 'empty'].includes(result.value.candidate_status));
  assert.equal(result.value.planning_status, 'generated');
  assert.equal(result.value.route_positioning.duration_days, result.value.summary.total_days);
  assert.equal(result.value.summary.total_days, result.value.days.length);
  assert.ok(result.value.basis.items.length <= 20);
  assert.equal(result.value.plan_context.version, 1);
  assert.equal(result.value.plan_context.parent_fingerprint, null);
  assert.equal(result.value.plan_context.last_action, null);
  assert.equal(result.value.plan_context.last_action_result, null);
});

test('revise compress_to_one_day updates public output and current effective constraints snapshot', async () => {
  const generated = await generateRoutePlan(createGeneratePayload());

  const revised = await reviseRoutePlan({
    previous_public_plan: omitPlanContext(generated.value),
    previous_plan_context: generated.value.plan_context,
    action: {
      type: 'compress_to_one_day'
    }
  });

  assert.equal(revised.ok, true);
  assert.equal(revised.value.planning_status, 'revised');
  assert.equal(revised.value.route_positioning.duration_days, 1);
  assert.equal(revised.value.summary.total_days, 1);
  assert.equal(revised.value.plan_context.version, 2);
  assert.equal(revised.value.plan_context.parent_fingerprint, generated.value.plan_context.fingerprint);
  assert.equal(revised.value.plan_context.last_action.type, 'compress_to_one_day');
  assert.deepEqual(revised.value.plan_context.last_action.payload, {});
  assert.equal(revised.value.plan_context.last_action_result.status, 'applied');
  assert.equal(revised.value.plan_context.constraints_snapshot.time_budget.days, 1);
  assert.notEqual(revised.value.plan_context.fingerprint, generated.value.plan_context.fingerprint);
});

test('revise updates snapshot flags for family, focus, relaxed pace and region-level far replacement', async () => {
  const generated = await generateRoutePlan(createGeneratePayload({
    routerResult: {
      ...createGeneratePayload().routerResult,
      constraints: {
        ...createGeneratePayload().routerResult.constraints,
        theme_preferences: ['heritage', 'food'],
        pace_preference: 'normal'
      }
    }
  }));

  const familyRevised = await reviseRoutePlan({
    previous_public_plan: omitPlanContext(generated.value),
    previous_plan_context: generated.value.plan_context,
    action: {
      type: 'family_friendly_only',
      payload: {}
    }
  });

  assert.equal(familyRevised.ok, true);
  assert.equal(familyRevised.value.plan_context.constraints_snapshot.family_friendly_only, true);
  familyRevised.value.days.forEach((day) => {
    day.items.forEach((item) => assert.equal(item.family_friendly, true));
  });

  const focusRevised = await reviseRoutePlan({
    previous_public_plan: omitPlanContext(familyRevised.value),
    previous_plan_context: familyRevised.value.plan_context,
    action: {
      type: 'focus_same_region',
      payload: {
        target_region_key: 'zhanggong'
      }
    }
  });

  assert.equal(focusRevised.ok, true);
  assert.equal(focusRevised.value.plan_context.constraints_snapshot.same_region_only, true);
  assert.equal(focusRevised.value.plan_context.constraints_snapshot.focused_region_key, 'zhanggong');
  focusRevised.value.days.forEach((day) => {
    assert.equal(day.region_key, 'zhanggong');
    day.items.forEach((item) => assert.equal(item.region_key, 'zhanggong'));
  });

  const relaxedRevised = await reviseRoutePlan({
    previous_public_plan: omitPlanContext(focusRevised.value),
    previous_plan_context: focusRevised.value.plan_context,
    action: {
      type: 'relax_pace'
    }
  });

  assert.equal(relaxedRevised.ok, true);
  assert.equal(relaxedRevised.value.route_positioning.pace_preference, 'relaxed');
  relaxedRevised.value.days.forEach((day) => assert.ok(day.items.length <= 2));

  const nearRevised = await reviseRoutePlan({
    previous_public_plan: omitPlanContext(relaxedRevised.value),
    previous_plan_context: relaxedRevised.value.plan_context,
    action: {
      type: 'replace_far_spots'
    }
  });

  assert.equal(nearRevised.ok, true);
  assert.equal(nearRevised.value.plan_context.constraints_snapshot.avoid_far_spots, true);
  nearRevised.value.days.forEach((day) => {
    day.items.forEach((item) => assert.equal(item.region_key, day.region_key));
  });
});

test('fingerprint ignores non-allowlisted extra fields', async () => {
  const generated = await generateRoutePlan(createGeneratePayload({
    routerResult: {
      ...createGeneratePayload().routerResult,
      constraints: {
        ...createGeneratePayload().routerResult.constraints,
        theme_preferences: ['heritage', 'food']
      }
    }
  }));
  const previousPublicPlan = {
    ...omitPlanContext(generated.value),
    extra_panel: {
      expanded: true
    },
    route_positioning: {
      ...generated.value.route_positioning,
      debug_label: 'should-not-count'
    },
    adjustment_options: generated.value.adjustment_options.map((option) => ({
      ...option,
      tooltip: 'ignored'
    })),
    basis: {
      ...generated.value.basis,
      items: generated.value.basis.items.map((item) => ({
        ...item,
        raw_record: {
          ignored: true
        }
      }))
    }
  };

  const fingerprint = createRouteFingerprint({
    publicPlan: previousPublicPlan,
    planContext: generated.value.plan_context
  });

  assert.equal(fingerprint, generated.value.plan_context.fingerprint);
});

test('fingerprint stays stable after allowlisted array canonical normalization', async () => {
  const generated = await generateRoutePlan(createGeneratePayload({
    routerResult: {
      ...createGeneratePayload().routerResult,
      constraints: {
        ...createGeneratePayload().routerResult.constraints,
        theme_preferences: ['heritage', 'food']
      }
    }
  }));

  const previousPublicPlan = {
    ...omitPlanContext(generated.value),
    route_positioning: {
      ...generated.value.route_positioning,
      theme_preferences: [...generated.value.route_positioning.theme_preferences].reverse()
    },
    route_highlights: [...generated.value.route_highlights].reverse()
  };

  const fingerprint = createRouteFingerprint({
    publicPlan: previousPublicPlan,
    planContext: generated.value.plan_context
  });

  assert.equal(fingerprint, generated.value.plan_context.fingerprint);
});

test('fingerprint ignores last_action_result message and diagnostics noise', async () => {
  const generated = await generateRoutePlan(createGeneratePayload());
  const revised = await reviseRoutePlan({
    previous_public_plan: omitPlanContext(generated.value),
    previous_plan_context: generated.value.plan_context,
    action: {
      type: 'compress_to_one_day'
    }
  });
  const noisyContext = {
    ...revised.value.plan_context,
    last_action_result: {
      ...revised.value.plan_context.last_action_result,
      message: 'changed wording',
      diagnostics: ['changed_debug_note']
    }
  };

  const fingerprint = createRouteFingerprint({
    publicPlan: omitPlanContext(revised.value),
    planContext: noisyContext
  });

  assert.equal(fingerprint, revised.value.plan_context.fingerprint);
});
```

## ??Validation Tests

???`server/test/route-planner-agent.validation.test.js`

?? generate/revise payload ???payload-free action?focus_same_region payload?previous_public_plan ?????

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { validateGeneratePayload, validateRevisePayload } from '../src/services/ai/route-planner-agent/validate.js';
import { generateRoutePlan } from '../src/services/ai/route-planner-agent/index.js';
import { reviseRoutePlanEntry } from '../src/services/ai/route-planner-agent/revise-entry.js';

function createGeneratePayload() {
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
        user_query: '两天公共交通看老城',
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

function omitPlanContext(plan) {
  const { plan_context, ...publicPlan } = plan;
  return publicPlan;
}

test('validateGeneratePayload returns normalized current effective constraints snapshot', () => {
  const result = validateGeneratePayload(createGeneratePayload());

  assert.equal(result.ok, true);
  assert.equal(result.value.constraints_snapshot.time_budget.days, 2);
  assert.equal(result.value.constraints_snapshot.travel_mode, 'public_transport');
  assert.equal(result.value.constraints_snapshot.pace_preference, 'relaxed');
  assert.deepEqual(result.value.constraints_snapshot.theme_preferences, ['food']);
  assert.deepEqual(result.value.constraints_snapshot.companions, []);
  assert.equal(result.value.constraints_snapshot.family_friendly_only, false);
});

test('validateRevisePayload normalizes payload-free actions to empty payload objects', async () => {
  const generated = await generateRoutePlan(createGeneratePayload());

  const result = validateRevisePayload({
    previous_public_plan: omitPlanContext(generated.value),
    previous_plan_context: generated.value.plan_context,
    action: {
      type: 'relax_pace'
    }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.action.payload, {});
});

test('validateRevisePayload rejects extra action payload fields for payload-free actions', async () => {
  const generated = await generateRoutePlan(createGeneratePayload());

  const result = validateRevisePayload({
    previous_public_plan: omitPlanContext(generated.value),
    previous_plan_context: generated.value.plan_context,
    action: {
      type: 'replace_far_spots',
      payload: {
        manual_region: 'zhanggong'
      }
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'route_planner_invalid_action_payload');
});

test('validateRevisePayload accepts focus_same_region target_region_key payload only for that action', async () => {
  const generated = await generateRoutePlan(createGeneratePayload());

  const result = validateRevisePayload({
    previous_public_plan: omitPlanContext(generated.value),
    previous_plan_context: generated.value.plan_context,
    action: {
      type: 'focus_same_region',
      payload: {
        target_region_key: 'zhanggong'
      }
    }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.action.payload, {
    target_region_key: 'zhanggong'
  });
});

test('validateRevisePayload rejects previous_public_plan containing plan_context', async () => {
  const generated = await generateRoutePlan(createGeneratePayload());

  const result = validateRevisePayload({
    previous_public_plan: generated.value,
    previous_plan_context: generated.value.plan_context,
    action: {
      type: 'compress_to_one_day'
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'route_planner_invalid_previous_public_plan');
});

test('validateRevisePayload rejects previous_public_plan.route_highlights = null', async () => {
  const generated = await generateRoutePlan(createGeneratePayload());

  const result = validateRevisePayload({
    previous_public_plan: {
      ...omitPlanContext(generated.value),
      route_highlights: null
    },
    previous_plan_context: generated.value.plan_context,
    action: {
      type: 'compress_to_one_day'
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'route_planner_invalid_previous_public_plan');
});

test('validateRevisePayload rejects previous_public_plan.route_highlights = undefined', async () => {
  const generated = await generateRoutePlan(createGeneratePayload());

  const result = validateRevisePayload({
    previous_public_plan: {
      ...omitPlanContext(generated.value),
      route_highlights: undefined
    },
    previous_plan_context: generated.value.plan_context,
    action: {
      type: 'compress_to_one_day'
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'route_planner_invalid_previous_public_plan');
});

test('validateRevisePayload accepts previous_public_plan.route_highlights = []', async () => {
  const generated = await generateRoutePlan(createGeneratePayload());

  const result = validateRevisePayload({
    previous_public_plan: {
      ...omitPlanContext(generated.value),
      route_highlights: []
    },
    previous_plan_context: generated.value.plan_context,
    action: {
      type: 'compress_to_one_day'
    }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.previous_public_plan.route_highlights, []);
});

test('revise entry returns structured fingerprint mismatch when allowlisted previous plan fields drift', async () => {
  const generated = await generateRoutePlan(createGeneratePayload());
  const driftedPlan = omitPlanContext(generated.value);
  driftedPlan.route_highlights = ['drifted-highlight'];

  const result = await reviseRoutePlanEntry({
    previous_public_plan: driftedPlan,
    previous_plan_context: generated.value.plan_context,
    action: {
      type: 'compress_to_one_day'
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'route_planner_previous_fingerprint_mismatch');
});
```

## ??PR-B ???? Tests

???`server/test/route-planner-agent.pr-b.test.js`

?? retrieve / basis / schedule / repair-policy / rollback / fallback ?????????????????????

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildInternalBasis, classifyCandidateStatus, projectPublicBasisItems } from '../src/services/ai/route-planner-agent/basis.js';
import { CANDIDATE_STATUS } from '../src/services/ai/route-planner-agent/contracts.js';
import { createGenerateRoutePlanEntry } from '../src/services/ai/route-planner-agent/generate-entry.js';
import { createRouteFingerprint } from '../src/services/ai/route-planner-agent/mock.js';
import { collectRouteCandidates } from '../src/services/ai/route-planner-agent/retrieve.js';
import { reviseRoutePlan } from '../src/services/ai/route-planner-agent/index.js';
import { scheduleRoute } from '../src/services/ai/route-planner-agent/schedule.js';

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
```

## ??Controller Tests

???`server/test/route-plan-controller.test.js`

?? controller ? requestMeta?service result/error contract ????

```js
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
```

## ??HTTP Route Tests

???`server/test/route-plan-route.http.test.js`

?? /api/front/ai/route-plan/generate ? /api/front/ai/route-plan/revise ? HTTP ?????

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import app from '../src/app.js';

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
  });
});

test('route-plan revise route returns wrapped revised payload', async () => {
  await withServer(async (port) => {
    const generateResponse = await makeRequest({
      port,
      path: '/api/front/ai/route-plan/generate',
      body: createGenerateBody()
    });

    const { plan_context, ...previousPublicPlan } = generateResponse.json.data;

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
```

