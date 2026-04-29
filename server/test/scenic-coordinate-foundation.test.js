import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Category, ScenicSpot } from '../src/models/index.js';
import {
  createScenic,
  updateScenic
} from '../src/services/admin-scenic.service.js';
import {
  FRONT_SCENIC_PUBLIC_ATTRIBUTES,
  getScenicDetail,
  getScenicList
} from '../src/services/scenic.service.js';

const COORDINATE_DB_FIELDS = [
  'latitude',
  'longitude',
  'coordinate_source',
  'coordinate_precision',
  'coordinate_updated_at'
];

const COORDINATE_RESPONSE_FIELDS = [
  'latitude',
  'longitude',
  'coordinateSource',
  'coordinatePrecision',
  'coordinateUpdatedAt'
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../../sql/schema.sql');

function createScenicRecord(overrides = {}) {
  return {
    id: 1,
    name: 'Tongtianyan',
    region: 'Zhanggong',
    category_id: 2,
    category: {
      id: 2,
      name: 'History Scenic',
      code: 'scenic_history'
    },
    cover_image: '/uploads/scenic/tongtianyan-cover.jpg',
    gallery_images: '[]',
    intro: 'Intro',
    culture_desc: 'Culture',
    hero_caption: 'Caption',
    route_label: 'Route',
    mood_tone: 'amber',
    quote: 'Quote',
    best_visit_season: 'Spring',
    visit_mode: 'Walk',
    pairing_suggestion: 'Pairing',
    best_light_time: 'Morning',
    walking_intensity: 'Light',
    photo_point: 'Gate',
    family_friendly: 1,
    open_time: 'All day',
    ticket_info: 'Free',
    suggested_duration: '1 hour',
    address: 'Zhanggong District, Ganzhou',
    latitude: '25.8292000',
    longitude: '114.9336000',
    coordinate_source: 'seed',
    coordinate_precision: 'exact',
    coordinate_updated_at: new Date('2026-01-01T00:00:00.000Z'),
    traffic_guide: 'Walk',
    tips: 'Tips',
    tags: 'history,old-city',
    recommend_flag: 1,
    hot_score: 98,
    status: 1,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides
  };
}

function assertNoCoordinateResponseFields(value) {
  const serialized = JSON.stringify(value);

  for (const field of COORDINATE_RESPONSE_FIELDS) {
    assert.ok(!(field in value), `${field} should not be present`);
    assert.ok(!serialized.includes(`"${field}"`), `${field} should not appear in nested response`);
  }

  for (const field of COORDINATE_DB_FIELDS) {
    assert.ok(!serialized.includes(`"${field}"`), `${field} should not appear in response`);
  }
}

async function withPatchedModels(patches, run) {
  const originals = [];

  for (const [target, methods] of patches) {
    for (const [name, replacement] of Object.entries(methods)) {
      originals.push([target, name, target[name]]);
      target[name] = replacement;
    }
  }

  try {
    await run();
  } finally {
    for (const [target, name, original] of originals.reverse()) {
      target[name] = original;
    }
  }
}

function createUpdateFindByPk(record, detailOverrides = {}) {
  let callCount = 0;

  return async () => {
    callCount += 1;
    return callCount % 2 === 1 ? record : createScenicRecord(detailOverrides);
  };
}

test('schema source of truth and ScenicSpot model include coordinate governance fields', () => {
  const schema = fs.readFileSync(schemaPath, 'utf8');

  for (const field of COORDINATE_DB_FIELDS) {
    assert.match(schema, new RegExp(`\`${field}\``));
    assert.ok(ScenicSpot.rawAttributes[field], `${field} should exist on ScenicSpot model`);
  }
});

test('front scenic public attributes include association keys and exclude coordinate governance fields', () => {
  assert.ok(FRONT_SCENIC_PUBLIC_ATTRIBUTES.includes('id'));
  assert.ok(FRONT_SCENIC_PUBLIC_ATTRIBUTES.includes('category_id'));
  assert.ok(FRONT_SCENIC_PUBLIC_ATTRIBUTES.includes('recommend_flag'));
  assert.ok(FRONT_SCENIC_PUBLIC_ATTRIBUTES.includes('hot_score'));

  for (const field of COORDINATE_DB_FIELDS) {
    assert.ok(!FRONT_SCENIC_PUBLIC_ATTRIBUTES.includes(field), `${field} should not be selected`);
  }
});

test('front scenic list uses attributes allowlist and does not expose coordinate governance fields', async () => {
  let capturedOptions = null;

  await withPatchedModels([
    [ScenicSpot, {
      findAndCountAll: async (options) => {
        capturedOptions = options;
        return {
          rows: [createScenicRecord()],
          count: 1
        };
      }
    }]
  ], async () => {
    const result = await getScenicList({});

    assert.deepEqual(capturedOptions.attributes, FRONT_SCENIC_PUBLIC_ATTRIBUTES);
    assert.equal(result.list[0].id, 1);
    assert.equal(result.list[0].categoryName, 'History Scenic');
    assertNoCoordinateResponseFields(result.list[0]);
  });
});

test('front scenic detail and related list use attributes allowlist and keep category data', async () => {
  const capturedOptions = [];

  await withPatchedModels([
    [ScenicSpot, {
      findOne: async (options) => {
        capturedOptions.push(options);
        return createScenicRecord();
      },
      findAll: async (options) => {
        capturedOptions.push(options);
        return [createScenicRecord({ id: 2, name: 'Yugutai' })];
      }
    }]
  ], async () => {
    const result = await getScenicDetail(1);

    assert.deepEqual(capturedOptions[0].attributes, FRONT_SCENIC_PUBLIC_ATTRIBUTES);
    assert.deepEqual(capturedOptions[1].attributes, FRONT_SCENIC_PUBLIC_ATTRIBUTES);
    assert.equal(result.categoryName, 'History Scenic');
    assert.equal(result.relatedList[0].categoryName, 'History Scenic');
    assertNoCoordinateResponseFields(result);
  });
});

test('admin create accepts legal coordinates and defaults coordinate metadata', async () => {
  let createdPayload = null;

  await withPatchedModels([
    [Category, {
      findOne: async () => ({ id: 2 })
    }],
    [ScenicSpot, {
      create: async (payload) => {
        createdPayload = payload;
        return { id: 8 };
      },
      findByPk: async () => createScenicRecord({
        id: 8,
        latitude: createdPayload.latitude,
        longitude: createdPayload.longitude,
        coordinate_source: createdPayload.coordinate_source,
        coordinate_precision: createdPayload.coordinate_precision,
        coordinate_updated_at: createdPayload.coordinate_updated_at
      })
    }]
  ], async () => {
    const result = await createScenic({
      name: 'New Scenic',
      region: 'Zhanggong',
      categoryId: 2,
      latitude: '25.8292000',
      longitude: ' 114.9336 '
    });

    assert.equal(createdPayload.latitude, 25.8292);
    assert.equal(createdPayload.longitude, 114.9336);
    assert.equal(createdPayload.coordinate_source, 'manual');
    assert.equal(createdPayload.coordinate_precision, 'unknown');
    assert.ok(createdPayload.coordinate_updated_at instanceof Date);
    assert.equal(result.latitude, 25.8292);
    assert.equal(result.longitude, 114.9336);
    assert.equal(result.coordinateSource, 'manual');
    assert.equal(result.coordinatePrecision, 'unknown');
  });
});

test('admin update old payload without coordinates keeps coordinate fields untouched', async () => {
  let updatePayload = null;
  const record = {
    ...createScenicRecord(),
    update: async (payload) => {
      updatePayload = payload;
    }
  };

  await withPatchedModels([
    [ScenicSpot, {
      findByPk: createUpdateFindByPk(record)
    }]
  ], async () => {
    await updateScenic(1, {
      name: 'Updated Scenic',
      region: 'Zhanggong'
    });

    assert.ok(!('latitude' in updatePayload));
    assert.ok(!('longitude' in updatePayload));
    assert.ok(!('coordinate_updated_at' in updatePayload));
  });
});

test('admin update changes coordinateUpdatedAt only when latitude/longitude pair changes', async () => {
  let updatePayload = null;
  const record = {
    ...createScenicRecord({
      latitude: '25.8292000',
      longitude: '114.9336000'
    }),
    update: async (payload) => {
      updatePayload = payload;
    }
  };

  await withPatchedModels([
    [ScenicSpot, {
      findByPk: createUpdateFindByPk(record)
    }]
  ], async () => {
    await updateScenic(1, {
      name: 'Updated Scenic',
      region: 'Zhanggong',
      latitude: '25.8292',
      longitude: '114.9336'
    });

    assert.equal(updatePayload.latitude, 25.8292);
    assert.equal(updatePayload.longitude, 114.9336);
    assert.ok(!('coordinate_updated_at' in updatePayload));

    await updateScenic(1, {
      name: 'Updated Scenic',
      region: 'Zhanggong',
      latitude: '25.8300',
      longitude: '114.9336'
    });

    assert.equal(updatePayload.latitude, 25.83);
    assert.ok(updatePayload.coordinate_updated_at instanceof Date);
  });
});

test('admin update can clear coordinates and coordinate metadata together', async () => {
  let updatePayload = null;
  const record = {
    ...createScenicRecord(),
    update: async (payload) => {
      updatePayload = payload;
    }
  };

  await withPatchedModels([
    [ScenicSpot, {
      findByPk: createUpdateFindByPk(record, { latitude: null, longitude: null })
    }]
  ], async () => {
    await updateScenic(1, {
      name: 'Updated Scenic',
      region: 'Zhanggong',
      latitude: '',
      longitude: ' '
    });

    assert.equal(updatePayload.latitude, null);
    assert.equal(updatePayload.longitude, null);
    assert.equal(updatePayload.coordinate_source, null);
    assert.equal(updatePayload.coordinate_precision, null);
    assert.ok(updatePayload.coordinate_updated_at instanceof Date);
  });
});

test('admin update rejects dirty coordinate values before saving null', async () => {
  let updateCalled = false;
  const record = {
    ...createScenicRecord(),
    update: async () => {
      updateCalled = true;
    }
  };

  await withPatchedModels([
    [ScenicSpot, {
      findByPk: async () => record
    }]
  ], async () => {
    await assert.rejects(
      () => updateScenic(1, {
        name: 'Updated Scenic',
        region: 'Zhanggong',
        latitude: '12abc',
        longitude: '114.9336'
      }),
      (error) => error.statusCode === 400
    );

    assert.equal(updateCalled, false);
  });
});

test('admin update enforces coordinate source and precision enums without changing coordinateUpdatedAt', async () => {
  let updatePayload = null;
  const record = {
    ...createScenicRecord(),
    update: async (payload) => {
      updatePayload = payload;
    }
  };

  await withPatchedModels([
    [ScenicSpot, {
      findByPk: createUpdateFindByPk(record)
    }]
  ], async () => {
    await updateScenic(1, {
      name: 'Updated Scenic',
      region: 'Zhanggong',
      coordinateSource: 'manual',
      coordinatePrecision: 'district',
      coordinateUpdatedAt: '2000-01-01T00:00:00.000Z'
    });

    assert.equal(updatePayload.coordinate_source, 'manual');
    assert.equal(updatePayload.coordinate_precision, 'district');
    assert.ok(!('coordinate_updated_at' in updatePayload));

    await assert.rejects(
      () => updateScenic(1, {
        name: 'Updated Scenic',
        region: 'Zhanggong',
        coordinateSource: 'gps'
      }),
      (error) => error.statusCode === 400
    );

    await assert.rejects(
      () => updateScenic(1, {
        name: 'Updated Scenic',
        region: 'Zhanggong',
        coordinatePrecision: ['exact']
      }),
      (error) => error.statusCode === 400
    );
  });
});
