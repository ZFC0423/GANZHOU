// @ts-check

import {
  MAP_PROVIDER_STATUS,
  MAP_PROVIDERS,
  ROUTE_MODES,
  createMapProviderResult,
  invalidRequest
} from './contracts.js';

const EARTH_RADIUS_METERS = 6371000;
const ESTIMATE_METHOD = 'haversine_city_factor';
const MODE_FACTORS = {
  [ROUTE_MODES.DRIVING]: {
    distanceFactor: 1.45,
    speedKmh: 25
  },
  [ROUTE_MODES.WALKING]: {
    distanceFactor: 1.2,
    speedKmh: 4
  }
};

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function normalizeCoordinate(value, type) {
  if (value === null || value === undefined) {
    return { ok: false, value: null };
  }

  if (typeof value === 'string' && value.trim() === '') {
    return { ok: false, value: null };
  }

  if (typeof value !== 'number' && typeof value !== 'string') {
    return { ok: false, value: null };
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return { ok: false, value: null };
  }

  if (type === 'lat' && (numberValue < -90 || numberValue > 90)) {
    return { ok: false, value: null };
  }

  if (type === 'lng' && (numberValue < -180 || numberValue > 180)) {
    return { ok: false, value: null };
  }

  return { ok: true, value: numberValue };
}

export function normalizeLocation(value) {
  const lat = normalizeCoordinate(value?.lat, 'lat');
  const lng = normalizeCoordinate(value?.lng, 'lng');

  if (!lat.ok || !lng.ok) {
    return { ok: false, value: null };
  }

  return {
    ok: true,
    value: {
      lat: lat.value,
      lng: lng.value
    }
  };
}

export function isSupportedRouteMode(mode) {
  return mode === ROUTE_MODES.DRIVING || mode === ROUTE_MODES.WALKING;
}

export function haversineDistanceMeters(origin, destination) {
  const normalizedOrigin = normalizeLocation(origin);
  const normalizedDestination = normalizeLocation(destination);

  if (!normalizedOrigin.ok || !normalizedDestination.ok) {
    return { ok: false, value: null };
  }

  const deltaLat = toRadians(normalizedDestination.value.lat - normalizedOrigin.value.lat);
  const deltaLng = toRadians(normalizedDestination.value.lng - normalizedOrigin.value.lng);
  const lat1 = toRadians(normalizedOrigin.value.lat);
  const lat2 = toRadians(normalizedDestination.value.lat);

  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const distance = 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (!Number.isFinite(distance)) {
    return { ok: false, value: null };
  }

  return { ok: true, value: distance };
}

export function estimateLightRouteByCoordinates({ origin, destination, mode }) {
  if (!isSupportedRouteMode(mode)) {
    return invalidRequest(MAP_PROVIDERS.LOCAL, 'unsupported route mode');
  }

  const normalizedOrigin = normalizeLocation(origin);
  const normalizedDestination = normalizeLocation(destination);

  if (!normalizedOrigin.ok || !normalizedDestination.ok) {
    return invalidRequest(MAP_PROVIDERS.LOCAL, 'invalid route coordinates');
  }

  const straightLine = haversineDistanceMeters(normalizedOrigin.value, normalizedDestination.value);
  if (!straightLine.ok) {
    return invalidRequest(MAP_PROVIDERS.LOCAL, 'invalid route coordinates');
  }

  const rule = MODE_FACTORS[mode];
  const distanceMeters = Math.round(straightLine.value * rule.distanceFactor);
  const durationSeconds = Math.round(distanceMeters / (rule.speedKmh * 1000 / 3600));

  if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) {
    return invalidRequest(MAP_PROVIDERS.LOCAL, 'invalid route estimate');
  }

  return createMapProviderResult({
    provider: MAP_PROVIDERS.LOCAL,
    status: MAP_PROVIDER_STATUS.ESTIMATED,
    data: {
      mode,
      origin: normalizedOrigin.value,
      destination: normalizedDestination.value,
      distance_meters: distanceMeters,
      duration_seconds: durationSeconds,
      polyline: null,
      estimated: true,
      estimate_method: ESTIMATE_METHOD
    },
    meta: {
      estimated: true,
      fallback_used: true
    }
  });
}
