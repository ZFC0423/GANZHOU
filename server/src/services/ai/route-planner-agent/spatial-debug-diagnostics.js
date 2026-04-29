// @ts-check

const SAFE_PROVIDERS = new Set(['mock', 'baidu', 'haversine', 'local', 'unknown']);
const SAFE_CACHE_STATUSES = new Set(['hit', 'miss', 'stale', 'unknown']);
const SAFE_WARNING_CODES = new Set(['route_segment_too_far', 'segment_too_far']);
const SAFE_MODES = new Set(['driving', 'walking', 'unknown']);
const SENSITIVE_KEY_PATTERN = /^(ak|apiKey|api_key|token|secret|authorization|cookie|set-cookie|rawQuery|userQuery|queryText|requestUrl|url|uri|headers|httpResponse|response|request|payload|rawPayload|rawResult|rawError|stack|config|env)$/i;

function isObject(value) {
  return Boolean(value) && typeof value === 'object';
}

function safeGet(target, key) {
  try {
    if (!isObject(target)) {
      return undefined;
    }

    if (SENSITIVE_KEY_PATTERN.test(String(key))) {
      return undefined;
    }

    return target[key];
  } catch {
    return undefined;
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeString(value, fallback = 'unknown') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function safeProvider(value) {
  const provider = safeString(value);
  return SAFE_PROVIDERS.has(provider) ? provider : 'unknown';
}

function safeCacheStatus(value) {
  const status = safeString(value);
  return SAFE_CACHE_STATUSES.has(status) ? status : 'unknown';
}

function safeMode(value) {
  const mode = safeString(value);
  return SAFE_MODES.has(mode) ? mode : 'unknown';
}

function safeNonNegativeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function safeBoolean(value) {
  return value === true;
}

function getCacheStatus(mapEnrichment, segments) {
  const explicit = safeGet(safeGet(mapEnrichment, 'diagnostics'), 'cache_status');
  if (explicit) {
    return safeCacheStatus(explicit);
  }

  const sourceStatuses = segments
    .map((segment) => safeString(safeGet(segment, 'source_status'), ''))
    .filter(Boolean);

  if (sourceStatuses.some((status) => status === 'cache_hit')) {
    return 'hit';
  }

  if (sourceStatuses.some((status) => status === 'stale_cache_fallback')) {
    return 'stale';
  }

  return 'unknown';
}

function getRealCallUsed(mapEnrichment, segments) {
  const explicit = safeGet(safeGet(mapEnrichment, 'diagnostics'), 'real_call_used');
  if (typeof explicit === 'boolean') {
    return explicit;
  }

  return segments.some((segment) => safeBoolean(safeGet(segment, 'real_call_used')));
}

function sanitizeWarnings(spatialValidation) {
  const issues = safeArray(safeGet(spatialValidation, 'issues'));

  return issues.slice(0, 3).map((issue, index) => {
    const code = safeString(safeGet(issue, 'code'));
    return {
      code: SAFE_WARNING_CODES.has(code) ? code : 'unknown',
      segment_index: safeNonNegativeNumber(safeGet(issue, 'segment_index'), index),
      mode: safeMode(safeGet(issue, 'mode')),
      distance_meters: safeNonNegativeNumber(safeGet(issue, 'distance_meters'), 0),
      duration_seconds: safeNonNegativeNumber(safeGet(issue, 'duration_seconds'), 0),
      estimated: safeBoolean(safeGet(issue, 'estimated'))
    };
  });
}

function createFallbackSnapshot() {
  return {
    enabled: true,
    provider: 'unknown',
    real_call_used: false,
    cache_status: 'unknown',
    enriched_segment_count: 0,
    scanned_pair_count: 0,
    skipped_reason: 'debug_sanitizer_failed',
    spatial_warning_count: 0,
    warnings: []
  };
}

export function sanitizeSpatialDiagnosticsDebugSnapshot(event = {}) {
  try {
    const mapEnrichment = safeGet(event, 'map_enrichment');
    const spatialValidation = safeGet(event, 'spatial_validation');
    const mapDiagnostics = safeGet(mapEnrichment, 'diagnostics');
    const spatialDiagnostics = safeGet(spatialValidation, 'diagnostics');
    const segments = safeArray(safeGet(mapEnrichment, 'segments'));
    const warnings = sanitizeWarnings(spatialValidation);
    const skipReason = safeGet(spatialDiagnostics, 'skip_reason')
      || safeGet(mapDiagnostics, 'skip_reason')
      || safeGet(event, 'skipped_reason')
      || null;

    return {
      enabled: true,
      provider: safeProvider(safeGet(mapEnrichment, 'provider') || safeGet(segments[0], 'provider')),
      real_call_used: getRealCallUsed(mapEnrichment, segments),
      cache_status: getCacheStatus(mapEnrichment, segments),
      enriched_segment_count: safeNonNegativeNumber(segments.length, 0),
      scanned_pair_count: safeNonNegativeNumber(safeGet(mapDiagnostics, 'scanned_pair_count'), 0),
      skipped_reason: skipReason ? safeString(skipReason, null) : null,
      spatial_warning_count: warnings.length,
      warnings
    };
  } catch {
    return createFallbackSnapshot();
  }
}

export function createSpatialDiagnosticsCollector() {
  let snapshot = null;
  let finalized = false;

  return {
    record(event = {}) {
      try {
        if (finalized) {
          return;
        }

        const nextSnapshot = sanitizeSpatialDiagnosticsDebugSnapshot(event);
        if (!nextSnapshot) {
          return;
        }

        snapshot = nextSnapshot;

        if (safeBoolean(safeGet(event, 'terminal'))) {
          finalized = true;
        }
      } catch {
        // Debug diagnostics must never affect route generation.
      }
    },

    getSnapshot() {
      return snapshot;
    },

    finalize() {
      finalized = true;
    }
  };
}
