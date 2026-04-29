import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CoordinateValidationError,
  normalizeAdminCoordinatePair,
  normalizeCoordinatePrecisionInput,
  normalizeCoordinateSourceInput,
  normalizeCoordinateValue,
  parseCoordinateNumber,
  validateAdminCoordinatePayload
} from '../src/utils/coordinates.js';

test('coordinate normalizer accepts finite number coordinates including global bounds', () => {
  assert.equal(normalizeCoordinateValue(25.8292, 'latitude'), 25.8292);
  assert.equal(normalizeCoordinateValue(-90, 'latitude'), -90);
  assert.equal(normalizeCoordinateValue(90, 'latitude'), 90);
  assert.equal(normalizeCoordinateValue(-180, 'longitude'), -180);
  assert.equal(normalizeCoordinateValue(180, 'longitude'), 180);
});

test('coordinate normalizer accepts strict DECIMAL-like strings', () => {
  assert.equal(parseCoordinateNumber('25.8292000'), 25.8292);
  assert.equal(normalizeCoordinateValue(' 25.8292 ', 'latitude'), 25.8292);
  assert.equal(normalizeCoordinateValue('-25.8292', 'latitude'), -25.8292);
});

test('coordinate normalizer rejects dirty strings and empty input', () => {
  for (const value of ['12abc', '25.8abc', 'NaN', 'Infinity', '', ' ', '1,23']) {
    assert.equal(parseCoordinateNumber(value), null);
    assert.equal(normalizeCoordinateValue(value, 'latitude'), null);
  }
});

test('coordinate normalizer rejects illegal types and non-finite numbers', () => {
  for (const value of [null, undefined, false, {}, [], Number.NaN, Infinity]) {
    assert.equal(parseCoordinateNumber(value), null);
    assert.equal(normalizeCoordinateValue(value, 'longitude'), null);
  }
});

test('coordinate normalizer rejects values outside global latitude and longitude bounds', () => {
  assert.equal(normalizeCoordinateValue(90.0001, 'latitude'), null);
  assert.equal(normalizeCoordinateValue(-90.0001, 'latitude'), null);
  assert.equal(normalizeCoordinateValue(180.0001, 'longitude'), null);
  assert.equal(normalizeCoordinateValue(-180.0001, 'longitude'), null);
});

test('coordinate normalizer does not hard reject coordinates outside Ganzhou bounding box', () => {
  assert.equal(normalizeCoordinateValue(40.7128, 'latitude'), 40.7128);
  assert.equal(normalizeCoordinateValue(-74.006, 'longitude'), -74.006);
});

test('admin coordinate pair requires latitude and longitude together', () => {
  assert.throws(
    () => normalizeAdminCoordinatePair({ latitude: '25.8292' }),
    CoordinateValidationError
  );
  assert.throws(
    () => normalizeAdminCoordinatePair({ longitude: '114.9336' }),
    CoordinateValidationError
  );
});

test('admin coordinate pair accepts valid pair and explicit clear pair', () => {
  assert.deepEqual(
    normalizeAdminCoordinatePair({ latitude: '25.8292', longitude: '114.9336' }),
    {
      provided: true,
      clear: false,
      latitude: 25.8292,
      longitude: 114.9336
    }
  );

  assert.deepEqual(
    normalizeAdminCoordinatePair({ latitude: '', longitude: ' ' }),
    {
      provided: true,
      clear: true,
      latitude: null,
      longitude: null
    }
  );
});

test('admin coordinate pair rejects half clear and dirty values', () => {
  assert.throws(
    () => normalizeAdminCoordinatePair({ latitude: '25.8292', longitude: '' }),
    CoordinateValidationError
  );
  assert.throws(
    () => normalizeAdminCoordinatePair({ latitude: '', longitude: '114.9336' }),
    CoordinateValidationError
  );
  assert.throws(
    () => normalizeAdminCoordinatePair({ latitude: '25.8abc', longitude: '114.9336' }),
    CoordinateValidationError
  );
});

test('admin coordinate metadata is enum constrained', () => {
  assert.deepEqual(normalizeCoordinateSourceInput({ coordinateSource: 'manual' }), {
    provided: true,
    value: 'manual'
  });
  assert.deepEqual(normalizeCoordinatePrecisionInput({ coordinatePrecision: 'scenic_area' }), {
    provided: true,
    value: 'scenic_area'
  });

  assert.throws(
    () => normalizeCoordinateSourceInput({ coordinateSource: 'gps' }),
    CoordinateValidationError
  );
  assert.throws(
    () => normalizeCoordinatePrecisionInput({ coordinatePrecision: ['exact'] }),
    CoordinateValidationError
  );
});

test('admin route validator helper reuses coordinate validation rules', () => {
  assert.equal(validateAdminCoordinatePayload({
    latitude: '25.8292',
    longitude: '114.9336',
    coordinateSource: 'seed',
    coordinatePrecision: 'exact'
  }), true);

  assert.throws(
    () => validateAdminCoordinatePayload({
      latitude: '12abc',
      longitude: '114.9336'
    }),
    CoordinateValidationError
  );
});
