// @ts-check

/** @typedef {import('./types.js').Action} Action */
/** @typedef {import('./types.js').ActionType} ActionType */
/** @typedef {import('./types.js').ConstraintsSnapshot} ConstraintsSnapshot */
/** @typedef {import('./types.js').GeneratePayload} GeneratePayload */
/** @typedef {import('./types.js').NarrativePayload} NarrativePayload */
/** @typedef {import('./types.js').PlanContext} PlanContext */
/** @typedef {import('./types.js').PublicRoutePlan} PublicRoutePlan */
/** @typedef {import('./types.js').RouteNarrative} RouteNarrative */
/** @typedef {import('./types.js').RevisePayload} RevisePayload */

/**
 * @typedef {{
 *   field: string,
 *   reason: string,
 *   expected: unknown,
 *   actual: unknown
 * }} ValidationDetail
 */

/**
 * @typedef {{
 *   code: string,
 *   message: string,
 *   httpStatus: number,
 *   details: ValidationDetail[]
 * }} ValidationError
 */

/**
 * @template T
 * @typedef {{ ok: true, value: T } | { ok: false, error: ValidationError }} ValidationResult
 */

/** @typedef {Error & { code?: string, details?: ValidationDetail[] }} RoutePlannerAssertionError */

import {
  ACTION_LABELS,
  ACTION_PAYLOAD_RULES,
  ACTION_TYPES,
  ADJUSTMENT_OPTION_FIELDS,
  BASIS_FIELDS,
  CANDIDATE_STATUS,
  CONSTRAINT_SNAPSHOT_FIELDS,
  DAY_FIELDS,
  ERROR_CODES,
  FINGERPRINT_PLAN_CONTEXT_FIELDS,
  FINGERPRINT_PUBLIC_PLAN_FIELDS,
  ITEM_FIELDS,
  LAST_ACTION_RESULT_FIELDS,
  LAST_ACTION_RESULT_STATUS,
  NARRATIVE_DAY_SUMMARY_FIELDS,
  NARRATIVE_FIELDS,
  PACE_PREFERENCES,
  PLAN_CONTEXT_FIELDS,
  PLANNING_STATUS,
  PUBLIC_BASIS_ITEM_FIELDS,
  PUBLIC_BASIS_ITEM_LIMIT,
  PUBLIC_PLAN_TOP_LEVEL_FIELDS,
  REGION_ALIASES,
  REVISION_PUBLIC_PLAN_FIELDS,
  ROUTE_PLANNER_TASK_TYPE,
  ROUTE_POSITIONING_FIELDS,
  SUMMARY_FIELDS,
  TRAVEL_MODES,
  createEmptyConstraintsSnapshot
} from './contracts.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeKnownRegionKey(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return null;
  }

  return REGION_ALIASES[raw] || REGION_ALIASES[raw.toLowerCase()] || null;
}

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((accumulator, key) => {
      accumulator[key] = sortObjectKeys(value[key]);
      return accumulator;
    }, {});
}

function createValidationError(code, message, details = []) {
  return {
    code,
    message,
    httpStatus: 400,
    details
  };
}

function ok(value) {
  return { ok: true, value };
}

function fail(code, message, details = []) {
  return {
    ok: false,
    error: createValidationError(code, message, details)
  };
}

function createDetail(field, reason, expected, actual) {
  return {
    field,
    reason,
    expected,
    actual
  };
}

function pushIfExtraKeys(target, allowedKeys, field, details) {
  if (!isPlainObject(target)) {
    return;
  }

  Object.keys(target)
    .filter((key) => !allowedKeys.includes(key))
    .forEach((key) => {
      details.push(createDetail(`${field}.${key}`, 'unsupported', `allowed keys: ${allowedKeys.join(', ')}`, target[key]));
    });
}

function normalizeNullableString(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeStringArray(value, options = {}) {
  const {
    field,
    defaultToEmpty = false,
    sortValues = true,
    code = ERROR_CODES.INVALID_REVISE_PAYLOAD
  } = options;

  if (value === undefined) {
    return ok(defaultToEmpty ? [] : undefined);
  }

  if (value === null) {
    return ok(defaultToEmpty ? [] : null);
  }

  if (!Array.isArray(value)) {
    return fail(code, `${field} must be an array`, [
      createDetail(field, 'invalid_type', 'array', value)
    ]);
  }

  const unique = Array.from(new Set(value.map((item) => normalizeText(item)).filter(Boolean)));

  if (sortValues) {
    unique.sort((left, right) => left.localeCompare(right, 'zh-CN'));
  }

  return ok(unique);
}

function normalizeEnum(value, field, allowedValues, code = ERROR_CODES.INVALID_REVISE_PAYLOAD) {
  const normalized = normalizeText(value);

  if (!normalized || !allowedValues.includes(normalized)) {
    return fail(code, `${field} is invalid`, [
      createDetail(field, 'invalid_enum', allowedValues.join(', '), value)
    ]);
  }

  return ok(normalized);
}

function normalizePositiveInteger(value, field, { allowZero = false, code = ERROR_CODES.INVALID_REVISE_PAYLOAD } = {}) {
  const numeric = Number(value);
  const isValid = allowZero ? Number.isInteger(numeric) && numeric >= 0 : Number.isInteger(numeric) && numeric > 0;

  if (!isValid) {
    return fail(code, `${field} must be ${allowZero ? 'a non-negative' : 'a positive'} integer`, [
      createDetail(field, 'invalid_number', allowZero ? 'non-negative integer' : 'positive integer', value)
    ]);
  }

  return ok(numeric);
}

function normalizeBoolean(value, field, defaultValue = false, code = ERROR_CODES.INVALID_REVISE_PAYLOAD) {
  if (value === undefined) {
    return ok(defaultValue);
  }

  if (typeof value !== 'boolean') {
    return fail(code, `${field} must be boolean`, [
      createDetail(field, 'invalid_type', 'boolean', value)
    ]);
  }

  return ok(value);
}

function normalizeTimeBudget(value, field, { required = true, code = ERROR_CODES.INVALID_REVISE_PAYLOAD } = {}) {
  if (value === undefined || value === null) {
    if (!required) {
      return ok({ days: null });
    }

    return fail(code, `${field} is required`, [
      createDetail(field, 'required', 'object with days', value)
    ]);
  }

  if (!isPlainObject(value)) {
    return fail(code, `${field} must be an object`, [
      createDetail(field, 'invalid_type', 'object', value)
    ]);
  }

  const details = [];
  pushIfExtraKeys(value, ['days'], field, details);

  const normalizedDays = normalizePositiveInteger(value.days, `${field}.days`, { code });
  if (!normalizedDays.ok) {
    return normalizedDays;
  }

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  return ok({
    days: normalizedDays.value
  });
}

export function normalizeConstraintsSnapshot(value, options = {}) {
  const {
    field = 'constraints_snapshot',
    code = ERROR_CODES.INVALID_PREVIOUS_PLAN_CONTEXT,
    required = true,
    strictExtraKeys = false
  } = options;

  if (value === undefined || value === null) {
    if (!required) {
      return ok(createEmptyConstraintsSnapshot());
    }

    return fail(code, `${field} is required`, [
      createDetail(field, 'required', 'object', value)
    ]);
  }

  if (!isPlainObject(value)) {
    return fail(code, `${field} must be an object`, [
      createDetail(field, 'invalid_type', 'object', value)
    ]);
  }

  const details = [];
  if (strictExtraKeys) {
    pushIfExtraKeys(value, CONSTRAINT_SNAPSHOT_FIELDS, field, details);
  }

  const timeBudgetResult = normalizeTimeBudget(value.time_budget, `${field}.time_budget`, { required: true, code });
  if (!timeBudgetResult.ok) return timeBudgetResult;

  const travelModeResult = normalizeEnum(value.travel_mode, `${field}.travel_mode`, TRAVEL_MODES, code);
  if (!travelModeResult.ok) return travelModeResult;

  const paceResult = normalizeEnum(value.pace_preference, `${field}.pace_preference`, PACE_PREFERENCES, code);
  if (!paceResult.ok) return paceResult;

  const themeResult = normalizeStringArray(value.theme_preferences, {
    field: `${field}.theme_preferences`,
    defaultToEmpty: true,
    sortValues: true,
    code
  });
  if (!themeResult.ok) return themeResult;

  const companionsResult = normalizeStringArray(value.companions, {
    field: `${field}.companions`,
    defaultToEmpty: true,
    sortValues: true,
    code
  });
  if (!companionsResult.ok) return companionsResult;

  const avoidancesResult = normalizeStringArray(value.hard_avoidances, {
    field: `${field}.hard_avoidances`,
    defaultToEmpty: true,
    sortValues: true,
    code
  });
  if (!avoidancesResult.ok) return avoidancesResult;

  const physicalResult = normalizeStringArray(value.physical_constraints, {
    field: `${field}.physical_constraints`,
    defaultToEmpty: true,
    sortValues: true,
    code
  });
  if (!physicalResult.ok) return physicalResult;

  const familyResult = normalizeBoolean(value.family_friendly_only, `${field}.family_friendly_only`, false, code);
  if (!familyResult.ok) return familyResult;

  const sameRegionResult = normalizeBoolean(value.same_region_only, `${field}.same_region_only`, false, code);
  if (!sameRegionResult.ok) return sameRegionResult;

  const avoidFarResult = normalizeBoolean(value.avoid_far_spots, `${field}.avoid_far_spots`, false, code);
  if (!avoidFarResult.ok) return avoidFarResult;

  const routeOrigin = normalizeNullableString(value.route_origin);
  const destinationScope = normalizeNullableString(value.destination_scope);
  const focusedRegionKey = normalizeNullableString(value.focused_region_key);

  if (sameRegionResult.value && !focusedRegionKey) {
    return fail(code, `${field}.focused_region_key is required when same_region_only is true`, [
      createDetail(`${field}.focused_region_key`, 'required', 'non-empty string', value.focused_region_key)
    ]);
  }

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  return ok({
    time_budget: timeBudgetResult.value,
    travel_mode: travelModeResult.value,
    pace_preference: paceResult.value,
    theme_preferences: themeResult.value,
    companions: companionsResult.value,
    hard_avoidances: avoidancesResult.value,
    physical_constraints: physicalResult.value,
    route_origin: routeOrigin,
    destination_scope: destinationScope,
    family_friendly_only: familyResult.value,
    same_region_only: sameRegionResult.value,
    focused_region_key: sameRegionResult.value ? focusedRegionKey : null,
    avoid_far_spots: avoidFarResult.value
  });
}

function normalizeRoutePositioning(value, options = {}) {
  const {
    field = 'route_positioning',
    code = ERROR_CODES.INVALID_PREVIOUS_PUBLIC_PLAN,
    strictExtraKeys = false
  } = options;

  if (!isPlainObject(value)) {
    return fail(code, `${field} must be an object`, [
      createDetail(field, 'invalid_type', 'object', value)
    ]);
  }

  const details = [];
  if (strictExtraKeys) {
    pushIfExtraKeys(value, ROUTE_POSITIONING_FIELDS, field, details);
  }

  const durationResult = normalizePositiveInteger(value.duration_days, `${field}.duration_days`, { code });
  if (!durationResult.ok) return durationResult;

  const travelModeResult = normalizeEnum(value.travel_mode, `${field}.travel_mode`, TRAVEL_MODES, code);
  if (!travelModeResult.ok) return travelModeResult;

  const paceResult = normalizeEnum(value.pace_preference, `${field}.pace_preference`, PACE_PREFERENCES, code);
  if (!paceResult.ok) return paceResult;

  const themeResult = normalizeStringArray(value.theme_preferences, {
    field: `${field}.theme_preferences`,
    defaultToEmpty: true,
    sortValues: true,
    code
  });
  if (!themeResult.ok) return themeResult;

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  return ok({
    duration_days: durationResult.value,
    travel_mode: travelModeResult.value,
    pace_preference: paceResult.value,
    theme_preferences: themeResult.value
  });
}

function normalizeSummary(value, options = {}) {
  const {
    field = 'summary',
    code = ERROR_CODES.INVALID_PREVIOUS_PUBLIC_PLAN,
    strictExtraKeys = false
  } = options;

  if (!isPlainObject(value)) {
    return fail(code, `${field} must be an object`, [
      createDetail(field, 'invalid_type', 'object', value)
    ]);
  }

  const details = [];
  if (strictExtraKeys) {
    pushIfExtraKeys(value, SUMMARY_FIELDS, field, details);
  }

  const totalDaysResult = normalizePositiveInteger(value.total_days, `${field}.total_days`, { code });
  if (!totalDaysResult.ok) return totalDaysResult;

  const totalItemsResult = normalizePositiveInteger(value.total_items, `${field}.total_items`, {
    allowZero: true,
    code
  });
  if (!totalItemsResult.ok) return totalItemsResult;

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  return ok({
    total_days: totalDaysResult.value,
    total_items: totalItemsResult.value
  });
}

function normalizeDays(value, options = {}) {
  const {
    field = 'days',
    code = ERROR_CODES.INVALID_PREVIOUS_PUBLIC_PLAN,
    strictExtraKeys = false
  } = options;

  if (!Array.isArray(value) || !value.length) {
    return fail(code, `${field} must be a non-empty array`, [
      createDetail(field, 'invalid_type', 'non-empty array', value)
    ]);
  }

  const normalized = [];

  for (let index = 0; index < value.length; index += 1) {
    const day = value[index];
    const dayField = `${field}[${index}]`;

    if (!isPlainObject(day)) {
      return fail(code, `${dayField} must be an object`, [
        createDetail(dayField, 'invalid_type', 'object', day)
      ]);
    }

    const details = [];
    if (strictExtraKeys) {
      pushIfExtraKeys(day, DAY_FIELDS, dayField, details);
    }

    const dayIndexResult = normalizePositiveInteger(day.day_index, `${dayField}.day_index`, { code });
    if (!dayIndexResult.ok) return dayIndexResult;

    const regionKey = normalizeText(day.region_key);
    if (!regionKey) {
      return fail(code, `${dayField}.region_key is required`, [
        createDetail(`${dayField}.region_key`, 'required', 'non-empty string', day.region_key)
      ]);
    }

    if (!Array.isArray(day.items)) {
      return fail(code, `${dayField}.items must be an array`, [
        createDetail(`${dayField}.items`, 'invalid_type', 'array', day.items)
      ]);
    }

    const items = [];
    for (let itemIndex = 0; itemIndex < day.items.length; itemIndex += 1) {
      const item = day.items[itemIndex];
      const itemField = `${dayField}.items[${itemIndex}]`;

      if (!isPlainObject(item)) {
        return fail(code, `${itemField} must be an object`, [
          createDetail(itemField, 'invalid_type', 'object', item)
        ]);
      }

      if (strictExtraKeys) {
        pushIfExtraKeys(item, ITEM_FIELDS, itemField, details);
      }

      const itemKey = normalizeText(item.item_key);
      const title = normalizeText(item.title);
      const itemRegionKey = normalizeText(item.region_key);

      if (!itemKey || !title || !itemRegionKey) {
        return fail(code, `${itemField} contains required empty fields`, [
          createDetail(`${itemField}.item_key`, 'required', 'non-empty string', item.item_key),
          createDetail(`${itemField}.title`, 'required', 'non-empty string', item.title),
          createDetail(`${itemField}.region_key`, 'required', 'non-empty string', item.region_key)
        ]);
      }

      if (typeof item.family_friendly !== 'boolean') {
        return fail(code, `${itemField}.family_friendly must be boolean`, [
          createDetail(`${itemField}.family_friendly`, 'invalid_type', 'boolean', item.family_friendly)
        ]);
      }

      items.push({
        item_key: itemKey,
        title,
        region_key: itemRegionKey,
        family_friendly: item.family_friendly
      });
    }

    if (details.length) {
      return fail(code, `${dayField} contains unsupported fields`, details);
    }

    normalized.push({
      day_index: dayIndexResult.value,
      region_key: regionKey,
      items
    });
  }

  return ok(normalized);
}

function normalizeAdjustmentOptions(value, options = {}) {
  const {
    field = 'adjustment_options',
    code = ERROR_CODES.INVALID_PREVIOUS_PUBLIC_PLAN,
    strictExtraKeys = false
  } = options;

  if (!Array.isArray(value) || !value.length) {
    return fail(code, `${field} must be a non-empty array`, [
      createDetail(field, 'invalid_type', 'non-empty array', value)
    ]);
  }

  const normalized = [];
  const seenTypes = new Set();

  for (let index = 0; index < value.length; index += 1) {
    const option = value[index];
    const optionField = `${field}[${index}]`;

    if (!isPlainObject(option)) {
      return fail(code, `${optionField} must be an object`, [
        createDetail(optionField, 'invalid_type', 'object', option)
      ]);
    }

    const details = [];
    if (strictExtraKeys) {
      pushIfExtraKeys(option, ADJUSTMENT_OPTION_FIELDS, optionField, details);
    }

    const type = normalizeText(option.type);
    if (!(/** @type {readonly string[]} */ (ACTION_TYPES)).includes(type)) {
      return fail(code, `${optionField}.type is invalid`, [
        createDetail(`${optionField}.type`, 'invalid_enum', ACTION_TYPES.join(', '), option.type)
      ]);
    }

    if (seenTypes.has(type)) {
      return fail(code, `${field} contains duplicate types`, [
        createDetail(`${optionField}.type`, 'duplicate', 'unique action type', option.type)
      ]);
    }

    seenTypes.add(type);

    if (details.length) {
      return fail(code, `${optionField} contains unsupported fields`, details);
    }

    normalized.push({
      type,
      label: ACTION_LABELS[type]
    });
  }

  return ok(normalized);
}

function normalizePublicBasisItemsForFingerprint(items) {
  return [...items]
    .map((item) => ({
      item_key: normalizeText(item.item_key),
      source_type: normalizeText(item.source_type),
      title: normalizeText(item.title),
      region_key: normalizeNullableString(item.region_key),
      matched_by: [...(Array.isArray(item.matched_by) ? item.matched_by : [])]
        .map((value) => normalizeText(value))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, 'zh-CN')),
      score_rank: Number(item.score_rank)
    }))
    .sort((left, right) => {
      if (left.score_rank !== right.score_rank) {
        return left.score_rank - right.score_rank;
      }

      return left.item_key.localeCompare(right.item_key, 'zh-CN');
    });
}

function normalizePublicBasisItem(value, field, code, strictExtraKeys) {
  if (!isPlainObject(value)) {
    return fail(code, `${field} must be an object`, [
      createDetail(field, 'invalid_type', 'object', value)
    ]);
  }

  const details = [];
  if (strictExtraKeys) {
    pushIfExtraKeys(value, PUBLIC_BASIS_ITEM_FIELDS, field, details);
  }

  const itemKey = normalizeText(value.item_key);
  const sourceType = normalizeText(value.source_type);
  const title = normalizeText(value.title);
  const regionKey = normalizeNullableString(value.region_key);

  if (!itemKey || !title) {
    return fail(code, `${field} contains required empty fields`, [
      createDetail(`${field}.item_key`, 'required', 'non-empty string', value.item_key),
      createDetail(`${field}.title`, 'required', 'non-empty string', value.title)
    ]);
  }

  if (!['scenic', 'article'].includes(sourceType)) {
    return fail(code, `${field}.source_type is invalid`, [
      createDetail(`${field}.source_type`, 'invalid_enum', 'scenic, article', value.source_type)
    ]);
  }

  const matchedByResult = normalizeStringArray(value.matched_by, {
    field: `${field}.matched_by`,
    defaultToEmpty: true,
    sortValues: true,
    code
  });
  if (!matchedByResult.ok) return matchedByResult;

  const scoreRankResult = normalizePositiveInteger(value.score_rank, `${field}.score_rank`, { code });
  if (!scoreRankResult.ok) return scoreRankResult;

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  return ok({
    item_key: itemKey,
    source_type: sourceType,
    title,
    region_key: regionKey,
    matched_by: matchedByResult.value,
    score_rank: scoreRankResult.value
  });
}

function normalizeBasis(value, options = {}) {
  const {
    field = 'basis',
    code = ERROR_CODES.INVALID_PREVIOUS_PUBLIC_PLAN,
    strictExtraKeys = false
  } = options;

  if (!isPlainObject(value)) {
    return fail(code, `${field} must be an object`, [
      createDetail(field, 'invalid_type', 'object', value)
    ]);
  }

  const details = [];
  if (strictExtraKeys) {
    pushIfExtraKeys(value, BASIS_FIELDS, field, details);
  }

  const source = normalizeText(value.source);
  if (!source) {
    return fail(code, `${field}.source is required`, [
      createDetail(`${field}.source`, 'required', 'non-empty string', value.source)
    ]);
  }

  if (!Array.isArray(value.items)) {
    return fail(code, `${field}.items must be an array`, [
      createDetail(`${field}.items`, 'invalid_type', 'array', value.items)
    ]);
  }

  if (value.items.length > PUBLIC_BASIS_ITEM_LIMIT) {
    return fail(code, `${field}.items exceeds capped top-${PUBLIC_BASIS_ITEM_LIMIT} limit`, [
      createDetail(`${field}.items`, 'too_many_items', PUBLIC_BASIS_ITEM_LIMIT, value.items.length)
    ]);
  }

  const items = [];
  for (let index = 0; index < value.items.length; index += 1) {
    const itemResult = normalizePublicBasisItem(value.items[index], `${field}.items[${index}]`, code, strictExtraKeys);
    if (!itemResult.ok) return itemResult;
    items.push(itemResult.value);
  }

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  return ok({
    source,
    items: normalizePublicBasisItemsForFingerprint(items)
  });
}

export function normalizeActionPayload(actionType, payload, field = 'action.payload', code = ERROR_CODES.INVALID_ACTION_PAYLOAD) {
  const rule = ACTION_PAYLOAD_RULES[actionType];

  if (!rule) {
    return fail(code, `${field} has no validator for action type`, [
      createDetail(field, 'unsupported', ACTION_TYPES.join(', '), actionType)
    ]);
  }

  if (payload === undefined) {
    return ok({});
  }

  if (!isPlainObject(payload)) {
    return fail(code, `${field} must be an object`, [
      createDetail(field, 'invalid_type', 'object', payload)
    ]);
  }

  if (rule.mode === 'empty_object') {
    if (Object.keys(payload).length) {
      return fail(code, `${field} must be empty for ${actionType}`, [
        createDetail(field, 'unsupported', '{}', payload)
      ]);
    }

    return ok({});
  }

  const details = [];
  pushIfExtraKeys(payload, ['target_region_key'], field, details);

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  if (!hasOwn(payload, 'target_region_key')) {
    return ok({});
  }

  const targetRegionKey = normalizeKnownRegionKey(payload.target_region_key);
  if (!targetRegionKey) {
    return fail(code, `${field}.target_region_key must be a known region key or alias`, [
      createDetail(
        `${field}.target_region_key`,
        'unsupported',
        'known region key or alias',
        payload.target_region_key
      )
    ]);
  }

  return ok({ target_region_key: targetRegionKey });
}

function normalizeAction(value, options = {}) {
  const {
    field = 'action',
    code = ERROR_CODES.INVALID_REVISE_PAYLOAD
  } = options;

  if (!isPlainObject(value)) {
    return fail(code, `${field} must be an object`, [
      createDetail(field, 'invalid_type', 'object', value)
    ]);
  }

  const details = [];
  pushIfExtraKeys(value, ['type', 'payload'], field, details);

  const type = normalizeText(value.type);
  if (!(/** @type {readonly string[]} */ (ACTION_TYPES)).includes(type)) {
    return fail(ERROR_CODES.INVALID_ACTION_TYPE, `${field}.type is invalid`, [
      createDetail(`${field}.type`, 'invalid_enum', ACTION_TYPES.join(', '), value.type)
    ]);
  }

  const actionType = /** @type {ActionType} */ (type);
  const payloadResult = normalizeActionPayload(actionType, value.payload, `${field}.payload`, ERROR_CODES.INVALID_ACTION_PAYLOAD);
  if (!payloadResult.ok) {
    return payloadResult;
  }

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  return ok({
    type,
    payload: payloadResult.value
  });
}

function normalizeLastAction(value, options = {}) {
  const {
    field = 'last_action',
    code = ERROR_CODES.INVALID_PREVIOUS_PLAN_CONTEXT
  } = options;

  if (value === null) {
    return ok(null);
  }

  return normalizeAction(value, { field, code });
}

function normalizeLastActionResult(value, options = {}) {
  const {
    field = 'last_action_result',
    code = ERROR_CODES.INVALID_PREVIOUS_PLAN_CONTEXT,
    strictExtraKeys = false
  } = options;

  if (value === null) {
    return ok(null);
  }

  if (!isPlainObject(value)) {
    return fail(code, `${field} must be an object or null`, [
      createDetail(field, 'invalid_type', 'object or null', value)
    ]);
  }

  const details = [];
  if (strictExtraKeys) {
    pushIfExtraKeys(value, LAST_ACTION_RESULT_FIELDS, field, details);
  }

  const status = normalizeText(value.status);
  if (!(/** @type {readonly string[]} */ (Object.values(LAST_ACTION_RESULT_STATUS))).includes(status)) {
    return fail(code, `${field}.status is invalid`, [
      createDetail(`${field}.status`, 'invalid_enum', Object.values(LAST_ACTION_RESULT_STATUS).join(', '), value.status)
    ]);
  }

  const reasonCode = normalizeNullableString(value.reason_code);
  if (status === LAST_ACTION_RESULT_STATUS.REJECTED && !reasonCode) {
    return fail(code, `${field}.reason_code is required for rejected actions`, [
      createDetail(`${field}.reason_code`, 'required', 'stable reason code', value.reason_code)
    ]);
  }

  if (status === LAST_ACTION_RESULT_STATUS.APPLIED && reasonCode) {
    return fail(code, `${field}.reason_code must be null for applied actions`, [
      createDetail(`${field}.reason_code`, 'invalid_value', null, value.reason_code)
    ]);
  }

  const diagnosticsResult = normalizeStringArray(value.diagnostics, {
    field: `${field}.diagnostics`,
    defaultToEmpty: true,
    sortValues: true,
    code
  });
  if (!diagnosticsResult.ok) return diagnosticsResult;

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  return ok({
    status,
    reason_code: reasonCode,
    message: normalizeText(value.message),
    diagnostics: diagnosticsResult.value
  });
}

export function normalizePlanContext(value, options = {}) {
  const {
    field = 'plan_context',
    code = ERROR_CODES.INVALID_PREVIOUS_PLAN_CONTEXT,
    strictExtraKeys = false,
    requireFingerprint = true
  } = options;

  if (!isPlainObject(value)) {
    return fail(code, `${field} must be an object`, [
      createDetail(field, 'invalid_type', 'object', value)
    ]);
  }

  const details = [];
  if (strictExtraKeys) {
    pushIfExtraKeys(value, PLAN_CONTEXT_FIELDS, field, details);
  }

  const versionResult = normalizePositiveInteger(value.version, `${field}.version`, { code });
  if (!versionResult.ok) return versionResult;

  const fingerprint = normalizeText(value.fingerprint);
  if (requireFingerprint && !fingerprint) {
    return fail(code, `${field}.fingerprint is required`, [
      createDetail(`${field}.fingerprint`, 'required', 'non-empty string', value.fingerprint)
    ]);
  }

  const source = normalizeText(value.source);
  if (!source) {
    return fail(code, `${field}.source is required`, [
      createDetail(`${field}.source`, 'required', 'non-empty string', value.source)
    ]);
  }

  const snapshotResult = normalizeConstraintsSnapshot(value.constraints_snapshot, {
    field: `${field}.constraints_snapshot`,
    code,
    required: true,
    strictExtraKeys
  });
  if (!snapshotResult.ok) return snapshotResult;

  const lastActionResult = normalizeLastAction(value.last_action, {
    field: `${field}.last_action`,
    code
  });
  if (!lastActionResult.ok) return lastActionResult;

  const actionResult = normalizeLastActionResult(value.last_action_result ?? null, {
    field: `${field}.last_action_result`,
    code,
    strictExtraKeys
  });
  if (!actionResult.ok) return actionResult;

  if (lastActionResult.value === null && actionResult.value !== null) {
    return fail(code, `${field}.last_action_result must be null when last_action is null`, [
      createDetail(`${field}.last_action_result`, 'invalid_value', null, value.last_action_result)
    ]);
  }

  if (lastActionResult.value !== null && actionResult.value === null) {
    return fail(code, `${field}.last_action_result is required when last_action exists`, [
      createDetail(`${field}.last_action_result`, 'required', 'object', value.last_action_result)
    ]);
  }

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  return ok({
    version: versionResult.value,
    fingerprint: fingerprint || null,
    parent_fingerprint: normalizeNullableString(value.parent_fingerprint),
    source,
    constraints_snapshot: snapshotResult.value,
    last_action: lastActionResult.value,
    last_action_result: actionResult.value
  });
}

export function normalizePublicRoutePlan(value, options = {}) {
  const {
    field = 'previous_public_plan',
    code = ERROR_CODES.INVALID_PREVIOUS_PUBLIC_PLAN,
    strictExtraKeys = false
  } = options;

  if (!isPlainObject(value)) {
    return fail(code, `${field} must be an object`, [
      createDetail(field, 'invalid_type', 'object', value)
    ]);
  }

  if (hasOwn(value, 'plan_context')) {
    return fail(code, `${field}.plan_context must not be provided`, [
      createDetail(`${field}.plan_context`, 'unsupported', 'omitted', value.plan_context)
    ]);
  }

  const details = [];
  if (strictExtraKeys) {
    pushIfExtraKeys(value, REVISION_PUBLIC_PLAN_FIELDS, field, details);
  }

  const taskType = normalizeText(value.task_type);
  if (taskType !== ROUTE_PLANNER_TASK_TYPE) {
    return fail(code, `${field}.task_type must be plan_route`, [
      createDetail(`${field}.task_type`, 'invalid_value', ROUTE_PLANNER_TASK_TYPE, value.task_type)
    ]);
  }

  const candidateStatus = normalizeText(value.candidate_status);
  if (!(/** @type {readonly string[]} */ (Object.values(CANDIDATE_STATUS))).includes(candidateStatus)) {
    return fail(code, `${field}.candidate_status is invalid`, [
      createDetail(`${field}.candidate_status`, 'invalid_enum', Object.values(CANDIDATE_STATUS).join(', '), value.candidate_status)
    ]);
  }

  const planningStatus = normalizeText(value.planning_status);
  if (!(/** @type {readonly string[]} */ ([PLANNING_STATUS.GENERATED, PLANNING_STATUS.REVISED])).includes(planningStatus)) {
    return fail(code, `${field}.planning_status is invalid`, [
      createDetail(`${field}.planning_status`, 'invalid_enum', `${PLANNING_STATUS.GENERATED}, ${PLANNING_STATUS.REVISED}`, value.planning_status)
    ]);
  }

  const routePositioningResult = normalizeRoutePositioning(value.route_positioning, {
    field: `${field}.route_positioning`,
    code,
    strictExtraKeys
  });
  if (!routePositioningResult.ok) return routePositioningResult;

  const summaryResult = normalizeSummary(value.summary, {
    field: `${field}.summary`,
    code,
    strictExtraKeys
  });
  if (!summaryResult.ok) return summaryResult;

  const daysResult = normalizeDays(value.days, {
    field: `${field}.days`,
    code,
    strictExtraKeys
  });
  if (!daysResult.ok) return daysResult;

  const highlightsResult = normalizeStringArray(value.route_highlights, {
    field: `${field}.route_highlights`,
    defaultToEmpty: false,
    sortValues: true,
    code
  });
  if (!highlightsResult.ok || !Array.isArray(highlightsResult.value)) {
    return fail(code, `${field}.route_highlights must be an array`, [
      createDetail(`${field}.route_highlights`, 'invalid_type', 'array', value.route_highlights)
    ]);
  }

  const adjustmentOptionsResult = normalizeAdjustmentOptions(value.adjustment_options, {
    field: `${field}.adjustment_options`,
    code,
    strictExtraKeys
  });
  if (!adjustmentOptionsResult.ok) return adjustmentOptionsResult;

  const basisResult = normalizeBasis(value.basis, {
    field: `${field}.basis`,
    code,
    strictExtraKeys
  });
  if (!basisResult.ok) return basisResult;

  const expectedTotalDays = daysResult.value.length;
  const expectedTotalItems = daysResult.value.reduce((count, day) => count + day.items.length, 0);

  if (summaryResult.value.total_days !== expectedTotalDays) {
    return fail(code, `${field}.summary.total_days must equal days.length`, [
      createDetail(`${field}.summary.total_days`, 'inconsistent', expectedTotalDays, summaryResult.value.total_days)
    ]);
  }

  if (summaryResult.value.total_items !== expectedTotalItems) {
    return fail(code, `${field}.summary.total_items must equal total item count`, [
      createDetail(`${field}.summary.total_items`, 'inconsistent', expectedTotalItems, summaryResult.value.total_items)
    ]);
  }

  if (routePositioningResult.value.duration_days !== summaryResult.value.total_days) {
    return fail(code, `${field}.route_positioning.duration_days must equal summary.total_days`, [
      createDetail(`${field}.route_positioning.duration_days`, 'inconsistent', summaryResult.value.total_days, routePositioningResult.value.duration_days)
    ]);
  }

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  return ok({
    task_type: ROUTE_PLANNER_TASK_TYPE,
    candidate_status: candidateStatus,
    planning_status: planningStatus,
    route_positioning: routePositioningResult.value,
    summary: summaryResult.value,
    days: daysResult.value,
    route_highlights: highlightsResult.value,
    adjustment_options: adjustmentOptionsResult.value,
    basis: basisResult.value
  });
}

function normalizeGenerateRouterResult(routerResult) {
  if (!isPlainObject(routerResult)) {
    return fail(ERROR_CODES.INVALID_ROUTER_RESULT, 'routerResult must be an object', [
      createDetail('routerResult', 'invalid_type', 'object', routerResult)
    ]);
  }

  const taskType = normalizeText(routerResult.task_type);
  if (taskType !== ROUTE_PLANNER_TASK_TYPE) {
    return fail(ERROR_CODES.INVALID_ROUTER_RESULT, 'routerResult.task_type must be plan_route', [
      createDetail('routerResult.task_type', 'invalid_value', ROUTE_PLANNER_TASK_TYPE, routerResult.task_type)
    ]);
  }

  if (routerResult.clarification_needed !== false) {
    return fail(ERROR_CODES.INVALID_ROUTER_RESULT, 'routerResult.clarification_needed must be false', [
      createDetail('routerResult.clarification_needed', 'invalid_value', false, routerResult.clarification_needed)
    ]);
  }

  if (routerResult.clarification_reason !== null) {
    return fail(ERROR_CODES.INVALID_ROUTER_RESULT, 'routerResult.clarification_reason must be null', [
      createDetail('routerResult.clarification_reason', 'invalid_value', null, routerResult.clarification_reason)
    ]);
  }

  if (!Array.isArray(routerResult.missing_required_fields) || routerResult.missing_required_fields.length) {
    return fail(ERROR_CODES.INVALID_ROUTER_RESULT, 'routerResult.missing_required_fields must be an empty array', [
      createDetail('routerResult.missing_required_fields', 'invalid_value', 'empty array', routerResult.missing_required_fields)
    ]);
  }

  if (!Array.isArray(routerResult.clarification_questions) || routerResult.clarification_questions.length) {
    return fail(ERROR_CODES.INVALID_ROUTER_RESULT, 'routerResult.clarification_questions must be an empty array', [
      createDetail('routerResult.clarification_questions', 'invalid_value', 'empty array', routerResult.clarification_questions)
    ]);
  }

  if (normalizeText(routerResult.next_agent) !== 'ai_trip') {
    return fail(ERROR_CODES.INVALID_ROUTER_RESULT, 'routerResult.next_agent must be ai_trip', [
      createDetail('routerResult.next_agent', 'invalid_value', 'ai_trip', routerResult.next_agent)
    ]);
  }

  if (!isPlainObject(routerResult.constraints)) {
    return fail(ERROR_CODES.INVALID_ROUTER_RESULT, 'routerResult.constraints must be an object', [
      createDetail('routerResult.constraints', 'invalid_type', 'object', routerResult.constraints)
    ]);
  }

  const timeBudgetResult = normalizeTimeBudget(routerResult.constraints.time_budget, 'routerResult.constraints.time_budget', {
    required: true,
    code: ERROR_CODES.INVALID_ROUTER_RESULT
  });
  if (!timeBudgetResult.ok) return timeBudgetResult;

  const travelModeResult = normalizeEnum(routerResult.constraints.travel_mode, 'routerResult.constraints.travel_mode', TRAVEL_MODES, ERROR_CODES.INVALID_ROUTER_RESULT);
  if (!travelModeResult.ok) return travelModeResult;

  const paceResult = normalizeEnum(routerResult.constraints.pace_preference, 'routerResult.constraints.pace_preference', PACE_PREFERENCES, ERROR_CODES.INVALID_ROUTER_RESULT);
  if (!paceResult.ok) return paceResult;

  const themeResult = normalizeStringArray(routerResult.constraints.theme_preferences, {
    field: 'routerResult.constraints.theme_preferences',
    defaultToEmpty: true,
    sortValues: true,
    code: ERROR_CODES.INVALID_ROUTER_RESULT
  });
  if (!themeResult.ok) return themeResult;

  const companionsResult = normalizeStringArray(routerResult.constraints.companions, {
    field: 'routerResult.constraints.companions',
    defaultToEmpty: true,
    sortValues: true,
    code: ERROR_CODES.INVALID_ROUTER_RESULT
  });
  if (!companionsResult.ok) return companionsResult;

  const avoidancesResult = normalizeStringArray(routerResult.constraints.hard_avoidances, {
    field: 'routerResult.constraints.hard_avoidances',
    defaultToEmpty: true,
    sortValues: true,
    code: ERROR_CODES.INVALID_ROUTER_RESULT
  });
  if (!avoidancesResult.ok) return avoidancesResult;

  const physicalResult = normalizeStringArray(routerResult.constraints.physical_constraints, {
    field: 'routerResult.constraints.physical_constraints',
    defaultToEmpty: true,
    sortValues: true,
    code: ERROR_CODES.INVALID_ROUTER_RESULT
  });
  if (!physicalResult.ok) return physicalResult;

  const userQuery = normalizeText(routerResult.constraints.user_query);
  if (!userQuery) {
    return fail(ERROR_CODES.INVALID_ROUTER_RESULT, 'routerResult.constraints.user_query is required', [
      createDetail('routerResult.constraints.user_query', 'required', 'non-empty string', routerResult.constraints.user_query)
    ]);
  }

  return ok({
    task_type: ROUTE_PLANNER_TASK_TYPE,
    clarification_needed: false,
    clarification_reason: null,
    missing_required_fields: [],
    clarification_questions: [],
    next_agent: 'ai_trip',
    constraints: {
      user_query: userQuery,
      time_budget: timeBudgetResult.value,
      travel_mode: travelModeResult.value,
      pace_preference: paceResult.value,
      theme_preferences: themeResult.value,
      companions: companionsResult.value,
      hard_avoidances: avoidancesResult.value,
      physical_constraints: physicalResult.value,
      route_origin: normalizeNullableString(routerResult.constraints.route_origin),
      destination_scope: normalizeNullableString(routerResult.constraints.destination_scope)
    }
  });
}

export function validateGeneratePayload(payload = {}) {
  if (!isPlainObject(payload)) {
    return fail(ERROR_CODES.INVALID_GENERATE_PAYLOAD, 'generate payload must be an object', [
      createDetail('body', 'invalid_type', 'object', payload)
    ]);
  }

  const routerResult = normalizeGenerateRouterResult(payload.routerResult);
  if (!routerResult.ok) {
    return routerResult;
  }

  const snapshotResult = normalizeConstraintsSnapshot(
    {
      ...createEmptyConstraintsSnapshot(),
      time_budget: {
        days: routerResult.value.constraints.time_budget.days
      },
      travel_mode: routerResult.value.constraints.travel_mode,
      pace_preference: routerResult.value.constraints.pace_preference,
      theme_preferences: routerResult.value.constraints.theme_preferences,
      companions: routerResult.value.constraints.companions,
      hard_avoidances: routerResult.value.constraints.hard_avoidances,
      physical_constraints: routerResult.value.constraints.physical_constraints,
      route_origin: routerResult.value.constraints.route_origin,
      destination_scope: routerResult.value.constraints.destination_scope
    },
    {
      field: 'constraints_snapshot',
      code: ERROR_CODES.INVALID_GENERATE_PAYLOAD,
      required: true,
      strictExtraKeys: true
    }
  );
  if (!snapshotResult.ok) {
    return snapshotResult;
  }

  return ok({
    routerResult: routerResult.value,
    constraints_snapshot: snapshotResult.value
  });
}

export function validateRevisePayload(payload = {}) {
  if (!isPlainObject(payload)) {
    return fail(ERROR_CODES.INVALID_REVISE_PAYLOAD, 'revise payload must be an object', [
      createDetail('body', 'invalid_type', 'object', payload)
    ]);
  }

  const previousPublicPlan = normalizePublicRoutePlan(payload.previous_public_plan, {
    field: 'previous_public_plan',
    code: ERROR_CODES.INVALID_PREVIOUS_PUBLIC_PLAN,
    strictExtraKeys: false
  });
  if (!previousPublicPlan.ok) {
    return previousPublicPlan;
  }

  const previousPlanContext = normalizePlanContext(payload.previous_plan_context, {
    field: 'previous_plan_context',
    code: ERROR_CODES.INVALID_PREVIOUS_PLAN_CONTEXT,
    strictExtraKeys: true
  });
  if (!previousPlanContext.ok) {
    return previousPlanContext;
  }

  const action = normalizeAction(payload.action, {
    field: 'action',
    code: ERROR_CODES.INVALID_REVISE_PAYLOAD
  });
  if (!action.ok) {
    return action;
  }

  return ok({
    previous_public_plan: previousPublicPlan.value,
    previous_plan_context: previousPlanContext.value,
    action: action.value
  });
}

export function normalizeFullPublicRoutePlan(value, options = {}) {
  const {
    field = 'public_plan',
    code = ERROR_CODES.INVALID_NARRATIVE_PAYLOAD,
    strictExtraKeys = true
  } = options;

  if (!isPlainObject(value)) {
    return fail(code, `${field} must be an object`, [
      createDetail(field, 'invalid_type', 'object', value)
    ]);
  }

  const details = [];
  if (strictExtraKeys) {
    pushIfExtraKeys(value, PUBLIC_PLAN_TOP_LEVEL_FIELDS, field, details);
  }

  if (!isPlainObject(value.plan_context)) {
    return fail(code, `${field}.plan_context must be an object`, [
      createDetail(`${field}.plan_context`, 'invalid_type', 'object', value.plan_context)
    ]);
  }

  const { plan_context: planContextInput, ...revisionPublicPlanInput } = value;
  const publicPlanResult = normalizePublicRoutePlan(revisionPublicPlanInput, {
    field,
    code,
    strictExtraKeys
  });
  if (!publicPlanResult.ok) return publicPlanResult;

  const planContextResult = normalizePlanContext(planContextInput, {
    field: `${field}.plan_context`,
    code,
    strictExtraKeys
  });
  if (!planContextResult.ok) return planContextResult;

  if (details.length) {
    return fail(code, `${field} contains unsupported fields`, details);
  }

  return ok({
    ...publicPlanResult.value,
    plan_context: planContextResult.value
  });
}

/**
 * @param {NarrativePayload} [payload]
 */
export function validateNarrativePayload(payload = {}) {
  if (!isPlainObject(payload)) {
    return fail(ERROR_CODES.INVALID_NARRATIVE_PAYLOAD, 'narrative payload must be an object', [
      createDetail('body', 'invalid_type', 'object', payload)
    ]);
  }

  const details = [];
  pushIfExtraKeys(payload, ['public_plan'], 'body', details);
  if (details.length) {
    return fail(ERROR_CODES.INVALID_NARRATIVE_PAYLOAD, 'narrative payload contains unsupported fields', details);
  }

  const publicPlan = normalizeFullPublicRoutePlan(payload.public_plan, {
    field: 'public_plan',
    code: ERROR_CODES.INVALID_NARRATIVE_PAYLOAD,
    strictExtraKeys: true
  });
  if (!publicPlan.ok) {
    return publicPlan;
  }

  const { plan_context: planContext, ...revisionPublicPlan } = publicPlan.value;

  return ok({
    public_plan: publicPlan.value,
    revision_public_plan: revisionPublicPlan,
    plan_context: planContext
  });
}

/**
 * @param {unknown} value
 * @param {PublicRoutePlan} publicPlan
 */
export function validateNarrativeOutput(value, publicPlan) {
  const code = ERROR_CODES.INVALID_NARRATIVE_OUTPUT;

  if (!isPlainObject(value)) {
    return fail(code, 'narrative output must be an object', [
      createDetail('narrative', 'invalid_type', 'object', value)
    ]);
  }

  const narrative = /** @type {Record<string, unknown>} */ (value);
  const details = [];
  pushIfExtraKeys(narrative, NARRATIVE_FIELDS, 'narrative', details);
  if (details.length) {
    return fail(code, 'narrative output contains unsupported fields', details);
  }

  const overview = normalizeText(narrative.overview);
  const adjustmentHint = normalizeText(narrative.adjustment_hint);
  const constraintNote = normalizeText(narrative.constraint_note);

  if (!overview || !adjustmentHint || !constraintNote) {
    return fail(code, 'narrative text fields are required', [
      createDetail('narrative.overview', 'required', 'non-empty string', narrative.overview),
      createDetail('narrative.adjustment_hint', 'required', 'non-empty string', narrative.adjustment_hint),
      createDetail('narrative.constraint_note', 'required', 'non-empty string', narrative.constraint_note)
    ]);
  }

  if (!Array.isArray(narrative.day_summaries)) {
    return fail(code, 'narrative.day_summaries must be an array', [
      createDetail('narrative.day_summaries', 'invalid_type', 'array', narrative.day_summaries)
    ]);
  }

  if (narrative.day_summaries.length !== publicPlan.days.length) {
    return fail(code, 'narrative.day_summaries must match public plan days', [
      createDetail('narrative.day_summaries.length', 'inconsistent', publicPlan.days.length, narrative.day_summaries.length)
    ]);
  }

  const expectedDayIndexes = publicPlan.days.map((day) => day.day_index);
  const expectedSet = new Set(expectedDayIndexes);
  const summaryByDayIndex = new Map();

  for (let index = 0; index < narrative.day_summaries.length; index += 1) {
    const summary = narrative.day_summaries[index];
    const field = `narrative.day_summaries[${index}]`;

    if (!isPlainObject(summary)) {
      return fail(code, `${field} must be an object`, [
        createDetail(field, 'invalid_type', 'object', summary)
      ]);
    }

    const daySummary = /** @type {Record<string, unknown>} */ (summary);
    const summaryDetails = [];
    pushIfExtraKeys(daySummary, NARRATIVE_DAY_SUMMARY_FIELDS, field, summaryDetails);
    if (summaryDetails.length) {
      return fail(code, `${field} contains unsupported fields`, summaryDetails);
    }

    const dayIndexResult = normalizePositiveInteger(daySummary.day_index, `${field}.day_index`, { code });
    if (!dayIndexResult.ok) return dayIndexResult;

    if (!expectedSet.has(dayIndexResult.value)) {
      return fail(code, `${field}.day_index is out of range`, [
        createDetail(`${field}.day_index`, 'invalid_value', expectedDayIndexes.join(', '), daySummary.day_index)
      ]);
    }

    if (summaryByDayIndex.has(dayIndexResult.value)) {
      return fail(code, `${field}.day_index is duplicated`, [
        createDetail(`${field}.day_index`, 'duplicate', 'unique day_index', daySummary.day_index)
      ]);
    }

    const text = normalizeText(daySummary.text);
    if (!text) {
      return fail(code, `${field}.text is required`, [
        createDetail(`${field}.text`, 'required', 'non-empty string', daySummary.text)
      ]);
    }

    summaryByDayIndex.set(dayIndexResult.value, {
      day_index: dayIndexResult.value,
      text
    });
  }

  const missingDayIndex = expectedDayIndexes.find((dayIndex) => !summaryByDayIndex.has(dayIndex));
  if (missingDayIndex !== undefined) {
    return fail(code, 'narrative.day_summaries has missing day_index', [
      createDetail('narrative.day_summaries', 'missing', expectedDayIndexes.join(', '), missingDayIndex)
    ]);
  }

  return ok(/** @type {RouteNarrative} */ ({
    overview,
    day_summaries: expectedDayIndexes.map((dayIndex) => summaryByDayIndex.get(dayIndex)),
    adjustment_hint: adjustmentHint,
    constraint_note: constraintNote
  }));
}

function ensureStrictKeys(target, allowedKeys, field, code) {
  if (!isPlainObject(target)) {
    const error = /** @type {RoutePlannerAssertionError} */ (new Error(`${field} must be an object`));
    error.code = code;
    throw error;
  }

  const extraKeys = Object.keys(target).filter((key) => !allowedKeys.includes(key));

  if (extraKeys.length) {
    const error = /** @type {RoutePlannerAssertionError} */ (new Error(`${field} contains unsupported keys: ${extraKeys.join(', ')}`));
    error.code = code;
    throw error;
  }
}

export function assertPublicRoutePlanContract(value) {
  ensureStrictKeys(value, PUBLIC_PLAN_TOP_LEVEL_FIELDS, 'route plan', ERROR_CODES.CONTRACT_VIOLATION);
  ensureStrictKeys(value.route_positioning, ROUTE_POSITIONING_FIELDS, 'route_positioning', ERROR_CODES.CONTRACT_VIOLATION);
  ensureStrictKeys(value.summary, SUMMARY_FIELDS, 'summary', ERROR_CODES.CONTRACT_VIOLATION);
  ensureStrictKeys(value.basis, BASIS_FIELDS, 'basis', ERROR_CODES.CONTRACT_VIOLATION);
  ensureStrictKeys(value.plan_context, PLAN_CONTEXT_FIELDS, 'plan_context', ERROR_CODES.CONTRACT_VIOLATION);
  ensureStrictKeys(value.plan_context.constraints_snapshot, CONSTRAINT_SNAPSHOT_FIELDS, 'constraints_snapshot', ERROR_CODES.CONTRACT_VIOLATION);

  value.basis.items.forEach((item, index) => {
    ensureStrictKeys(item, PUBLIC_BASIS_ITEM_FIELDS, `basis.items[${index}]`, ERROR_CODES.CONTRACT_VIOLATION);
  });

  if (value.plan_context.last_action_result !== null) {
    ensureStrictKeys(value.plan_context.last_action_result, LAST_ACTION_RESULT_FIELDS, 'last_action_result', ERROR_CODES.CONTRACT_VIOLATION);
  }

  value.days.forEach((day, dayIndex) => {
    ensureStrictKeys(day, DAY_FIELDS, `days[${dayIndex}]`, ERROR_CODES.CONTRACT_VIOLATION);
    day.items.forEach((item, itemIndex) => {
      ensureStrictKeys(item, ITEM_FIELDS, `days[${dayIndex}].items[${itemIndex}]`, ERROR_CODES.CONTRACT_VIOLATION);
    });
  });

  value.adjustment_options.forEach((option, index) => {
    ensureStrictKeys(option, ADJUSTMENT_OPTION_FIELDS, `adjustment_options[${index}]`, ERROR_CODES.CONTRACT_VIOLATION);
  });

  const { plan_context, ...publicPlan } = value;

  const normalizedPlan = normalizePublicRoutePlan(publicPlan, {
    field: 'route plan',
    code: ERROR_CODES.CONTRACT_VIOLATION,
    strictExtraKeys: true
  });
  if (!normalizedPlan.ok) {
    const error = /** @type {RoutePlannerAssertionError} */ (new Error(normalizedPlan.error.message));
    error.code = normalizedPlan.error.code;
    error.details = normalizedPlan.error.details;
    throw error;
  }

  const normalizedContext = normalizePlanContext(plan_context, {
    field: 'plan_context',
    code: ERROR_CODES.CONTRACT_VIOLATION,
    strictExtraKeys: true
  });
  if (!normalizedContext.ok) {
    const error = /** @type {RoutePlannerAssertionError} */ (new Error(normalizedContext.error.message));
    error.code = normalizedContext.error.code;
    error.details = normalizedContext.error.details;
    throw error;
  }
}

function projectActionResultForFingerprint(lastActionResult) {
  if (lastActionResult === null) {
    return null;
  }

  return {
    status: lastActionResult.status,
    reason_code: lastActionResult.reason_code
  };
}

export function projectPublicPlanForFingerprint(publicPlan) {
  const normalized = normalizePublicRoutePlan(publicPlan, {
    field: 'public_plan',
    code: ERROR_CODES.CONTRACT_VIOLATION,
    strictExtraKeys: false
  });
  if (!normalized.ok) {
    const error = /** @type {RoutePlannerAssertionError} */ (new Error(normalized.error.message));
    error.code = normalized.error.code;
    error.details = normalized.error.details;
    throw error;
  }

  const plan = normalized.value;

  return sortObjectKeys(
    FINGERPRINT_PUBLIC_PLAN_FIELDS.reduce((projection, key) => {
      if (key === 'adjustment_options') {
        projection[key] = plan.adjustment_options.map((option) => ({
          type: option.type
        }));
      } else if (key === 'basis') {
        projection[key] = {
          source: plan.basis.source,
          items: normalizePublicBasisItemsForFingerprint(plan.basis.items)
        };
      } else {
        projection[key] = plan[key];
      }
      return projection;
    }, {})
  );
}

export function projectPlanContextForFingerprint(planContext) {
  const normalized = normalizePlanContext(planContext, {
    field: 'plan_context',
    code: ERROR_CODES.CONTRACT_VIOLATION,
    strictExtraKeys: false,
    requireFingerprint: false
  });
  if (!normalized.ok) {
    const error = /** @type {RoutePlannerAssertionError} */ (new Error(normalized.error.message));
    error.code = normalized.error.code;
    error.details = normalized.error.details;
    throw error;
  }

  const context = normalized.value;

  return sortObjectKeys(
    FINGERPRINT_PLAN_CONTEXT_FIELDS.reduce((projection, key) => {
      if (key === 'last_action_result') {
        projection[key] = projectActionResultForFingerprint(context.last_action_result);
      } else {
        projection[key] = context[key];
      }
      return projection;
    }, {})
  );
}
