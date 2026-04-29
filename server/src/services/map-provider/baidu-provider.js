// @ts-check

import {
  MAP_PROVIDER_STATUS,
  MAP_PROVIDERS,
  ROUTE_MODES,
  createMapProviderResult,
  disabled,
  invalidRequest,
  mergeCacheMeta,
  providerError,
  providerUnavailable
} from './contracts.js';
import { defaultMapProviderCache } from './cache.js';
import {
  estimateLightRouteByCoordinates,
  isSupportedRouteMode,
  normalizeCoordinate,
  normalizeLocation
} from './estimate.js';

const BAIDU_GEOCODING_ENDPOINT = 'https://api.map.baidu.com/geocoding/v3/';
const BAIDU_DIRECTION_LITE_ENDPOINT = 'https://api.map.baidu.com/directionlite/v1';
const ROUTE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_BAIDU_REQUEST_GAP_MS = 333;

function normalizeText(value) {
  return String(value ?? '').trim();
}

class ThrottleQueueOverflowError extends Error {
  constructor() {
    super('map provider throttle wait exceeded');
    this.name = 'ThrottleQueueOverflowError';
  }
}

function normalizeCoordinateForKey(value, type) {
  const normalized = normalizeCoordinate(value, type);
  if (!normalized.ok) {
    throw new TypeError('invalid coordinate for route cache key');
  }

  return normalized.value.toFixed(6);
}

export function createGeocodeCacheKey({ address, city = null }) {
  return `geocode:v1:${normalizeText(city).toLowerCase()}:${normalizeText(address).toLowerCase()}`;
}

export function createRouteCacheKey({ origin, destination, mode }) {
  return [
    'route:v1',
    mode,
    `${normalizeCoordinateForKey(origin.lng, 'lng')},${normalizeCoordinateForKey(origin.lat, 'lat')}`,
    `${normalizeCoordinateForKey(destination.lng, 'lng')},${normalizeCoordinateForKey(destination.lat, 'lat')}`
  ].join(':');
}

function isBaiduSuccessStatus(value) {
  return Number(value) === 0 || String(value) === '0';
}

function normalizeNonNegativeNumber(value) {
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
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return { ok: false, value: null };
  }

  return { ok: true, value: numberValue };
}

function createAbortErrorResult(provider, meta) {
  return providerUnavailable(provider, 'map provider request timed out or was aborted', meta);
}

function isRealCallAllowed({ env, fetchImpl }) {
  const hasInjectedFetch = typeof fetchImpl === 'function';
  const hasEnabledEnv = env.MAP_PROVIDER === 'baidu'
    && Boolean(normalizeText(env.BAIDU_MAP_AK))
    && env.BAIDU_MAP_ENABLE_REAL_CALLS === 'true';

  if (!hasEnabledEnv) {
    return false;
  }

  if (env.NODE_ENV === 'test' && !hasInjectedFetch) {
    return false;
  }

  return true;
}

function buildGeocodeUrl({ address, city, ak }) {
  const url = new URL(BAIDU_GEOCODING_ENDPOINT);
  url.searchParams.set('address', address);
  if (city) {
    url.searchParams.set('city', city);
  }
  url.searchParams.set('output', 'json');
  url.searchParams.set('ak', ak);
  return url;
}

function buildDirectionUrl({ origin, destination, mode, ak }) {
  const url = new URL(`${BAIDU_DIRECTION_LITE_ENDPOINT}/${mode}`);
  url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
  url.searchParams.set('coord_type', 'bd09ll');
  url.searchParams.set('ret_coordtype', 'bd09ll');
  url.searchParams.set('steps_info', '0');
  url.searchParams.set('ak', ak);
  return url;
}

function parseBaiduGeocodePayload(payload, { address, city }) {
  if (!isBaiduSuccessStatus(payload?.status)) {
    return providerError(MAP_PROVIDERS.BAIDU, 'baidu geocode returned an error', {
      real_call_used: true
    });
  }

  const lat = normalizeCoordinate(payload?.result?.location?.lat, 'lat');
  const lng = normalizeCoordinate(payload?.result?.location?.lng, 'lng');

  if (!lat.ok || !lng.ok) {
    return providerError(MAP_PROVIDERS.BAIDU, 'baidu geocode response is missing location', {
      real_call_used: true
    });
  }

  return createMapProviderResult({
    provider: MAP_PROVIDERS.BAIDU,
    status: MAP_PROVIDER_STATUS.OK,
    data: {
      address,
      city: city || null,
      location: { lat: lat.value, lng: lng.value },
      confidence: Number(payload?.result?.precise) === 1 ? 'exact' : 'approximate',
      raw_provider_status: String(payload.status)
    },
    meta: {
      real_call_used: true
    }
  });
}

function parseBaiduRoutePayload(payload, { origin, destination, mode }) {
  if (!isBaiduSuccessStatus(payload?.status)) {
    return providerError(MAP_PROVIDERS.BAIDU, 'baidu route returned an error', {
      real_call_used: true
    });
  }

  const route = Array.isArray(payload?.result?.routes) ? payload.result.routes[0] : null;
  const distance = normalizeNonNegativeNumber(route?.distance);
  const duration = normalizeNonNegativeNumber(route?.duration);

  if (!distance.ok || !duration.ok) {
    return providerError(MAP_PROVIDERS.BAIDU, 'baidu route response is missing distance or duration', {
      real_call_used: true
    });
  }

  return createMapProviderResult({
    provider: MAP_PROVIDERS.BAIDU,
    status: MAP_PROVIDER_STATUS.OK,
    data: {
      mode,
      origin,
      destination,
      distance_meters: distance.value,
      duration_seconds: duration.value,
      polyline: null,
      raw_provider_status: String(payload.status)
    },
    meta: {
      real_call_used: true
    }
  });
}

export function createBaiduMapProvider({
  env = process.env,
  cache = defaultMapProviderCache,
  fetchImpl,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => Date.now(),
  timeoutMs = 3000,
  maxThrottleWaitMs = Math.min(timeoutMs, 3000)
} = {}) {
  let nextAllowedAt = 0;
  const effectiveFetch = fetchImpl || globalThis.fetch;

  async function throttleBaiduRequest() {
    const current = now();
    const waitMs = Math.max(0, nextAllowedAt - current);
    if (waitMs > maxThrottleWaitMs) {
      throw new ThrottleQueueOverflowError();
    }

    nextAllowedAt = Math.max(current, nextAllowedAt) + MIN_BAIDU_REQUEST_GAP_MS;
    if (waitMs > 0) {
      await sleep(waitMs);
    }
  }

  async function requestJson(url) {
    if (typeof effectiveFetch !== 'function') {
      return {
        ok: false,
        errorResult: providerUnavailable(MAP_PROVIDERS.BAIDU, 'fetch is not available', {
          real_call_used: false
        })
      };
    }

    let timer = null;

    try {
      await throttleBaiduRequest();

      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), timeoutMs);
      const response = await effectiveFetch(url, { signal: controller.signal });
      const payload = await response.json();
      return {
        ok: true,
        payload
      };
    } catch (error) {
      if (error?.name === 'ThrottleQueueOverflowError') {
        return {
          ok: false,
          errorResult: providerUnavailable(MAP_PROVIDERS.BAIDU, 'map provider throttle wait exceeded', {
            real_call_used: false
          })
        };
      }

      if (error?.name === 'AbortError') {
        return {
          ok: false,
          errorResult: createAbortErrorResult(MAP_PROVIDERS.BAIDU, { real_call_used: true })
        };
      }
      return {
        ok: false,
        errorResult: providerUnavailable(MAP_PROVIDERS.BAIDU, 'map provider network or payload error', {
          real_call_used: true
        })
      };
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  async function readFreshCache(key, ttlMs = Infinity) {
    return cache.get(key, { ttlMs, allowStale: false });
  }

  async function readStaleCache(key) {
    return cache.get(key, { ttlMs: 0, allowStale: true });
  }

  function fromCache({ provider, hit, stale, value, meta }) {
    return createMapProviderResult({
      provider,
      status: stale ? MAP_PROVIDER_STATUS.STALE_CACHE_FALLBACK : MAP_PROVIDER_STATUS.CACHE_HIT,
      data: value,
      meta: {
        ...mergeCacheMeta(meta),
        cache_hit: !stale,
        stale_cache_used: stale || undefined,
        fallback_used: stale || undefined,
        real_call_used: false
      }
    });
  }

  async function writeCache(key, value) {
    const setMeta = await cache.set(key, value);
    const flushMeta = await cache.flushNow();
    return mergeCacheMeta(setMeta, flushMeta);
  }

  async function geocodeAddress({ address, city = null } = {}) {
    const normalizedAddress = normalizeText(address);
    const normalizedCity = normalizeText(city);

    if (!normalizedAddress) {
      return invalidRequest(MAP_PROVIDERS.BAIDU, 'address is required');
    }

    const key = createGeocodeCacheKey({ address: normalizedAddress, city: normalizedCity });
    const fresh = await readFreshCache(key);
    if (fresh.hit && !fresh.stale) {
      return fromCache({ provider: MAP_PROVIDERS.BAIDU, ...fresh });
    }

    const allowRealCall = isRealCallAllowed({ env, fetchImpl });
    if (!allowRealCall) {
      const stale = await readStaleCache(key);
      if (stale.hit) {
        return fromCache({ provider: MAP_PROVIDERS.BAIDU, ...stale });
      }
      return disabled(MAP_PROVIDERS.BAIDU, 'baidu map real calls are disabled', mergeCacheMeta(fresh.meta, stale.meta));
    }

    const request = await requestJson(buildGeocodeUrl({
      address: normalizedAddress,
      city: normalizedCity,
      ak: env.BAIDU_MAP_AK
    }));

    if (!request.ok) {
      const stale = await readStaleCache(key);
      if (stale.hit) {
        const cached = fromCache({ provider: MAP_PROVIDERS.BAIDU, ...stale });
        return {
          ...cached,
          meta: {
            ...cached.meta,
            real_call_used: Boolean(request.errorResult?.meta?.real_call_used)
          }
        };
      }
      return request.errorResult;
    }

    const parsed = parseBaiduGeocodePayload(request.payload, {
      address: normalizedAddress,
      city: normalizedCity
    });

    if (parsed.status !== MAP_PROVIDER_STATUS.OK) {
      const stale = await readStaleCache(key);
      if (stale.hit) {
        const cached = fromCache({ provider: MAP_PROVIDERS.BAIDU, ...stale });
        return {
          ...cached,
          meta: {
            ...cached.meta,
            real_call_used: true
          }
        };
      }
      return parsed;
    }

    const cacheMeta = await writeCache(key, parsed.data);
    return {
      ...parsed,
      meta: {
        ...parsed.meta,
        ...cacheMeta
      }
    };
  }

  async function getLightRoute({ origin, destination, mode } = {}) {
    if (!isSupportedRouteMode(mode)) {
      return invalidRequest(MAP_PROVIDERS.BAIDU, 'unsupported route mode');
    }

    const normalizedOrigin = normalizeLocation(origin);
    const normalizedDestination = normalizeLocation(destination);
    if (!normalizedOrigin.ok || !normalizedDestination.ok) {
      return invalidRequest(MAP_PROVIDERS.BAIDU, 'invalid route coordinates');
    }

    const routeInput = {
      origin: normalizedOrigin.value,
      destination: normalizedDestination.value,
      mode
    };
    const key = createRouteCacheKey(routeInput);
    const fresh = await readFreshCache(key, ROUTE_CACHE_TTL_MS);
    if (fresh.hit && !fresh.stale) {
      return fromCache({ provider: MAP_PROVIDERS.BAIDU, ...fresh });
    }

    const estimateFallback = () => {
      const estimate = estimateLightRouteByCoordinates(routeInput);
      return {
        ...estimate,
        meta: {
          ...estimate.meta,
          ...mergeCacheMeta(fresh.meta)
        }
      };
    };

    const allowRealCall = isRealCallAllowed({ env, fetchImpl });
    if (!allowRealCall) {
      return estimateFallback();
    }

    const request = await requestJson(buildDirectionUrl({
      ...routeInput,
      ak: env.BAIDU_MAP_AK
    }));

    if (!request.ok) {
      const stale = await readStaleCache(key);
      if (stale.hit) {
        const cached = fromCache({ provider: MAP_PROVIDERS.BAIDU, ...stale });
        return {
          ...cached,
          meta: {
            ...cached.meta,
            real_call_used: Boolean(request.errorResult?.meta?.real_call_used)
          }
        };
      }
      const estimate = estimateFallback();
      return {
        ...estimate,
        meta: {
          ...estimate.meta,
          real_call_used: Boolean(request.errorResult?.meta?.real_call_used)
        }
      };
    }

    const parsed = parseBaiduRoutePayload(request.payload, routeInput);
    if (parsed.status !== MAP_PROVIDER_STATUS.OK) {
      const stale = await readStaleCache(key);
      if (stale.hit) {
        const cached = fromCache({ provider: MAP_PROVIDERS.BAIDU, ...stale });
        return {
          ...cached,
          meta: {
            ...cached.meta,
            real_call_used: true
          }
        };
      }
      const estimate = estimateFallback();
      return {
        ...estimate,
        meta: {
          ...estimate.meta,
          real_call_used: true
        }
      };
    }

    const cacheMeta = await writeCache(key, parsed.data);
    return {
      ...parsed,
      meta: {
        ...parsed.meta,
        ...cacheMeta
      }
    };
  }

  return {
    geocodeAddress,
    getLightRoute,
    _private: {
      throttleBaiduRequest,
      isRealCallAllowed: () => isRealCallAllowed({ env, fetchImpl })
    }
  };
}

export const baiduMapProvider = createBaiduMapProvider();
