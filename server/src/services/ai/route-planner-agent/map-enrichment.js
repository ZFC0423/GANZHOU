// @ts-check

import { getLightRoute } from '../../map-provider/index.js';
import { normalizeLocation as normalizeProviderLocation } from '../../map-provider/estimate.js';

export const MIN_REMAINING_MS_BEFORE_ROUTE_CALL = 100;

function normalizeLocation(value) {
  const normalized = normalizeProviderLocation(value);
  return normalized.ok ? normalized.value : null;
}

function getItemLocation(item) {
  return normalizeLocation(item?.location) || normalizeLocation(item);
}

function isValidResolvedLocation(location) {
  return Boolean(location)
    && typeof location.lat === 'number'
    && typeof location.lng === 'number'
    && Number.isFinite(location.lat)
    && Number.isFinite(location.lng);
}

function resolveItemLocation(item, coordinateResolver) {
  try {
    const normalized = normalizeLocation(coordinateResolver(item));
    return isValidResolvedLocation(normalized) ? normalized : null;
  } catch {
    return null;
  }
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

function normalizeMaxSegments(value) {
  if (value === undefined || value === null) {
    return Infinity;
  }

  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : Infinity;
}

function isDeadlineReached(deadlineAt, now) {
  return Number.isFinite(deadlineAt) && now() >= deadlineAt;
}

function hasEnoughTimeForRouteCall(deadlineAt, now) {
  if (!Number.isFinite(deadlineAt)) {
    return true;
  }

  return deadlineAt - now() > MIN_REMAINING_MS_BEFORE_ROUTE_CALL;
}

function createDeadlineResult(segments) {
  return {
    status: segments.length ? 'partial' : 'unavailable',
    provider: segments[0]?.provider || 'local',
    segments,
    fallback_used: true,
    diagnostics: {
      timed_out: true,
      skipped_segments: 1,
      skip_reason: 'spatial_diagnostics_timeout'
    }
  };
}

export function createMapEnrichment({
  mapProvider = { getLightRoute },
  coordinateResolver = getItemLocation
} = {}) {
  return async function enrichRoutePlanWithMap({
    publicPlan,
    constraintsSnapshot,
    maxSegments,
    deadlineAt = Infinity,
    now = () => Date.now(),
    coordinateResolver: perCallCoordinateResolver = null
  } = {}) {
    try {
      const segments = [];
      const segmentLimit = normalizeMaxSegments(maxSegments);
      const scannedPairLimit = segmentLimit === Infinity ? Infinity : segmentLimit * 3;
      let scannedPairs = 0;
      const mode = resolveMode(constraintsSnapshot);
      const activeCoordinateResolver = typeof perCallCoordinateResolver === 'function'
        ? perCallCoordinateResolver
        : coordinateResolver;
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
          if (segments.length >= segmentLimit || scannedPairs >= scannedPairLimit) {
            break;
          }

          scannedPairs += 1;
          const from = items[index];
          const to = items[index + 1];
          const origin = resolveItemLocation(from, activeCoordinateResolver);
          const destination = resolveItemLocation(to, activeCoordinateResolver);

          if (!origin || !destination) {
            continue;
          }

          if (isDeadlineReached(deadlineAt, now) || !hasEnoughTimeForRouteCall(deadlineAt, now)) {
            return createDeadlineResult(segments);
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

        if (segments.length >= segmentLimit || scannedPairs >= scannedPairLimit) {
          break;
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
