import { Op } from 'sequelize';
import { Category, ScenicSpot } from '../models/index.js';
import {
  normalizeAdminCoordinatePair,
  normalizeCoordinatePrecisionInput,
  normalizeCoordinateSourceInput,
  normalizeCoordinateValue
} from '../utils/coordinates.js';

const ADMIN_SCENIC_ATTRIBUTES = [
  'id',
  'name',
  'region',
  'category_id',
  'cover_image',
  'gallery_images',
  'intro',
  'culture_desc',
  'hero_caption',
  'route_label',
  'mood_tone',
  'quote',
  'best_visit_season',
  'visit_mode',
  'pairing_suggestion',
  'best_light_time',
  'walking_intensity',
  'photo_point',
  'family_friendly',
  'open_time',
  'ticket_info',
  'suggested_duration',
  'address',
  'latitude',
  'longitude',
  'coordinate_source',
  'coordinate_precision',
  'coordinate_updated_at',
  'traffic_guide',
  'tips',
  'tags',
  'recommend_flag',
  'hot_score',
  'status',
  'created_at',
  'updated_at'
];

function parseListField(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function stringifyListField(value) {
  return JSON.stringify(parseListField(value));
}

function normalizeNullable(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return value;
}

function formatCoordinate(value, axis) {
  return normalizeCoordinateValue(value, axis);
}

function formatScenicRecord(item) {
  return {
    id: item.id,
    name: item.name,
    region: item.region,
    categoryId: item.category_id,
    categoryName: item.category?.name || '',
    coverImage: item.cover_image,
    galleryImages: parseListField(item.gallery_images),
    intro: item.intro,
    cultureDesc: item.culture_desc,
    heroCaption: item.hero_caption,
    routeLabel: item.route_label,
    moodTone: item.mood_tone,
    quote: item.quote,
    bestVisitSeason: item.best_visit_season,
    visitMode: item.visit_mode,
    pairingSuggestion: item.pairing_suggestion,
    bestLightTime: item.best_light_time,
    walkingIntensity: item.walking_intensity,
    photoPoint: item.photo_point,
    familyFriendly: item.family_friendly,
    openTime: item.open_time,
    ticketInfo: item.ticket_info,
    suggestedDuration: item.suggested_duration,
    address: item.address,
    latitude: formatCoordinate(item.latitude, 'latitude'),
    longitude: formatCoordinate(item.longitude, 'longitude'),
    coordinateSource: item.coordinate_source ?? null,
    coordinatePrecision: item.coordinate_precision ?? null,
    coordinateUpdatedAt: item.coordinate_updated_at,
    trafficGuide: item.traffic_guide,
    tips: item.tips,
    tags: parseListField(item.tags),
    recommendFlag: item.recommend_flag,
    hotScore: item.hot_score,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
}

function applyCoordinatePayload(target, payload, existingRecord = null) {
  const coordinatePair = normalizeAdminCoordinatePair(payload);
  const coordinateSource = normalizeCoordinateSourceInput(payload);
  const coordinatePrecision = normalizeCoordinatePrecisionInput(payload);

  if (coordinatePair.provided) {
    target.latitude = coordinatePair.latitude;
    target.longitude = coordinatePair.longitude;

    const coordinatePairChanged = existingRecord
      ? !(
        formatCoordinate(existingRecord.latitude, 'latitude') === coordinatePair.latitude &&
        formatCoordinate(existingRecord.longitude, 'longitude') === coordinatePair.longitude
      )
      : !coordinatePair.clear;

    if (coordinatePairChanged) {
      target.coordinate_updated_at = new Date();
    }

    if (coordinatePair.clear) {
      target.coordinate_source = null;
      target.coordinate_precision = null;
      return;
    }

    if (coordinateSource.provided) {
      target.coordinate_source = coordinateSource.value;
    } else if (!existingRecord || coordinatePairChanged) {
      target.coordinate_source = 'manual';
    }

    if (coordinatePrecision.provided) {
      target.coordinate_precision = coordinatePrecision.value;
    } else if (!existingRecord || coordinatePairChanged) {
      target.coordinate_precision = 'unknown';
    }

    return;
  }

  if (coordinateSource.provided) {
    target.coordinate_source = coordinateSource.value;
  }

  if (coordinatePrecision.provided) {
    target.coordinate_precision = coordinatePrecision.value;
  }
}

function buildScenicPayload(payload, existingRecord = null) {
  const scenicPayload = {
    name: payload.name,
    region: payload.region,
    category_id: normalizeNullable(payload.categoryId),
    cover_image: normalizeNullable(payload.coverImage),
    gallery_images: stringifyListField(payload.galleryImages),
    intro: normalizeNullable(payload.intro),
    culture_desc: normalizeNullable(payload.cultureDesc),
    hero_caption: normalizeNullable(payload.heroCaption),
    route_label: normalizeNullable(payload.routeLabel),
    mood_tone: normalizeNullable(payload.moodTone) || 'amber',
    quote: normalizeNullable(payload.quote),
    best_visit_season: normalizeNullable(payload.bestVisitSeason),
    visit_mode: normalizeNullable(payload.visitMode),
    pairing_suggestion: normalizeNullable(payload.pairingSuggestion),
    best_light_time: normalizeNullable(payload.bestLightTime),
    walking_intensity: normalizeNullable(payload.walkingIntensity),
    photo_point: normalizeNullable(payload.photoPoint),
    family_friendly: payload.familyFriendly === undefined ? 1 : Number(Number(payload.familyFriendly) > 0 ? 1 : 0),
    open_time: normalizeNullable(payload.openTime),
    ticket_info: normalizeNullable(payload.ticketInfo),
    suggested_duration: normalizeNullable(payload.suggestedDuration),
    address: normalizeNullable(payload.address),
    traffic_guide: normalizeNullable(payload.trafficGuide),
    tips: normalizeNullable(payload.tips),
    tags: parseListField(payload.tags).join(','),
    recommend_flag: Number(payload.recommendFlag || 0),
    hot_score: Number(payload.hotScore || 0),
    status: payload.status === undefined ? 1 : Number(payload.status)
  };

  applyCoordinatePayload(scenicPayload, payload, existingRecord);

  return scenicPayload;
}

async function ensureCategoryExists(categoryId) {
  if (!categoryId) {
    return;
  }

  const category = await Category.findOne({
    where: {
      id: categoryId,
      type: 'scenic',
      status: 1
    }
  });

  if (!category) {
    const error = new Error('Invalid scenic category');
    error.statusCode = 400;
    throw error;
  }
}

export async function getAdminScenicList(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.max(Number(query.pageSize) || 10, 1);
  const offset = (page - 1) * pageSize;
  const where = {};

  if (query.keyword) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.keyword}%` } },
      { intro: { [Op.like]: `%${query.keyword}%` } },
      { region: { [Op.like]: `%${query.keyword}%` } }
    ];
  }

  if (query.region) {
    where.region = query.region;
  }

  if (query.status !== undefined && query.status !== '') {
    where.status = Number(query.status);
  }

  if (query.categoryId) {
    where.category_id = Number(query.categoryId);
  }

  const result = await ScenicSpot.findAndCountAll({
    attributes: ADMIN_SCENIC_ATTRIBUTES,
    where,
    distinct: true,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'code'],
        required: false
      }
    ],
    order: [['id', 'DESC']],
    offset,
    limit: pageSize
  });

  return {
    list: result.rows.map(formatScenicRecord),
    total: result.count,
    page,
    pageSize
  };
}

export async function getAdminScenicDetail(id) {
  const record = await ScenicSpot.findByPk(id, {
    attributes: ADMIN_SCENIC_ATTRIBUTES,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'code'],
        required: false
      }
    ]
  });

  if (!record) {
    const error = new Error('Scenic spot not found');
    error.statusCode = 404;
    throw error;
  }

  return formatScenicRecord(record);
}

export async function createScenic(payload) {
  await ensureCategoryExists(payload.categoryId);

  const record = await ScenicSpot.create(buildScenicPayload(payload));
  return getAdminScenicDetail(record.id);
}

export async function updateScenic(id, payload) {
  const record = await ScenicSpot.findByPk(id, {
    attributes: ADMIN_SCENIC_ATTRIBUTES
  });

  if (!record) {
    const error = new Error('Scenic spot not found');
    error.statusCode = 404;
    throw error;
  }

  await ensureCategoryExists(payload.categoryId);
  await record.update(buildScenicPayload(payload, record));

  return getAdminScenicDetail(id);
}

export async function deleteScenic(id) {
  const record = await ScenicSpot.findByPk(id);

  if (!record) {
    const error = new Error('Scenic spot not found');
    error.statusCode = 404;
    throw error;
  }

  await record.destroy();

  return {
    id,
    deleted: true
  };
}

export async function updateScenicStatus(id, status) {
  const record = await ScenicSpot.findByPk(id);

  if (!record) {
    const error = new Error('Scenic spot not found');
    error.statusCode = 404;
    throw error;
  }

  await record.update({
    status: Number(status)
  });

  return {
    id: record.id,
    status: record.status
  };
}
