import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createBaiduMapProvider, createGeocodeCacheKey, createRouteCacheKey } from '../src/services/map-provider/baidu-provider.js';
import { createMapProviderCache } from '../src/services/map-provider/cache.js';
import { MAP_PROVIDER_STATUS } from '../src/services/map-provider/contracts.js';
import { estimateLightRouteByCoordinates } from '../src/services/map-provider/estimate.js';
import { createMapProvider } from '../src/services/map-provider/index.js';
import { createMockMapProvider } from '../src/services/map-provider/mock-provider.js';

const ORIGIN = { lat: 25.83109, lng: 114.93476 };
const DESTINATION = { lat: 25.8469, lng: 114.9274 };
const DAY_MS = 24 * 60 * 60 * 1000;

async function createTempCache(options = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'map-provider-test-'));
  const cacheFilePath = path.join(dir, 'map-provider-cache.json');
  const cache = createMapProviderCache({
    cacheFilePath,
    flushDebounceMs: 0,
    ...options
  });

  return {
    dir,
    cacheFilePath,
    cache,
    cleanup: async () => fs.rm(dir, { recursive: true, force: true })
  };
}

function createFetchResponse(payload) {
  return {
    json: async () => payload
  };
}

function createRouteSuccessPayload(distance = 1234, duration = 567) {
  return {
    status: 0,
    result: {
      routes: [
        {
          distance,
          duration
        }
      ]
    }
  };
}

function createGeocodeSuccessPayload() {
  return {
    status: 0,
    result: {
      location: {
        lat: 25.8469,
        lng: 114.9274
      },
      confidence: 80
    }
  };
}

test('mock provider returns stable geocode and route contracts without network', async () => {
  const provider = createMockMapProvider();

  const geocode = await provider.geocodeAddress({ address: 'Tongtianyan', city: 'Ganzhou' });
  assert.equal(geocode.provider, 'mock');
  assert.equal(geocode.status, MAP_PROVIDER_STATUS.OK);
  assert.equal(typeof geocode.data.location.lat, 'number');
  assert.equal(typeof geocode.data.location.lng, 'number');
  assert.equal(geocode.meta.real_call_used, false);

  const route = await provider.getLightRoute({
    origin: ORIGIN,
    destination: DESTINATION,
    mode: 'driving'
  });
  assert.equal(route.provider, 'mock');
  assert.equal(route.status, MAP_PROVIDER_STATUS.OK);
  assert.equal(route.data.mode, 'driving');
  assert.equal(typeof route.data.distance_meters, 'number');
  assert.equal(typeof route.data.duration_seconds, 'number');
  assert.equal(route.data.estimated, true);
});

test('baidu real-call disabled guard avoids fetch even when AK exists', async () => {
  const temp = await createTempCache();
  try {
    let calls = 0;
    const provider = createBaiduMapProvider({
      env: {
        NODE_ENV: 'development',
        MAP_PROVIDER: 'baidu',
        BAIDU_MAP_AK: 'test-placeholder-ak',
        BAIDU_MAP_ENABLE_REAL_CALLS: 'false'
      },
      cache: temp.cache,
      fetchImpl: async () => {
        calls += 1;
        return createFetchResponse(createRouteSuccessPayload());
      }
    });

    const route = await provider.getLightRoute({
      origin: ORIGIN,
      destination: DESTINATION,
      mode: 'walking'
    });
    assert.equal(route.status, MAP_PROVIDER_STATUS.ESTIMATED);
    assert.equal(route.meta.real_call_used, false);

    const geocode = await provider.geocodeAddress({ address: 'Tongtianyan', city: 'Ganzhou' });
    assert.equal(geocode.status, MAP_PROVIDER_STATUS.DISABLED);
    assert.equal(geocode.meta.real_call_used, false);
    assert.equal(calls, 0);
  } finally {
    await temp.cleanup();
  }
});

test('NODE_ENV test forbids global fetch without injected fetchImpl', async () => {
  const temp = await createTempCache();
  try {
    const provider = createBaiduMapProvider({
      env: {
        NODE_ENV: 'test',
        MAP_PROVIDER: 'baidu',
        BAIDU_MAP_AK: 'test-placeholder-ak',
        BAIDU_MAP_ENABLE_REAL_CALLS: 'true'
      },
      cache: temp.cache
    });

    const route = await provider.getLightRoute({
      origin: ORIGIN,
      destination: DESTINATION,
      mode: 'driving'
    });
    assert.equal(route.status, MAP_PROVIDER_STATUS.ESTIMATED);
    assert.equal(route.meta.real_call_used, false);

    const geocode = await provider.geocodeAddress({ address: 'Tongtianyan', city: 'Ganzhou' });
    assert.equal(geocode.status, MAP_PROVIDER_STATUS.DISABLED);
    assert.equal(geocode.meta.real_call_used, false);
  } finally {
    await temp.cleanup();
  }
});

test('cache hit avoids provider fetch after successful route write', async () => {
  const temp = await createTempCache();
  try {
    let calls = 0;
    const provider = createBaiduMapProvider({
      env: {
        NODE_ENV: 'test',
        MAP_PROVIDER: 'baidu',
        BAIDU_MAP_AK: 'test-placeholder-ak',
        BAIDU_MAP_ENABLE_REAL_CALLS: 'true'
      },
      cache: temp.cache,
      fetchImpl: async () => {
        calls += 1;
        return createFetchResponse(createRouteSuccessPayload());
      }
    });

    const first = await provider.getLightRoute({
      origin: ORIGIN,
      destination: DESTINATION,
      mode: 'driving'
    });
    assert.equal(first.status, MAP_PROVIDER_STATUS.OK);
    assert.equal(calls, 1);

    const second = await provider.getLightRoute({
      origin: ORIGIN,
      destination: DESTINATION,
      mode: 'driving'
    });
    assert.equal(second.status, MAP_PROVIDER_STATUS.CACHE_HIT);
    assert.equal(second.meta.real_call_used, false);
    assert.equal(calls, 1);
  } finally {
    await temp.cleanup();
  }
});

test('stale route cache is used after provider business failure', async () => {
  let now = 1_000;
  const temp = await createTempCache({ now: () => now });
  try {
    const key = createRouteCacheKey({ mode: 'driving', origin: ORIGIN, destination: DESTINATION });
    await temp.cache.set(key, {
      mode: 'driving',
      origin: ORIGIN,
      destination: DESTINATION,
      distance_meters: 1111,
      duration_seconds: 222,
      polyline: null,
      raw_provider_status: '0'
    });
    await temp.cache.flushNow();
    now += 8 * DAY_MS;

    const provider = createBaiduMapProvider({
      env: {
        NODE_ENV: 'test',
        MAP_PROVIDER: 'baidu',
        BAIDU_MAP_AK: 'test-placeholder-ak',
        BAIDU_MAP_ENABLE_REAL_CALLS: 'true'
      },
      cache: temp.cache,
      now: () => now,
      fetchImpl: async () => createFetchResponse({ status: 302, message: 'quota exceeded' })
    });

    const result = await provider.getLightRoute({
      origin: ORIGIN,
      destination: DESTINATION,
      mode: 'driving'
    });
    assert.equal(result.status, MAP_PROVIDER_STATUS.STALE_CACHE_FALLBACK);
    assert.equal(result.data.distance_meters, 1111);
    assert.equal(result.meta.stale_cache_used, true);
    assert.equal(result.meta.fallback_used, true);
    assert.equal(result.meta.real_call_used, true);
  } finally {
    await temp.cleanup();
  }
});

test('invalid address, mode, and coordinates return invalid_request', async () => {
  const temp = await createTempCache();
  try {
    const provider = createBaiduMapProvider({
      env: {
        NODE_ENV: 'test',
        MAP_PROVIDER: 'baidu',
        BAIDU_MAP_AK: 'test-placeholder-ak',
        BAIDU_MAP_ENABLE_REAL_CALLS: 'true'
      },
      cache: temp.cache,
      fetchImpl: async () => createFetchResponse(createRouteSuccessPayload())
    });

    const geocode = await provider.geocodeAddress({ address: '', city: 'Ganzhou' });
    assert.equal(geocode.status, MAP_PROVIDER_STATUS.INVALID_REQUEST);

    const mode = await provider.getLightRoute({
      origin: ORIGIN,
      destination: DESTINATION,
      mode: 'transit'
    });
    assert.equal(mode.status, MAP_PROVIDER_STATUS.INVALID_REQUEST);

    const coords = await provider.getLightRoute({
      origin: { lat: 'bad', lng: 114 },
      destination: DESTINATION,
      mode: 'walking'
    });
    assert.equal(coords.status, MAP_PROVIDER_STATUS.INVALID_REQUEST);
  } finally {
    await temp.cleanup();
  }
});

test('baidu business error normalizes to provider_error without AK leak for geocode', async () => {
  const temp = await createTempCache();
  try {
    const provider = createBaiduMapProvider({
      env: {
        NODE_ENV: 'test',
        MAP_PROVIDER: 'baidu',
        BAIDU_MAP_AK: 'test-placeholder-ak',
        BAIDU_MAP_ENABLE_REAL_CALLS: 'true'
      },
      cache: temp.cache,
      fetchImpl: async () => createFetchResponse({ status: 302, message: 'bad test-placeholder-ak' })
    });

    const result = await provider.geocodeAddress({ address: 'Tongtianyan', city: 'Ganzhou' });
    assert.equal(result.status, MAP_PROVIDER_STATUS.PROVIDER_ERROR);
    assert.doesNotMatch(JSON.stringify(result), /test-placeholder-ak/);
  } finally {
    await temp.cleanup();
  }
});

test('baidu geocode parser rejects null and blank location fields', async () => {
  for (const payload of [
    {
      status: 0,
      result: {
        location: {
          lat: null,
          lng: 114.9274
        }
      }
    },
    {
      status: 0,
      result: {
        location: {
          lat: 25.8469,
          lng: ''
        }
      }
    }
  ]) {
    const temp = await createTempCache();
    try {
      const provider = createBaiduMapProvider({
        env: {
          NODE_ENV: 'test',
          MAP_PROVIDER: 'baidu',
          BAIDU_MAP_AK: 'test-placeholder-ak',
          BAIDU_MAP_ENABLE_REAL_CALLS: 'true'
        },
        cache: temp.cache,
        fetchImpl: async () => createFetchResponse(payload)
      });

      const result = await provider.geocodeAddress({ address: 'Tongtianyan', city: 'Ganzhou' });
      assert.equal(result.status, MAP_PROVIDER_STATUS.PROVIDER_ERROR);
      assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity|test-placeholder-ak/);
    } finally {
      await temp.cleanup();
    }
  }
});

test('baidu route parser rejects null and blank distance or duration fields', async () => {
  for (const payload of [
    {
      status: 0,
      result: {
        routes: [
          {
            distance: null,
            duration: 600
          }
        ]
      }
    },
    {
      status: 0,
      result: {
        routes: [
          {
            distance: 1200,
            duration: ''
          }
        ]
      }
    }
  ]) {
    const temp = await createTempCache();
    try {
      const provider = createBaiduMapProvider({
        env: {
          NODE_ENV: 'test',
          MAP_PROVIDER: 'baidu',
          BAIDU_MAP_AK: 'test-placeholder-ak',
          BAIDU_MAP_ENABLE_REAL_CALLS: 'true'
        },
        cache: temp.cache,
        fetchImpl: async () => createFetchResponse(payload)
      });

      const result = await provider.getLightRoute({
        origin: ORIGIN,
        destination: DESTINATION,
        mode: 'driving'
      });

      assert.equal(result.status, MAP_PROVIDER_STATUS.ESTIMATED);
      assert.equal(result.meta.real_call_used, true);
      assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity|test-placeholder-ak/);
    } finally {
      await temp.cleanup();
    }
  }
});

test('fetch throws and JSON parse failures normalize to provider_unavailable without throwing', async () => {
  const throwingTemp = await createTempCache();
  try {
    const throwingProvider = createBaiduMapProvider({
      env: {
        NODE_ENV: 'test',
        MAP_PROVIDER: 'baidu',
        BAIDU_MAP_AK: 'test-placeholder-ak',
        BAIDU_MAP_ENABLE_REAL_CALLS: 'true'
      },
      cache: throwingTemp.cache,
      fetchImpl: async () => {
        throw new Error('network down test-placeholder-ak');
      }
    });
    const unavailable = await throwingProvider.geocodeAddress({ address: 'Tongtianyan', city: 'Ganzhou' });
    assert.equal(unavailable.status, MAP_PROVIDER_STATUS.PROVIDER_UNAVAILABLE);
    assert.doesNotMatch(JSON.stringify(unavailable), /test-placeholder-ak/);
  } finally {
    await throwingTemp.cleanup();
  }

  const jsonTemp = await createTempCache();
  try {
    const jsonProvider = createBaiduMapProvider({
      env: {
        NODE_ENV: 'test',
        MAP_PROVIDER: 'baidu',
        BAIDU_MAP_AK: 'test-placeholder-ak',
        BAIDU_MAP_ENABLE_REAL_CALLS: 'true'
      },
      cache: jsonTemp.cache,
      fetchImpl: async () => ({
        json: async () => {
          throw new Error('invalid json test-placeholder-ak');
        }
      })
    });
    const unavailable = await jsonProvider.geocodeAddress({ address: 'Tongtianyan', city: 'Ganzhou' });
    assert.equal(unavailable.status, MAP_PROVIDER_STATUS.PROVIDER_UNAVAILABLE);
    assert.doesNotMatch(JSON.stringify(unavailable), /test-placeholder-ak/);
  } finally {
    await jsonTemp.cleanup();
  }
});

test('Haversine fallback returns finite estimated numbers and no NaN', async () => {
  const result = estimateLightRouteByCoordinates({
    origin: ORIGIN,
    destination: DESTINATION,
    mode: 'walking'
  });

  assert.equal(result.status, MAP_PROVIDER_STATUS.ESTIMATED);
  assert.equal(result.data.estimated, true);
  assert.equal(result.data.estimate_method, 'haversine_city_factor');
  assert.equal(Number.isFinite(result.data.distance_meters), true);
  assert.equal(Number.isFinite(result.data.duration_seconds), true);
  assert.equal(typeof result.data.distance_meters, 'number');
  assert.equal(typeof result.data.duration_seconds, 'number');
  assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity/);
});

test('Haversine rejects nullish blank boolean object and array coordinates', async () => {
  for (const badValue of [null, undefined, '', '   ', false, {}, []]) {
    const result = estimateLightRouteByCoordinates({
      origin: { lat: badValue, lng: 114 },
      destination: DESTINATION,
      mode: 'walking'
    });
    assert.equal(result.status, MAP_PROVIDER_STATUS.INVALID_REQUEST);
  }
}
);

test('disabled route without usable coordinates returns provider_unavailable instead of estimating', async () => {
  const temp = await createTempCache();
  try {
    const provider = createBaiduMapProvider({
      env: {
        NODE_ENV: 'development',
        MAP_PROVIDER: 'baidu',
        BAIDU_MAP_AK: '',
        BAIDU_MAP_ENABLE_REAL_CALLS: 'false'
      },
      cache: temp.cache
    });

    const result = await provider.getLightRoute({
      origin: null,
      destination: null,
      mode: 'driving'
    });
    assert.equal(result.status, MAP_PROVIDER_STATUS.INVALID_REQUEST);
  } finally {
    await temp.cleanup();
  }
});

test('cache read corrupt failure reports shared metadata fields and does not throw', async () => {
  const temp = await createTempCache();
  try {
    await fs.mkdir(path.dirname(temp.cacheFilePath), { recursive: true });
    await fs.writeFile(temp.cacheFilePath, '{bad json', 'utf8');

    const result = await temp.cache.get('missing');
    assert.equal(result.hit, false);
    assert.equal(result.meta.cache_available, false);
    assert.equal(result.meta.cache_error_code, 'cache_corrupt');
  } finally {
    await temp.cleanup();
  }
});

test('cache write failure reports cache_available false without throwing', async () => {
  const fsImpl = {
    readFile: async () => {
      const error = new Error('missing');
      error.code = 'ENOENT';
      throw error;
    },
    mkdir: async () => {},
    writeFile: async () => {
      throw new Error('disk full');
    },
    rename: async () => {}
  };
  const cache = createMapProviderCache({
    cacheFilePath: 'memory-cache.json',
    fsImpl,
    flushDebounceMs: 0
  });

  await cache.set('key', { value: true });
  const meta = await cache.flushNow();

  assert.equal(meta.cache_available, false);
  assert.equal(meta.cache_error_code, 'cache_write_failed');
});

test('cache lazy load is single-flight and keeps one in-memory source of truth', async () => {
  let readCount = 0;
  const fsImpl = {
    readFile: async () => {
      readCount += 1;
      await Promise.resolve();
      return JSON.stringify({
        existing: {
          value: { ok: true },
          created_at: 1
        }
      });
    },
    mkdir: async () => {},
    writeFile: async () => {},
    rename: async () => {}
  };
  const cache = createMapProviderCache({
    cacheFilePath: 'memory-cache.json',
    fsImpl,
    flushDebounceMs: 0,
    now: () => 2
  });

  const [first, second] = await Promise.all([
    cache.get('existing'),
    cache.get('existing')
  ]);
  assert.equal(first.hit, true);
  assert.equal(second.hit, true);
  assert.equal(readCount, 1);

  await cache.set('new-key', { ok: 'new' });
  const snapshot = cache.getMemorySnapshot();
  assert.equal(snapshot.existing.value.ok, true);
  assert.equal(snapshot['new-key'].value.ok, 'new');
});

test('cache transient read failures can retry on the next access', async () => {
  let readCount = 0;
  const fsImpl = {
    readFile: async () => {
      readCount += 1;
      if (readCount === 1) {
        const error = new Error('file busy');
        error.code = 'EBUSY';
        throw error;
      }
      return JSON.stringify({
        cached: {
          value: { ok: true },
          created_at: 1
        }
      });
    },
    mkdir: async () => {},
    writeFile: async () => {},
    rename: async () => {}
  };
  const cache = createMapProviderCache({
    cacheFilePath: 'memory-cache.json',
    fsImpl,
    flushDebounceMs: 0,
    now: () => 2
  });

  const first = await cache.get('cached');
  assert.equal(first.hit, false);
  assert.equal(first.meta.cache_available, false);
  assert.equal(first.meta.cache_error_code, 'cache_read_failed');

  const second = await cache.get('cached');
  assert.equal(second.hit, true);
  assert.equal(second.value.ok, true);
  assert.equal(readCount, 2);
});

test('cache flush writes temp file and renames atomically', async () => {
  const writes = [];
  const renames = [];
  const fsImpl = {
    readFile: async () => {
      const error = new Error('missing');
      error.code = 'ENOENT';
      throw error;
    },
    mkdir: async () => {},
    writeFile: async (filePath, content) => {
      writes.push({ filePath, content });
    },
    rename: async (from, to) => {
      renames.push({ from, to });
    }
  };
  const cache = createMapProviderCache({
    cacheFilePath: 'map-provider-cache.json',
    fsImpl,
    flushDebounceMs: 0
  });

  await cache.set('key', { ok: true });
  await cache.flushNow();

  assert.equal(writes.length, 1);
  assert.equal(writes[0].filePath.endsWith('.tmp'), true);
  assert.equal(renames.length, 1);
  assert.equal(renames[0].from, writes[0].filePath);
  assert.equal(renames[0].to, 'map-provider-cache.json');
});

test('cache flush preserves dirty state when set happens during write', async () => {
  const writes = [];
  let cache;
  const fsImpl = {
    readFile: async () => {
      const error = new Error('missing');
      error.code = 'ENOENT';
      throw error;
    },
    mkdir: async () => {},
    writeFile: async (filePath, content) => {
      void filePath;
      writes.push(JSON.parse(content));
      if (writes.length === 1) {
        await cache.set('second', { value: 2 });
      }
    },
    rename: async () => {}
  };
  cache = createMapProviderCache({
    cacheFilePath: 'map-provider-cache.json',
    fsImpl,
    flushDebounceMs: 0,
    now: () => writes.length + 1
  });

  await cache.set('first', { value: 1 });
  await cache.flushNow();
  assert.equal(Object.hasOwn(writes[0], 'first'), true);
  assert.equal(Object.hasOwn(writes[0], 'second'), false);

  await cache.flushNow();
  assert.equal(Object.hasOwn(writes[1], 'second'), true);
});

test('baidu throttle reserves request slots for concurrent real calls', async () => {
  const temp = await createTempCache();
  try {
    const sleeps = [];
    let calls = 0;
    const provider = createBaiduMapProvider({
      env: {
        NODE_ENV: 'test',
        MAP_PROVIDER: 'baidu',
        BAIDU_MAP_AK: 'test-placeholder-ak',
        BAIDU_MAP_ENABLE_REAL_CALLS: 'true'
      },
      cache: temp.cache,
      now: () => 1_000,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      fetchImpl: async () => {
        calls += 1;
        return createFetchResponse(createRouteSuccessPayload(calls * 1000, calls * 100));
      }
    });

    await Promise.all([
      provider.getLightRoute({
        origin: ORIGIN,
        destination: DESTINATION,
        mode: 'driving'
      }),
      provider.getLightRoute({
        origin: { lat: 25.832, lng: 114.935 },
        destination: DESTINATION,
        mode: 'driving'
      }),
      provider.getLightRoute({
        origin: { lat: 25.833, lng: 114.936 },
        destination: DESTINATION,
        mode: 'driving'
      })
    ]);

    assert.deepEqual(sleeps, [333, 666]);
    assert.equal(calls, 3);
  } finally {
    await temp.cleanup();
  }
});

test('baidu throttle overflow does not call fetch and keeps real_call_used false', async () => {
  const temp = await createTempCache();
  try {
    let calls = 0;
    const provider = createBaiduMapProvider({
      env: {
        NODE_ENV: 'test',
        MAP_PROVIDER: 'baidu',
        BAIDU_MAP_AK: 'test-placeholder-ak',
        BAIDU_MAP_ENABLE_REAL_CALLS: 'true'
      },
      cache: temp.cache,
      now: () => 1_000,
      sleep: async () => {},
      timeoutMs: 3000,
      maxThrottleWaitMs: 100,
      fetchImpl: async () => {
        calls += 1;
        return createFetchResponse(createRouteSuccessPayload());
      }
    });

    const [first, second] = await Promise.all([
      provider.getLightRoute({
        origin: ORIGIN,
        destination: DESTINATION,
        mode: 'driving'
      }),
      provider.getLightRoute({
        origin: { lat: 25.832, lng: 114.935 },
        destination: DESTINATION,
        mode: 'driving'
      })
    ]);

    assert.equal(first.status, MAP_PROVIDER_STATUS.OK);
    assert.equal(second.status, MAP_PROVIDER_STATUS.ESTIMATED);
    assert.equal(second.meta.real_call_used, false);
    assert.equal(calls, 1);
  } finally {
    await temp.cleanup();
  }
});

test('map provider index defaults to mock provider', async () => {
  const provider = createMapProvider({
    env: {
      NODE_ENV: 'development'
    }
  });

  const result = await provider.geocodeAddress({ address: 'Tongtianyan', city: 'Ganzhou' });
  assert.equal(result.provider, 'mock');
  assert.equal(result.status, MAP_PROVIDER_STATUS.OK);
});

test('geocode cache key and route cache key are stable and normalized', () => {
  assert.equal(
    createGeocodeCacheKey({ address: '  Tongtianyan  ', city: '  Ganzhou ' }),
    'geocode:v1:ganzhou:tongtianyan'
  );
  assert.equal(
    createRouteCacheKey({
      mode: 'walking',
      origin: { lat: 25.8310904, lng: 114.9347604 },
      destination: { lat: 25.8469004, lng: 114.9274004 }
    }),
    'route:v1:walking:114.934760,25.831090:114.927400,25.846900'
  );
});

test('route cache key rejects invalid coordinates instead of producing NaN keys', () => {
  assert.throws(() => createRouteCacheKey({
    mode: 'walking',
    origin: { lat: '', lng: 114 },
    destination: DESTINATION
  }), TypeError);
});

test('successful geocode writes cache and second call is cache_hit', async () => {
  const temp = await createTempCache();
  try {
    let calls = 0;
    const provider = createBaiduMapProvider({
      env: {
        NODE_ENV: 'test',
        MAP_PROVIDER: 'baidu',
        BAIDU_MAP_AK: 'test-placeholder-ak',
        BAIDU_MAP_ENABLE_REAL_CALLS: 'true'
      },
      cache: temp.cache,
      fetchImpl: async () => {
        calls += 1;
        return createFetchResponse(createGeocodeSuccessPayload());
      }
    });

    const first = await provider.geocodeAddress({ address: 'Tongtianyan', city: 'Ganzhou' });
    assert.equal(first.status, MAP_PROVIDER_STATUS.OK);
    assert.equal(calls, 1);

    const second = await provider.geocodeAddress({ address: 'Tongtianyan', city: 'Ganzhou' });
    assert.equal(second.status, MAP_PROVIDER_STATUS.CACHE_HIT);
    assert.equal(second.meta.real_call_used, false);
    assert.equal(calls, 1);
  } finally {
    await temp.cleanup();
  }
});
