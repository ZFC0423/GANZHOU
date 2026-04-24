import { TASK_TYPES, createDefaultContinuation } from './contracts.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => normalizeText(item)).filter(Boolean)));
  }

  if (typeof value === 'string') {
    const normalized = normalizeText(value);
    return normalized ? [normalized] : [];
  }

  return [];
}

function normalizeDestinationScope(value) {
  return normalizeStringArray(value);
}

function normalizeTaskType(taskType) {
  const normalized = normalizeText(taskType);
  return TASK_TYPES.includes(normalized) ? normalized : 'discover_options';
}

function pickConstraints(routerResult) {
  return isPlainObject(routerResult?.constraints) ? routerResult.constraints : {};
}

export function buildDiscoveryPayloadFromRouterResult(
  routerResult,
  {
    previous_public_result = null,
    decision_context = null,
    action = null
  } = {}
) {
  const source = pickConstraints(routerResult);
  const defaults = createDefaultContinuation();
  const subjectEntities = normalizeStringArray(source.subject_entities);
  const mentionedEntities = normalizeStringArray(source.mentioned_entities);

  return {
    task_type: normalizeTaskType(routerResult?.task_type),
    constraints: {
      subject_entities: Array.from(new Set([...subjectEntities, ...mentionedEntities])),
      scenic_hints: normalizeStringArray(source.scenic_hints),
      theme_preferences: normalizeStringArray(source.theme_preferences),
      region_hints: normalizeStringArray(source.region_hints),
      travel_mode: source.travel_mode ?? null,
      companions: normalizeStringArray(source.companions),
      hard_avoidances: normalizeStringArray(source.hard_avoidances),
      physical_constraints: normalizeStringArray(source.physical_constraints),
      time_budget: isPlainObject(source.time_budget) ? source.time_budget : null,
      pace_preference: source.pace_preference ?? null,
      route_origin: normalizeText(source.route_origin) || null,
      destination_scope: normalizeDestinationScope(source.destination_scope),
      option_limit: source.option_limit ?? defaults.option_limit
    },
    previous_public_result: isPlainObject(previous_public_result) ? previous_public_result : null,
    decision_context: isPlainObject(decision_context) ? decision_context : null,
    action: isPlainObject(action) ? action : null
  };
}
