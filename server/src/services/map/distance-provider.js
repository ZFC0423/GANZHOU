// @ts-check

export const noopDistanceProvider = Object.freeze({
  provider_name: 'noop',
  enabled: false,
  async estimateRouteSpan() {
    return {
      status: 'unavailable',
      provider: 'noop',
      mode: null,
      distance_meters: null,
      duration_minutes: null,
      reason_code: 'map_provider_disabled'
    };
  }
});

export function createNoopDistanceProvider() {
  return noopDistanceProvider;
}

export const distanceProvider = noopDistanceProvider;
