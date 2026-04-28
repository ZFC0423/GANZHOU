import {
  ARRAY_CONSTRAINT_FIELDS,
  FORBIDDEN_DELTA_FIELDS,
  PACE_PREFERENCES,
  SCALAR_CONSTRAINT_FIELDS,
  TIME_BUDGET_FIELDS,
  TRAVEL_MODES,
  TRIP_CONSTRAINT_FIELDS,
  WARNING_CODES,
  createDefaultTripConstraints,
  createWarning
} from './contracts.js';
import {
  isPlainObject,
  normalizeClearFields,
  normalizeText,
  uniqStrings
} from './conflict-checker.js';

function normalizeArray(value) {
  return uniqStrings(Array.isArray(value) ? value : typeof value === 'string' ? [value] : []);
}

function normalizeScalar(field, value, warnings) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return { hasValue: false, value: null };
  }

  if (field === 'travel_mode' && !TRAVEL_MODES.includes(normalized)) {
    warnings.push(createWarning({
      code: WARNING_CODES.INVALID_CONSTRAINT_VALUE,
      field
    }));
    return { hasValue: false, value: null };
  }

  if (field === 'pace_preference' && !PACE_PREFERENCES.includes(normalized)) {
    warnings.push(createWarning({
      code: WARNING_CODES.INVALID_CONSTRAINT_VALUE,
      field
    }));
    return { hasValue: false, value: null };
  }

  return { hasValue: true, value: normalized };
}

function normalizeTimeBudget(value, warnings) {
  if (value === undefined || value === null) {
    return { hasValue: false, value: null, substantivePaths: new Set() };
  }

  if (!isPlainObject(value)) {
    warnings.push(createWarning({
      code: WARNING_CODES.INVALID_CONSTRAINT_VALUE,
      field: 'time_budget'
    }));
    return { hasValue: false, value: null, substantivePaths: new Set() };
  }

  const extraKeys = Object.keys(value).filter((key) => !TIME_BUDGET_FIELDS.includes(key));
  extraKeys.forEach((key) => {
    warnings.push(createWarning({
      code: WARNING_CODES.INVALID_CONSTRAINT_VALUE,
      field: `time_budget.${key}`
    }));
  });

  const normalized = {};
  const substantivePaths = new Set();

  if (Object.prototype.hasOwnProperty.call(value, 'days')) {
    const numeric = Number(value.days);

    if (Number.isInteger(numeric) && numeric >= 1) {
      normalized.days = numeric;
      substantivePaths.add('time_budget.days');
    } else if (value.days !== null && value.days !== undefined) {
      warnings.push(createWarning({
        code: WARNING_CODES.INVALID_CONSTRAINT_VALUE,
        field: 'time_budget.days'
      }));
    }
  }

  if (Object.prototype.hasOwnProperty.call(value, 'date_text')) {
    const dateText = normalizeText(value.date_text);

    if (dateText) {
      normalized.date_text = dateText;
      substantivePaths.add('time_budget.date_text');
    }
  }

  return {
    hasValue: Object.keys(normalized).length > 0,
    value: Object.keys(normalized).length ? normalized : null,
    substantivePaths
  };
}

function normalizePreviousConstraints(value) {
  const defaults = createDefaultTripConstraints();
  const source = isPlainObject(value) ? value : {};

  return {
    ...defaults,
    time_budget: normalizeTimeBudget(source.time_budget, []).value,
    travel_mode: TRAVEL_MODES.includes(normalizeText(source.travel_mode)) ? normalizeText(source.travel_mode) : null,
    companions: normalizeArray(source.companions),
    hard_avoidances: normalizeArray(source.hard_avoidances),
    physical_constraints: normalizeArray(source.physical_constraints),
    pace_preference: PACE_PREFERENCES.includes(normalizeText(source.pace_preference)) ? normalizeText(source.pace_preference) : null,
    route_origin: normalizeText(source.route_origin) || null,
    destination_scope: normalizeText(source.destination_scope) || null,
    theme_preferences: normalizeArray(source.theme_preferences)
  };
}

function normalizeDeltaConstraints(value, warnings) {
  const source = isPlainObject(value) ? value : {};
  const normalized = {};
  const substantiveFields = new Set();
  const substantivePaths = new Set();

  Object.keys(source).forEach((field) => {
    if (!TRIP_CONSTRAINT_FIELDS.includes(field) && !FORBIDDEN_DELTA_FIELDS.includes(field)) {
      warnings.push(createWarning({
        code: WARNING_CODES.INVALID_CONSTRAINT_FIELD,
        field
      }));
    }
  });

  FORBIDDEN_DELTA_FIELDS
    .filter((field) => Object.prototype.hasOwnProperty.call(source, field))
    .forEach((field) => {
      warnings.push(createWarning({
        code: WARNING_CODES.INVALID_CONSTRAINT_FIELD,
        field
      }));
    });

  ARRAY_CONSTRAINT_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(source, field) || source[field] === null || source[field] === undefined) {
      return;
    }

    const next = normalizeArray(source[field]);
    normalized[field] = next;
    if (next.length) {
      substantiveFields.add(field);
    }
  });

  SCALAR_CONSTRAINT_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(source, field) || source[field] === null || source[field] === undefined) {
      return;
    }

    const next = normalizeScalar(field, source[field], warnings);
    if (next.hasValue) {
      normalized[field] = next.value;
      substantiveFields.add(field);
    }
  });

  if (Object.prototype.hasOwnProperty.call(source, 'time_budget')) {
    const next = normalizeTimeBudget(source.time_budget, warnings);
    if (next.hasValue) {
      normalized.time_budget = next.value;
      substantiveFields.add('time_budget');
      next.substantivePaths.forEach((path) => substantivePaths.add(path));
    }
  }

  return { normalized, substantiveFields, substantivePaths };
}

function hasClearConflict(field, deltaInfo) {
  if (field === 'time_budget') {
    return deltaInfo.substantiveFields.has('time_budget');
  }

  if (field.startsWith('time_budget.')) {
    return deltaInfo.substantivePaths.has(field);
  }

  return deltaInfo.substantiveFields.has(field);
}

function clearField(context, field) {
  const next = { ...context };

  if (ARRAY_CONSTRAINT_FIELDS.includes(field)) {
    next[field] = [];
    return next;
  }

  if (field === 'time_budget') {
    next.time_budget = null;
    return next;
  }

  if (field.startsWith('time_budget.')) {
    const child = field.split('.')[1];
    const current = isPlainObject(next.time_budget) ? { ...next.time_budget } : {};
    delete current[child];
    next.time_budget = Object.keys(current).length ? current : null;
    return next;
  }

  next[field] = null;
  return next;
}

function applyDelta(context, delta) {
  const next = { ...context };

  Object.entries(delta).forEach(([field, value]) => {
    if (field === 'time_budget') {
      next.time_budget = {
        ...(isPlainObject(next.time_budget) ? next.time_budget : {}),
        ...value
      };
      return;
    }

    next[field] = value;
  });

  if (isPlainObject(next.time_budget) && !Object.keys(next.time_budget).length) {
    next.time_budget = null;
  }

  return next;
}

export function mergeConstraints({
  previousTripConstraints,
  deltaConstraints,
  clearFields
}) {
  const warnings = [];
  const previous = normalizePreviousConstraints(previousTripConstraints);
  const deltaInfo = normalizeDeltaConstraints(deltaConstraints, warnings);
  const safeClearFields = normalizeClearFields(clearFields, warnings);
  const clearedFields = [];
  let next = previous;

  safeClearFields.forEach((field) => {
    if (hasClearConflict(field, deltaInfo)) {
      warnings.push(createWarning({
        code: WARNING_CODES.CLEAR_FIELD_CONFLICTS_WITH_DELTA,
        field
      }));

      if (!field.includes('.')) {
        next = clearField(next, field);
      }
      return;
    }

    next = clearField(next, field);
    clearedFields.push(field);
  });

  next = applyDelta(next, deltaInfo.normalized);

  return {
    trip_constraints: next,
    applied_delta: deltaInfo.normalized,
    cleared_fields: clearedFields,
    warnings,
    changed: Boolean(
      Object.keys(deltaInfo.normalized).length ||
      clearedFields.length ||
      safeClearFields.some((field) => hasClearConflict(field, deltaInfo))
    )
  };
}
