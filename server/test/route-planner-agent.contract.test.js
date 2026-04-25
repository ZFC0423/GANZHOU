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
    'task_type',
    'warnings'
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
  assert.deepEqual(result.value.warnings, []);
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
