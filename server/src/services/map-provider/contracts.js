// @ts-check

export const MAP_PROVIDERS = Object.freeze({
  MOCK: 'mock',
  BAIDU: 'baidu',
  LOCAL: 'local'
});

export const MAP_PROVIDER_STATUS = Object.freeze({
  OK: 'ok',
  CACHE_HIT: 'cache_hit',
  STALE_CACHE_FALLBACK: 'stale_cache_fallback',
  ESTIMATED: 'estimated',
  DISABLED: 'disabled',
  PROVIDER_ERROR: 'provider_error',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  INVALID_REQUEST: 'invalid_request'
});

export const ROUTE_MODES = Object.freeze({
  DRIVING: 'driving',
  WALKING: 'walking'
});

export const MAP_PROVIDER_ERROR_CODES = Object.freeze({
  INVALID_REQUEST: 'invalid_request',
  PROVIDER_DISABLED: 'provider_disabled',
  PROVIDER_ERROR: 'provider_error',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  CACHE_READ_FAILED: 'cache_read_failed',
  CACHE_WRITE_FAILED: 'cache_write_failed',
  CACHE_CORRUPT: 'cache_corrupt'
});

export function createMapProviderMeta(overrides = {}) {
  return {
    cache_hit: false,
    real_call_used: false,
    cache_available: true,
    ...overrides
  };
}

export function createMapProviderError(code, message) {
  return {
    code,
    message
  };
}

export function createMapProviderResult({
  provider,
  status,
  data = null,
  error = null,
  meta = {}
}) {
  return {
    provider,
    status,
    data,
    error,
    meta: createMapProviderMeta({
      cache_hit: status === MAP_PROVIDER_STATUS.CACHE_HIT,
      ...meta
    })
  };
}

export function invalidRequest(provider, message, meta = {}) {
  return createMapProviderResult({
    provider,
    status: MAP_PROVIDER_STATUS.INVALID_REQUEST,
    error: createMapProviderError(MAP_PROVIDER_ERROR_CODES.INVALID_REQUEST, message),
    meta
  });
}

export function disabled(provider, message = 'map provider real calls are disabled', meta = {}) {
  return createMapProviderResult({
    provider,
    status: MAP_PROVIDER_STATUS.DISABLED,
    error: createMapProviderError(MAP_PROVIDER_ERROR_CODES.PROVIDER_DISABLED, message),
    meta
  });
}

export function providerError(provider, message = 'map provider returned an error', meta = {}) {
  return createMapProviderResult({
    provider,
    status: MAP_PROVIDER_STATUS.PROVIDER_ERROR,
    error: createMapProviderError(MAP_PROVIDER_ERROR_CODES.PROVIDER_ERROR, message),
    meta
  });
}

export function providerUnavailable(provider, message = 'map provider is unavailable', meta = {}) {
  return createMapProviderResult({
    provider,
    status: MAP_PROVIDER_STATUS.PROVIDER_UNAVAILABLE,
    error: createMapProviderError(MAP_PROVIDER_ERROR_CODES.PROVIDER_UNAVAILABLE, message),
    meta
  });
}

export function mergeCacheMeta(...metas) {
  return metas.reduce((merged, meta) => {
    if (!meta) return merged;
    if (meta.cache_available === false) {
      merged.cache_available = false;
      merged.cache_error_code = meta.cache_error_code || MAP_PROVIDER_ERROR_CODES.CACHE_READ_FAILED;
    }
    return merged;
  }, {});
}
