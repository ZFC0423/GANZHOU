// @ts-check

import fs from 'node:fs/promises';
import path from 'node:path';

import { MAP_PROVIDER_ERROR_CODES } from './contracts.js';

const DEFAULT_CACHE_PATH = path.resolve(process.cwd(), '.cache', 'map-provider-cache.json');
const DEFAULT_FLUSH_DEBOUNCE_MS = 50;

function createCacheMeta(overrides = {}) {
  return {
    cache_available: true,
    ...overrides
  };
}

function errorCodeFor(error, fallbackCode) {
  if (error instanceof SyntaxError) {
    return MAP_PROVIDER_ERROR_CODES.CACHE_CORRUPT;
  }

  return fallbackCode;
}

function normalizeLoadedCache(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value;
}

export function createMapProviderCache({
  cacheFilePath = DEFAULT_CACHE_PATH,
  fsImpl = fs,
  now = () => Date.now(),
  flushDebounceMs = DEFAULT_FLUSH_DEBOUNCE_MS
} = {}) {
  let entries = {};
  let loaded = false;
  let loadOncePromise = null;
  let dirty = false;
  let mutationVersion = 0;
  let flushedVersion = 0;
  let flushTimer = null;
  let flushPromise = null;
  let lastCacheMeta = createCacheMeta();

  async function ensureLoaded() {
    if (loaded) {
      return lastCacheMeta;
    }

    if (!loadOncePromise) {
      loadOncePromise = (async () => {
        try {
          const raw = await fsImpl.readFile(cacheFilePath, 'utf8');
          entries = normalizeLoadedCache(JSON.parse(raw));
          lastCacheMeta = createCacheMeta();
          loaded = true;
        } catch (error) {
          if (error?.code === 'ENOENT') {
            entries = {};
            lastCacheMeta = createCacheMeta();
            loaded = true;
          } else if (error instanceof SyntaxError) {
            entries = {};
            lastCacheMeta = createCacheMeta({
              cache_available: false,
              cache_error_code: MAP_PROVIDER_ERROR_CODES.CACHE_CORRUPT
            });
            loaded = true;
          } else {
            lastCacheMeta = createCacheMeta({
              cache_available: false,
              cache_error_code: errorCodeFor(error, MAP_PROVIDER_ERROR_CODES.CACHE_READ_FAILED)
            });
            loaded = false;
            loadOncePromise = null;
          }
        }

        return lastCacheMeta;
      })();
    }

    return loadOncePromise;
  }

  function scheduleFlush() {
    if (flushDebounceMs === 0) {
      return;
    }

    if (flushTimer) {
      clearTimeout(flushTimer);
    }

    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushNow();
    }, flushDebounceMs);

    if (typeof flushTimer.unref === 'function') {
      flushTimer.unref();
    }
  }

  async function flushNow() {
    await ensureLoaded();

    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    if (!dirty) {
      return lastCacheMeta;
    }

    if (flushPromise) {
      return flushPromise;
    }

    const targetPath = cacheFilePath;
    const tempPath = `${targetPath}.tmp`;
    const versionAtSnapshot = mutationVersion;
    const snapshot = JSON.stringify(entries, null, 2);

    flushPromise = (async () => {
      try {
        await fsImpl.mkdir(path.dirname(targetPath), { recursive: true });
        await fsImpl.writeFile(tempPath, snapshot, 'utf8');
        await fsImpl.rename(tempPath, targetPath);
        flushedVersion = versionAtSnapshot;
        dirty = mutationVersion !== flushedVersion;
        lastCacheMeta = createCacheMeta();
        if (dirty) {
          scheduleFlush();
        }
      } catch (error) {
        dirty = true;
        lastCacheMeta = createCacheMeta({
          cache_available: false,
          cache_error_code: MAP_PROVIDER_ERROR_CODES.CACHE_WRITE_FAILED
        });
      } finally {
        flushPromise = null;
      }

      return lastCacheMeta;
    })();

    return flushPromise;
  }

  async function get(key, { ttlMs = Infinity, allowStale = false } = {}) {
    const meta = await ensureLoaded();
    const entry = entries[key];

    if (!entry || !entry.value || typeof entry.created_at !== 'number') {
      return {
        hit: false,
        stale: false,
        value: null,
        meta
      };
    }

    const age = Math.max(0, now() - entry.created_at);
    const fresh = ttlMs === Infinity || age <= ttlMs;

    if (fresh || allowStale) {
      return {
        hit: true,
        stale: !fresh,
        value: entry.value,
        meta
      };
    }

    return {
      hit: false,
      stale: true,
      value: null,
      meta
    };
  }

  async function set(key, value) {
    const meta = await ensureLoaded();
    entries[key] = {
      value,
      created_at: now()
    };
    mutationVersion += 1;
    dirty = true;
    scheduleFlush();
    return meta;
  }

  function getMemorySnapshot() {
    return JSON.parse(JSON.stringify(entries));
  }

  return {
    get,
    set,
    flushNow,
    getMemorySnapshot,
    getLastMeta: () => lastCacheMeta,
    _private: {
      ensureLoaded
    }
  };
}

export const defaultMapProviderCache = createMapProviderCache();
