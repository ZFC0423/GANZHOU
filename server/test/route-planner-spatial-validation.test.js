import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SPATIAL_SKIP_REASONS,
  normalizeNonNegativeNumber,
  normalizePace,
  resolveSegmentMode,
  validateRouteSpatialReasonability
} from '../src/services/ai/route-planner-agent/spatial-validation.js';

function validate({ pace = 'normal', travelMode = 'self_drive', segments = [] } = {}) {
  return validateRouteSpatialReasonability({
    constraintsSnapshot: {
      pace_preference: pace,
      travel_mode: travelMode
    },
    mapEnrichmentResult: {
      status: segments.length ? 'ok' : 'unavailable',
      segments
    }
  });
}

function segment(overrides = {}) {
  return {
    from_option_key: 'scenic:1',
    to_option_key: 'scenic:2',
    mode: 'driving',
    distance_meters: 1000,
    duration_seconds: 300,
    estimated: false,
    ...overrides
  };
}

test('normalizePace defaults null and unknown values to normal', () => {
  assert.equal(normalizePace('relaxed'), 'relaxed');
  assert.equal(normalizePace('normal'), 'normal');
  assert.equal(normalizePace('compact'), 'compact');
  assert.equal(normalizePace(null), 'normal');
  assert.equal(normalizePace('fast'), 'normal');
});

test('normalizeNonNegativeNumber rejects empty nullish non-finite and negative values', () => {
  for (const value of [null, undefined, '', '   ', false, {}, [], Symbol('x'), () => {}, Number.NaN, Infinity, -Infinity, -1]) {
    assert.deepEqual(normalizeNonNegativeNumber(value), { ok: false, value: null });
  }

  assert.deepEqual(normalizeNonNegativeNumber(0), { ok: true, value: 0 });
  assert.deepEqual(normalizeNonNegativeNumber('12.5'), { ok: true, value: 12.5 });
});

test('resolveSegmentMode is segment-first and only accepts concrete supported modes', () => {
  assert.equal(resolveSegmentMode({ mode: 'driving' }), 'driving');
  assert.equal(resolveSegmentMode({ mode: 'walking' }), 'walking');
  assert.equal(resolveSegmentMode({ mode: 'public_transport' }), null);
  assert.equal(resolveSegmentMode({}), null);
});

test('driving thresholds cover relaxed normal compact and unknown pace defaults', () => {
  const relaxed = validate({
    pace: 'relaxed',
    segments: [segment({ distance_meters: 35001, duration_seconds: 1000 })]
  });
  assert.equal(relaxed.status, 'warning');

  const normal = validate({
    pace: 'normal',
    segments: [segment({ distance_meters: 40001, duration_seconds: 1000 })]
  });
  assert.equal(normal.status, 'warning');

  const compactOk = validate({
    pace: 'compact',
    segments: [segment({ distance_meters: 45000, duration_seconds: 4700 })]
  });
  assert.equal(compactOk.status, 'ok');

  const unknownPace = validate({
    pace: 'unexpected',
    segments: [segment({ distance_meters: 40001, duration_seconds: 1000 })]
  });
  assert.equal(unknownPace.status, 'warning');
});

test('walking thresholds cover relaxed normal and compact', () => {
  const relaxed = validate({
    pace: 'relaxed',
    travelMode: 'mixed',
    segments: [segment({ mode: 'walking', distance_meters: 2001, duration_seconds: 1000 })]
  });
  assert.equal(relaxed.status, 'warning');

  const normal = validate({
    pace: 'normal',
    travelMode: 'mixed',
    segments: [segment({ mode: 'walking', distance_meters: 2501, duration_seconds: 1000 })]
  });
  assert.equal(normal.status, 'warning');

  const compactOk = validate({
    pace: 'compact',
    travelMode: 'mixed',
    segments: [segment({ mode: 'walking', distance_meters: 2900, duration_seconds: 2600 })]
  });
  assert.equal(compactOk.status, 'ok');
});

test('estimated segment warning preserves estimated marker', () => {
  const result = validate({
    pace: 'relaxed',
    segments: [segment({ estimated: true, distance_meters: 36000 })]
  });

  assert.equal(result.status, 'warning');
  assert.equal(result.issues[0].estimated, true);
  assert.equal(result.diagnostics.estimated_segments, 1);
});

test('invalid segment numbers do not become zero and are counted unavailable', () => {
  const result = validate({
    segments: [
      segment({ distance_meters: null }),
      segment({ distance_meters: '' }),
      segment({ duration_seconds: null }),
      segment({ duration_seconds: '' }),
      segment({ distance_meters: -1 }),
      segment({ duration_seconds: -1 })
    ]
  });

  assert.equal(result.status, 'unavailable');
  assert.equal(result.diagnostics.unavailable_segments, 6);
  assert.equal(result.diagnostics.checked_segments, 0);
});

test('no segments and no checkable segments return unavailable without throwing', () => {
  assert.equal(validate({ segments: [] }).status, 'unavailable');

  const skipped = validate({
    travelMode: 'public_transport',
    segments: [segment({ mode: null })]
  });
  assert.equal(skipped.status, 'unavailable');
  assert.equal(skipped.diagnostics.skipped_segments, 1);
  assert.equal(skipped.diagnostics.skip_reason, SPATIAL_SKIP_REASONS.UNSUPPORTED_OR_AMBIGUOUS_MODE);
});

test('public transport mixed and unknown travel mode do not default missing mode to walking', () => {
  for (const travelMode of ['public_transport', 'mixed', null, 'unknown']) {
    const result = validate({
      travelMode,
      segments: [segment({ mode: undefined, distance_meters: 999999, duration_seconds: 999999 })]
    });

    assert.equal(result.status, 'unavailable');
    assert.equal(result.issues.length, 0);
    assert.equal(result.diagnostics.skipped_segments, 1);
  }
});

test('mixed mode can validate explicit driving and walking segment modes', () => {
  const driving = validate({
    pace: 'normal',
    travelMode: 'mixed',
    segments: [segment({ mode: 'driving', distance_meters: 41000 })]
  });
  assert.equal(driving.status, 'warning');
  assert.equal(driving.issues[0].mode, 'driving');

  const walking = validate({
    pace: 'normal',
    travelMode: 'mixed',
    segments: [segment({ mode: 'walking', distance_meters: 2600 })]
  });
  assert.equal(walking.status, 'warning');
  assert.equal(walking.issues[0].mode, 'walking');
});

test('diagnostics counts checked skipped estimated unavailable segments accurately', () => {
  const result = validate({
    pace: 'normal',
    segments: [
      segment({ estimated: true, distance_meters: 1000 }),
      segment({ mode: 'bus' }),
      segment({ duration_seconds: '' }),
      segment({ distance_meters: 41000 })
    ]
  });

  assert.equal(result.status, 'warning');
  assert.equal(result.diagnostics.checked_segments, 2);
  assert.equal(result.diagnostics.skipped_segments, 1);
  assert.equal(result.diagnostics.unavailable_segments, 1);
  assert.equal(result.diagnostics.estimated_segments, 1);
  assert.equal(result.issues.length, 1);
});
