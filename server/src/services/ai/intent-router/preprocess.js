import {
  INTENT_CONTRACT,
  createEmptyDiscoveryConstraints,
  createEmptyGuideConstraints,
  createEmptyNullTaskConstraints,
  createEmptyRouteConstraints
} from './contracts.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function clampConfidence(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(1, numeric));
}

function uniqStrings(items) {
  return Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => normalizeText(item))
        .filter(Boolean)
    )
  );
}

function normalizeOptionalString(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeTimeBudget(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const days = Number(value.days);
  const dateText = normalizeOptionalString(value.date_text);
  const normalized = {
    days: Number.isInteger(days) && days > 0 ? days : null,
    date_text: dateText
  };

  if (normalized.days === null && normalized.date_text === null) {
    return null;
  }

  return normalized;
}

function normalizeMoneyBudget(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const level = normalizeOptionalString(value.level);
  const amountText = normalizeOptionalString(value.amount_text);
  const normalized = {
    level: INTENT_CONTRACT.ENUMS.money_budget_level.includes(level) ? level : null,
    amount_text: amountText
  };

  if (normalized.level === null && normalized.amount_text === null) {
    return null;
  }

  return normalized;
}

function normalizeStatusFlags(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const alreadyHasPlan = typeof value.already_has_plan === 'boolean'
    ? value.already_has_plan
    : null;

  return alreadyHasPlan === null ? null : { already_has_plan: alreadyHasPlan };
}

function normalizeClearFields(value) {
  const allowed = new Set(INTENT_CONTRACT.ALLOWED_CLEAR_FIELDS);
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  const normalized = [];

  source.forEach((item) => {
    const field = normalizeText(item);

    if (!allowed.has(field) || seen.has(field)) {
      return;
    }

    seen.add(field);
    normalized.push(field);
  });

  return normalized.filter((field) => !field.includes('.') || !seen.has(field.split('.')[0]));
}

function hasStructuredValue(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isPlainObject(value)) {
    return Object.values(value).some((item) => hasStructuredValue(item));
  }

  return true;
}

function getDroppedPriorClearFields(priorConstraints) {
  const source = isPlainObject(priorConstraints) ? priorConstraints : {};

  return INTENT_CONTRACT.ROOT_CLEAR_FIELDS.filter((field) => hasStructuredValue(source[field]));
}

function appendClearFields(result, fields) {
  const clearFields = normalizeClearFields([
    ...(Array.isArray(result?.clear_fields) ? result.clear_fields : []),
    ...fields
  ]);

  return {
    ...result,
    clear_fields: clearFields
  };
}

function normalizeConstraintValue(key, value) {
  switch (key) {
    case 'time_budget':
      return normalizeTimeBudget(value);
    case 'money_budget':
      return normalizeMoneyBudget(value);
    case 'travel_mode': {
      const normalized = normalizeOptionalString(value);
      return INTENT_CONTRACT.ENUMS.travel_mode.includes(normalized) ? normalized : null;
    }
    case 'pace_preference': {
      const normalized = normalizeOptionalString(value);
      return INTENT_CONTRACT.ENUMS.pace_preference.includes(normalized) ? normalized : null;
    }
    case 'companions':
    case 'theme_preferences':
    case 'hard_avoidances':
    case 'physical_constraints':
    case 'subject_entities':
    case 'mentioned_entities':
    case 'exclude_entities':
    case 'region_hints':
    case 'scenic_hints':
      return uniqStrings(value) || null;
    case 'option_limit': {
      const numeric = Number(value);
      return Number.isInteger(numeric) ? numeric : null;
    }
    case 'route_origin':
    case 'destination_scope':
      return normalizeOptionalString(value);
    case 'status_flags':
      return normalizeStatusFlags(value);
    case 'user_query':
      return normalizeText(value);
    default:
      return null;
  }
}

function getConstraintTemplate(taskType, userQuery) {
  if (taskType === 'guide_understand') {
    return createEmptyGuideConstraints(userQuery);
  }

  if (taskType === 'plan_route') {
    return createEmptyRouteConstraints(userQuery);
  }

  if (INTENT_CONTRACT.DISCOVERY_TASK_TYPES.includes(taskType)) {
    return createEmptyDiscoveryConstraints(userQuery);
  }

  return createEmptyNullTaskConstraints(userQuery);
}

function fillTemplate(taskType, rawConstraints, userQuery = '') {
  const template = getConstraintTemplate(taskType, userQuery);

  Object.keys(template).forEach((key) => {
    if (key === 'user_query') {
      template[key] = normalizeText(userQuery || rawConstraints?.user_query || '');
      return;
    }

    template[key] = normalizeConstraintValue(key, rawConstraints?.[key]);
  });

  return template;
}

export function normalizePriorState(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const rawTaskType = value.task_type === null ? null : normalizeOptionalString(value.task_type);
  const taskType = INTENT_CONTRACT.RUNTIME_TASK_TYPES.includes(rawTaskType) ? rawTaskType : null;
  const taskConfidence = clampConfidence(value.task_confidence);
  const constraints = fillTemplate(taskType, isPlainObject(value.constraints) ? value.constraints : {}, '');

  return {
    task_type: taskType,
    task_confidence: taskConfidence,
    constraints
  };
}

export function preprocessInput(payload = {}) {
  const normalizedInput = normalizeText(payload.input);

  if (!normalizedInput) {
    const error = new Error('input is required');
    error.statusCode = 400;
    throw error;
  }

  return {
    normalizedInput,
    priorState: normalizePriorState(payload.priorState)
  };
}

function canUsePriorConstraints(result, priorState) {
  if (!priorState || !result?.task_type) {
    return false;
  }

  return result._meta?.decision_source === 'llm' && Number(result.task_confidence || 0) >= 0.75;
}

function copyMissingValues(currentValue, priorValue) {
  if (currentValue === null || currentValue === undefined || currentValue === '') {
    return priorValue ?? currentValue ?? null;
  }

  if (Array.isArray(currentValue)) {
    return currentValue;
  }

  if (isPlainObject(currentValue)) {
    if (!isPlainObject(priorValue)) {
      return currentValue;
    }

    const next = { ...currentValue };
    const keys = Array.from(new Set([...Object.keys(currentValue), ...Object.keys(priorValue)]));

    keys.forEach((key) => {
      next[key] = copyMissingValues(next[key], priorValue[key]);
    });

    return next;
  }

  return currentValue;
}

function applyClearFieldsToMergedConstraints(mergedConstraints, currentConstraints, clearFields) {
  const next = { ...mergedConstraints };

  clearFields.forEach((field) => {
    if (!field.includes('.')) {
      next[field] = currentConstraints?.[field] ?? null;
      return;
    }

    const [root, child] = field.split('.');

    if (!root || !child) {
      return;
    }

    const mergedRoot = isPlainObject(next[root]) ? { ...next[root] } : {};
    const currentRoot = isPlainObject(currentConstraints?.[root]) ? currentConstraints[root] : {};
    mergedRoot[child] = currentRoot[child] ?? null;
    next[root] = mergedRoot;
  });

  return next;
}

export function mergeWithPriorState(result, priorState) {
  const normalizedResult = appendClearFields(result, []);

  if (!priorState) {
    return normalizedResult;
  }

  const currentTaskType = normalizedResult.task_type;
  const priorTaskType = priorState.task_type;
  const canUsePrior = canUsePriorConstraints(normalizedResult, priorState);
  const nextMeta = {
    ...normalizedResult._meta,
    prior_state_usage: 'hint_only',
    rule_hits: Array.isArray(normalizedResult._meta?.rule_hits) ? [...normalizedResult._meta.rule_hits] : []
  };

  if (!currentTaskType || !canUsePrior) {
    if (priorTaskType) {
      nextMeta.rule_hits.push('prior_state_hint_only');
    }

    const droppedFields = currentTaskType && priorTaskType && currentTaskType !== priorTaskType
      ? getDroppedPriorClearFields(priorState.constraints)
      : [];

    return {
      ...appendClearFields(normalizedResult, droppedFields),
      _meta: nextMeta
    };
  }

  if (priorTaskType && currentTaskType !== priorTaskType) {
    nextMeta.rule_hits.push('prior_state_dropped_cross_intent');

    return {
      ...appendClearFields(normalizedResult, getDroppedPriorClearFields(priorState.constraints)),
      _meta: nextMeta
    };
  }

  if (priorTaskType !== currentTaskType) {
    return {
      ...normalizedResult,
      _meta: nextMeta
    };
  }

  nextMeta.rule_hits.push('prior_state_constraints_merged');
  nextMeta.prior_state_usage = 'merged';

  const mergedConstraints = copyMissingValues(normalizedResult.constraints, priorState.constraints);

  return {
    ...normalizedResult,
    constraints: applyClearFieldsToMergedConstraints(
      mergedConstraints,
      normalizedResult.constraints,
      normalizedResult.clear_fields
    ),
    _meta: nextMeta
  };
}
