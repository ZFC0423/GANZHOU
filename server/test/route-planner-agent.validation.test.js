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

test('validateRevisePayload rejects focus_same_region invalid explicit target_region_key', async () => {
  const generated = await generateRoutePlan(createGeneratePayload());

  const result = validateRevisePayload({
    previous_public_plan: omitPlanContext(generated.value),
    previous_plan_context: generated.value.plan_context,
    action: {
      type: 'focus_same_region',
      payload: {
        target_region_key: 'invalid-region'
      }
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'route_planner_invalid_action_payload');
  assert.equal(result.error.details[0].field, 'action.payload.target_region_key');
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
