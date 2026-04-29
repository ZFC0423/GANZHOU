// @ts-check

export const SPATIAL_VALIDATION_STATUS = /** @type {const} */ ({
  OK: 'ok',
  WARNING: 'warning',
  UNAVAILABLE: 'unavailable'
});

export const SPATIAL_ISSUE_CODES = /** @type {const} */ ({
  ROUTE_SEGMENT_TOO_FAR: 'route_segment_too_far'
});

export const SPATIAL_SKIP_REASONS = /** @type {const} */ ({
  UNSUPPORTED_OR_AMBIGUOUS_MODE: 'unsupported_or_ambiguous_mode',
  SPATIAL_VALIDATION_FAILED: 'spatial_validation_failed',
  SPATIAL_DIAGNOSTICS_TIMEOUT: 'spatial_diagnostics_timeout'
});

export const SPATIAL_THRESHOLDS = Object.freeze({
  driving: Object.freeze({
    relaxed: Object.freeze({ distance_meters: 35000, duration_seconds: 3600 }),
    normal: Object.freeze({ distance_meters: 40000, duration_seconds: 4200 }),
    compact: Object.freeze({ distance_meters: 50000, duration_seconds: 4800 })
  }),
  walking: Object.freeze({
    relaxed: Object.freeze({ distance_meters: 2000, duration_seconds: 1800 }),
    normal: Object.freeze({ distance_meters: 2500, duration_seconds: 2250 }),
    compact: Object.freeze({ distance_meters: 3000, duration_seconds: 2700 })
  })
});

function createDiagnostics(overrides = {}) {
  return {
    checked_segments: 0,
    unavailable_segments: 0,
    estimated_segments: 0,
    skipped_segments: 0,
    ...overrides
  };
}

export function createUnavailableSpatialValidationResult(skipReason = undefined) {
  return {
    status: SPATIAL_VALIDATION_STATUS.UNAVAILABLE,
    issues: [],
    diagnostics: createDiagnostics(skipReason ? { skip_reason: skipReason } : {})
  };
}

export function normalizePace(value) {
  if (value === 'relaxed' || value === 'normal' || value === 'compact') {
    return value;
  }

  return 'normal';
}

export function resolveSegmentMode(segment) {
  if (segment?.mode === 'driving') {
    return 'driving';
  }

  if (segment?.mode === 'walking') {
    return 'walking';
  }

  return null;
}

export function normalizeNonNegativeNumber(value) {
  if (value === null || value === undefined) {
    return { ok: false, value: null };
  }

  if (typeof value === 'string' && value.trim() === '') {
    return { ok: false, value: null };
  }

  if (typeof value !== 'number' && typeof value !== 'string') {
    return { ok: false, value: null };
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return { ok: false, value: null };
  }

  return { ok: true, value: numeric };
}

function createTooFarIssue({ segment, mode, distanceMeters, durationSeconds }) {
  return {
    code: SPATIAL_ISSUE_CODES.ROUTE_SEGMENT_TOO_FAR,
    severity: 'medium',
    from_option_key: segment?.from_option_key || null,
    to_option_key: segment?.to_option_key || null,
    mode,
    distance_meters: distanceMeters,
    duration_seconds: durationSeconds,
    estimated: Boolean(segment?.estimated)
  };
}

export function validateRouteSpatialReasonability({
  constraintsSnapshot,
  mapEnrichmentResult
} = {}) {
  const segments = Array.isArray(mapEnrichmentResult?.segments) ? mapEnrichmentResult.segments : [];
  if (!segments.length) {
    return createUnavailableSpatialValidationResult();
  }

  const pace = normalizePace(constraintsSnapshot?.pace_preference);
  const issues = [];
  const diagnostics = createDiagnostics();

  for (const segment of segments) {
    const mode = resolveSegmentMode(segment);
    if (!mode) {
      diagnostics.skipped_segments += 1;
      diagnostics.skip_reason = SPATIAL_SKIP_REASONS.UNSUPPORTED_OR_AMBIGUOUS_MODE;
      continue;
    }

    const distance = normalizeNonNegativeNumber(segment?.distance_meters);
    const duration = normalizeNonNegativeNumber(segment?.duration_seconds);
    if (!distance.ok || !duration.ok) {
      diagnostics.unavailable_segments += 1;
      continue;
    }

    diagnostics.checked_segments += 1;
    if (segment?.estimated) {
      diagnostics.estimated_segments += 1;
    }

    const threshold = SPATIAL_THRESHOLDS[mode][pace];
    if (distance.value > threshold.distance_meters || duration.value > threshold.duration_seconds) {
      issues.push(createTooFarIssue({
        segment,
        mode,
        distanceMeters: distance.value,
        durationSeconds: duration.value
      }));
    }
  }

  if (issues.length) {
    return {
      status: SPATIAL_VALIDATION_STATUS.WARNING,
      issues,
      diagnostics
    };
  }

  if (diagnostics.checked_segments === 0) {
    return {
      status: SPATIAL_VALIDATION_STATUS.UNAVAILABLE,
      issues: [],
      diagnostics
    };
  }

  return {
    status: SPATIAL_VALIDATION_STATUS.OK,
    issues: [],
    diagnostics
  };
}
