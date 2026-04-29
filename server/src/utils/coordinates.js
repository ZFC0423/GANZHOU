const DECIMAL_COORDINATE_PATTERN = /^-?\d+(?:\.\d+)?$/;

export const COORDINATE_SOURCES = Object.freeze(['manual', 'seed', 'baidu', 'unknown']);
export const COORDINATE_PRECISIONS = Object.freeze(['exact', 'scenic_area', 'district', 'unknown']);

const SOURCE_SET = new Set(COORDINATE_SOURCES);
const PRECISION_SET = new Set(COORDINATE_PRECISIONS);

export class CoordinateValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CoordinateValidationError';
    this.statusCode = 400;
  }
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

export function isCoordinateClearInput(value) {
  return value === null || (typeof value === 'string' && value.trim() === '');
}

export function parseCoordinateNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || !DECIMAL_COORDINATE_PATTERN.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isCoordinateInRange(value, axis) {
  if (!Number.isFinite(value)) {
    return false;
  }

  if (axis === 'latitude') {
    return value >= -90 && value <= 90;
  }

  if (axis === 'longitude') {
    return value >= -180 && value <= 180;
  }

  return false;
}

export function normalizeCoordinateValue(value, axis) {
  const parsed = parseCoordinateNumber(value);

  if (parsed === null || !isCoordinateInRange(parsed, axis)) {
    return null;
  }

  return parsed;
}

export function validateCoordinateField(value, axis, { allowClear = false } = {}) {
  if (allowClear && isCoordinateClearInput(value)) {
    return {
      valid: true,
      clear: true,
      value: null
    };
  }

  const normalized = normalizeCoordinateValue(value, axis);

  if (normalized === null) {
    return {
      valid: false,
      clear: false,
      value: null
    };
  }

  return {
    valid: true,
    clear: false,
    value: normalized
  };
}

export function normalizeAdminCoordinatePair(payload = {}) {
  const hasLatitude = hasOwn(payload, 'latitude');
  const hasLongitude = hasOwn(payload, 'longitude');

  if (!hasLatitude && !hasLongitude) {
    return {
      provided: false,
      clear: false,
      latitude: undefined,
      longitude: undefined
    };
  }

  if (!hasLatitude || !hasLongitude) {
    throw new CoordinateValidationError('latitude and longitude must be provided together');
  }

  const latitude = validateCoordinateField(payload.latitude, 'latitude', { allowClear: true });
  const longitude = validateCoordinateField(payload.longitude, 'longitude', { allowClear: true });

  if (latitude.clear || longitude.clear) {
    if (latitude.clear && longitude.clear) {
      return {
        provided: true,
        clear: true,
        latitude: null,
        longitude: null
      };
    }

    throw new CoordinateValidationError('latitude and longitude must be cleared together');
  }

  if (!latitude.valid || !longitude.valid) {
    throw new CoordinateValidationError('latitude and longitude must be valid coordinates');
  }

  return {
    provided: true,
    clear: false,
    latitude: latitude.value,
    longitude: longitude.value
  };
}

function normalizeEnumField(payload, key, allowedSet, message) {
  if (!hasOwn(payload, key)) {
    return {
      provided: false,
      value: undefined
    };
  }

  const value = payload[key];

  if (value === null || (typeof value === 'string' && value.trim() === '')) {
    return {
      provided: true,
      value: null
    };
  }

  if (typeof value !== 'string') {
    throw new CoordinateValidationError(message);
  }

  const normalized = value.trim();

  if (!allowedSet.has(normalized)) {
    throw new CoordinateValidationError(message);
  }

  return {
    provided: true,
    value: normalized
  };
}

export function normalizeCoordinateSourceInput(payload = {}) {
  return normalizeEnumField(
    payload,
    'coordinateSource',
    SOURCE_SET,
    'coordinateSource must be manual, seed, baidu, or unknown'
  );
}

export function normalizeCoordinatePrecisionInput(payload = {}) {
  return normalizeEnumField(
    payload,
    'coordinatePrecision',
    PRECISION_SET,
    'coordinatePrecision must be exact, scenic_area, district, or unknown'
  );
}

export function validateAdminCoordinatePayload(payload = {}) {
  normalizeAdminCoordinatePair(payload);
  normalizeCoordinateSourceInput(payload);
  normalizeCoordinatePrecisionInput(payload);
  return true;
}

export function coordinatesEqual(left, right) {
  const leftLatitude = normalizeCoordinateValue(left?.latitude, 'latitude');
  const leftLongitude = normalizeCoordinateValue(left?.longitude, 'longitude');
  const rightLatitude = normalizeCoordinateValue(right?.latitude, 'latitude');
  const rightLongitude = normalizeCoordinateValue(right?.longitude, 'longitude');

  return leftLatitude === rightLatitude && leftLongitude === rightLongitude;
}
