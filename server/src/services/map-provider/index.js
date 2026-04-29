// @ts-check

import { createBaiduMapProvider } from './baidu-provider.js';
import { mockMapProvider } from './mock-provider.js';

export function createMapProvider({
  env = process.env,
  cache,
  fetchImpl,
  sleep,
  now,
  timeoutMs
} = {}) {
  if (env.MAP_PROVIDER === 'baidu') {
    return createBaiduMapProvider({
      env,
      cache,
      fetchImpl,
      sleep,
      now,
      timeoutMs
    });
  }

  return mockMapProvider;
}

const defaultProvider = createMapProvider();

export function geocodeAddress(input) {
  return defaultProvider.geocodeAddress(input);
}

export function getLightRoute(input) {
  return defaultProvider.getLightRoute(input);
}

export {
  createBaiduMapProvider,
  createGeocodeCacheKey,
  createRouteCacheKey
} from './baidu-provider.js';
export { createMapProviderCache } from './cache.js';
export { createMockMapProvider } from './mock-provider.js';
export {
  estimateLightRouteByCoordinates,
  haversineDistanceMeters,
  normalizeLocation
} from './estimate.js';
