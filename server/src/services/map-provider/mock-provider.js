// @ts-check

import {
  MAP_PROVIDER_STATUS,
  MAP_PROVIDERS,
  createMapProviderResult,
  invalidRequest
} from './contracts.js';
import { estimateLightRouteByCoordinates, normalizeLocation } from './estimate.js';

const MOCK_GEOCODES = new Map([
  ['赣州|通天岩', { lat: 25.89409, lng: 114.87658 }],
  ['赣州|郁孤台', { lat: 25.85984, lng: 114.93442 }],
  ['赣州|古浮桥', { lat: 25.85365, lng: 114.93828 }],
  ['赣州|赣州', { lat: 25.83109, lng: 114.93476 }],
  ['|赣州', { lat: 25.83109, lng: 114.93476 }]
]);

function normalizeText(value) {
  return String(value ?? '').trim();
}

export function createMockMapProvider() {
  return {
    async geocodeAddress({ address, city = null } = {}) {
      const normalizedAddress = normalizeText(address);
      const normalizedCity = normalizeText(city);

      if (!normalizedAddress) {
        return invalidRequest(MAP_PROVIDERS.MOCK, 'address is required');
      }

      const location = MOCK_GEOCODES.get(`${normalizedCity}|${normalizedAddress}`)
        || MOCK_GEOCODES.get(`赣州|${normalizedAddress}`)
        || MOCK_GEOCODES.get(`|${normalizedAddress}`)
        || { lat: 25.83109, lng: 114.93476 };

      return createMapProviderResult({
        provider: MAP_PROVIDERS.MOCK,
        status: MAP_PROVIDER_STATUS.OK,
        data: {
          address: normalizedAddress,
          city: normalizedCity || null,
          location,
          confidence: MOCK_GEOCODES.has(`${normalizedCity}|${normalizedAddress}`) ? 'exact' : 'approximate',
          raw_provider_status: 'mock'
        }
      });
    },

    async getLightRoute({ origin, destination, mode } = {}) {
      const normalizedOrigin = normalizeLocation(origin);
      const normalizedDestination = normalizeLocation(destination);

      if (!normalizedOrigin.ok || !normalizedDestination.ok) {
        return invalidRequest(MAP_PROVIDERS.MOCK, 'invalid route coordinates');
      }

      const estimated = estimateLightRouteByCoordinates({
        origin: normalizedOrigin.value,
        destination: normalizedDestination.value,
        mode
      });

      if (estimated.status === MAP_PROVIDER_STATUS.INVALID_REQUEST) {
        return {
          ...estimated,
          provider: MAP_PROVIDERS.MOCK
        };
      }

      return createMapProviderResult({
        provider: MAP_PROVIDERS.MOCK,
        status: MAP_PROVIDER_STATUS.OK,
        data: {
          ...estimated.data,
          raw_provider_status: 'mock'
        },
        meta: {
          estimated: true
        }
      });
    }
  };
}

export const mockMapProvider = createMockMapProvider();
