// @ts-check

function isCoordinateSnapshot(value) {
  return Boolean(value)
    && typeof value === 'object'
    && typeof value.lat === 'number'
    && typeof value.lng === 'number'
    && Number.isFinite(value.lat)
    && Number.isFinite(value.lng);
}

function createCoordinateSnapshot(candidate) {
  const coordinates = candidate?.coordinates;

  if (!isCoordinateSnapshot(coordinates)) {
    return null;
  }

  return {
    lat: coordinates.lat,
    lng: coordinates.lng
  };
}

function normalizeTitleForLookup(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value
    .trim()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[，。、“”‘’《》：:；;！!？?（）()[\]{}.,'"`~\-—_]/g, '')
    .toLowerCase();

  return normalized || null;
}

function addTitleLookup(titleMap, title, snapshot) {
  const key = normalizeTitleForLookup(title);

  if (!key) {
    return;
  }

  const matches = titleMap.get(key) || [];
  matches.push(snapshot);
  titleMap.set(key, matches);
}

function addNumericIdLookup(idMap, value, snapshot) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return;
  }

  idMap.set(value, snapshot);
}

function buildLookup(candidates) {
  const itemKeyMap = new Map();
  const idMap = new Map();
  const titleMap = new Map();

  (Array.isArray(candidates) ? candidates : []).forEach((candidate) => {
    const coordinates = createCoordinateSnapshot(candidate);

    if (!coordinates) {
      return;
    }

    const snapshot = {
      item_key: typeof candidate?.item_key === 'string' ? candidate.item_key : null,
      source_id: typeof candidate?.source_id === 'number' && Number.isFinite(candidate.source_id)
        ? candidate.source_id
        : null,
      title: typeof candidate?.title === 'string' ? candidate.title : null,
      coordinates
    };

    if (snapshot.item_key) {
      itemKeyMap.set(snapshot.item_key, snapshot);
    }

    if (snapshot.source_id !== null) {
      idMap.set(snapshot.source_id, snapshot);
    }

    addTitleLookup(titleMap, snapshot.title, snapshot);
  });

  return {
    itemKeyMap,
    idMap,
    titleMap
  };
}

function lookupById(idMap, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return idMap.get(value)?.coordinates || null;
}

function lookupByTitle(titleMap, value) {
  const key = normalizeTitleForLookup(value);

  if (!key) {
    return null;
  }

  const matches = titleMap.get(key) || [];
  return matches.length === 1 ? matches[0].coordinates : null;
}

export function createCoordinateResolver(candidates = []) {
  const {
    itemKeyMap,
    idMap,
    titleMap
  } = buildLookup(Array.isArray(candidates) ? candidates.slice() : []);

  return function coordinateResolver(item) {
    try {
      if (!item || typeof item !== 'object') {
        return null;
      }

      if (typeof item.item_key === 'string') {
        const byKey = itemKeyMap.get(item.item_key);
        if (byKey?.coordinates) {
          return byKey.coordinates;
        }
      }

      const bySourceId = lookupById(idMap, item.source_id);
      if (bySourceId) {
        return bySourceId;
      }

      const byScenicId = lookupById(idMap, item.scenic_id);
      if (byScenicId) {
        return byScenicId;
      }

      const byId = lookupById(idMap, item.id);
      if (byId) {
        return byId;
      }

      return lookupByTitle(titleMap, item.title);
    } catch {
      return null;
    }
  };
}

export const ROUTE_COORDINATE_CONTEXT_PRIVATE = {
  createCoordinateSnapshot,
  normalizeTitleForLookup
};
