import { TRIP_CONSTRAINT_FIELDS } from '../trip-context-manager/contracts.js';
import { INTENT_CONTRACT } from './contracts.js';

const PRIOR_STATE_CONSTRAINT_FIELDS = Array.from(new Set([
  ...TRIP_CONSTRAINT_FIELDS,
  'money_budget',
  'status_flags',
  'subject_entities',
  'region_hints',
  'scenic_hints',
  'mentioned_entities',
  'exclude_entities',
  'option_limit'
]));

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function hasStructuredValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return normalizeText(value) !== '';
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasStructuredValue(item));
  }

  if (isPlainObject(value)) {
    return Object.values(value).some((item) => hasStructuredValue(item));
  }

  return true;
}

function copyArray(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = Array.from(new Set(value.map((item) => normalizeText(item)).filter(Boolean)));
  return normalized.length ? normalized : null;
}

function copyFlatTimeBudget(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const next = {};
  const days = Number(value.days);
  const dateText = normalizeText(value.date_text);

  if (Number.isInteger(days) && days > 0) {
    next.days = days;
  }

  if (dateText) {
    next.date_text = dateText;
  }

  return Object.keys(next).length ? next : null;
}

function copyConstraintValue(field, value) {
  if (field === 'time_budget') {
    return copyFlatTimeBudget(value);
  }

  if (['companions', 'hard_avoidances', 'physical_constraints', 'theme_preferences'].includes(field)) {
    return copyArray(value);
  }

  const normalized = normalizeText(value);
  return normalized || null;
}

function copyTripConstraints(source) {
  if (!isPlainObject(source)) {
    return {};
  }

  return TRIP_CONSTRAINT_FIELDS.reduce((constraints, field) => {
    const copied = copyConstraintValue(field, source[field]);

    if (hasStructuredValue(copied)) {
      constraints[field] = copied;
    }

    return constraints;
  }, {});
}

export function isEffectivePriorState(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  if (!INTENT_CONTRACT.RUNTIME_TASK_TYPES.includes(value.task_type)) {
    return false;
  }

  if (!isPlainObject(value.constraints)) {
    return false;
  }

  return PRIOR_STATE_CONSTRAINT_FIELDS.some((field) => hasStructuredValue(value.constraints[field]));
}

export function buildPriorStateFromSessionContext(previousSessionContext) {
  if (!isPlainObject(previousSessionContext) || !isPlainObject(previousSessionContext.trip_constraints)) {
    return null;
  }

  const constraints = copyTripConstraints(previousSessionContext.trip_constraints);

  if (!Object.keys(constraints).length) {
    return null;
  }

  return {
    task_type: 'discover_options',
    task_confidence: 0.9,
    constraints
  };
}

export function resolveDiscoveryQueryPriorState({
  explicitPriorState = null,
  previousSessionContext = null
} = {}) {
  if (isEffectivePriorState(explicitPriorState)) {
    return explicitPriorState;
  }

  return buildPriorStateFromSessionContext(previousSessionContext);
}
