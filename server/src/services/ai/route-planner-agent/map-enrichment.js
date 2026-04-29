// @ts-check

import { getLightRoute } from '../../map-provider/index.js';
import { normalizeLocation as normalizeProviderLocation } from '../../map-provider/estimate.js';

function normalizeLocation(value) {
  const normalized = normalizeProviderLocation(value);
  return normalized.ok ? normalized.value : null;
}

function getItemLocation(item) {
  return normalizeLocation(item?.location) || normalizeLocation(item);
}

function resolveMode(constraintsSnapshot) {
  if (constraintsSnapshot?.travel_mode === 'self_drive') {
    return 'driving';
  }

  if (constraintsSnapshot?.travel_mode === 'walking') {
    return 'walking';
  }

  return null;
}

export function createMapEnrichment({
  mapProvider = { getLightRoute },
  coordinateResolver = getItemLocation
} = {}) {
  return async function enrichRoutePlanWithMap({ publicPlan, constraintsSnapshot } = {}) {
    try {
      const segments = [];
      const mode = resolveMode(constraintsSnapshot);
      if (!mode) {
        return {
          status: 'unavailable',
          provider: 'local',
          segments: [],
          fallback_used: false
        };
      }

      for (const day of publicPlan?.days || []) {
        const items = Array.isArray(day.items) ? day.items : [];
        for (let index = 0; index < items.length - 1; index += 1) {
          const from = items[index];
          const to = items[index + 1];
          const origin = normalizeLocation(coordinateResolver(from));
          const destination = normalizeLocation(coordinateResolver(to));

          if (!origin || !destination) {
            continue;
          }

          const result = await mapProvider.getLightRoute({
            origin,
            destination,
            mode
          });

          segments.push({
            from_option_key: from.item_key || null,
            to_option_key: to.item_key || null,
            mode,
            distance_meters: result.data?.distance_meters ?? null,
            duration_seconds: result.data?.duration_seconds ?? null,
            estimated: Boolean(result.data?.estimated || result.meta?.estimated),
            source_status: result.status,
            provider: result.provider
          });
        }
      }

      if (!segments.length) {
        return {
          status: 'unavailable',
          provider: 'local',
          segments: [],
          fallback_used: true
        };
      }

      const hasEstimated = segments.some((segment) => segment.estimated);
      const hasFallback = segments.some((segment) => (
        segment.estimated
        || segment.source_status === 'stale_cache_fallback'
        || segment.source_status === 'estimated'
      ));
      const hasUnavailable = segments.some((segment) => ![
        'ok',
        'cache_hit',
        'stale_cache_fallback',
        'estimated'
      ].includes(segment.source_status));

      return {
        status: hasUnavailable ? 'partial' : (hasEstimated ? 'estimated' : 'ok'),
        provider: segments[0]?.provider || 'local',
        segments,
        fallback_used: hasFallback || hasUnavailable
      };
    } catch (error) {
      return {
        status: 'unavailable',
        provider: 'local',
        segments: [],
        fallback_used: true
      };
    }
  };
}

export const enrichRoutePlanWithMap = createMapEnrichment();
