// @ts-check

/** @typedef {import('./types.js').CandidateRecord} CandidateRecord */
/** @typedef {import('./types.js').ConstraintsSnapshot} ConstraintsSnapshot */
/** @typedef {import('./types.js').RetrievalResult} RetrievalResult */

import { Op } from 'sequelize';

import { Article, Category, ScenicSpot } from '../../../models/index.js';
import {
  COORDINATE_PRECISIONS,
  COORDINATE_SOURCES,
  normalizeCoordinateValue
} from '../../../utils/coordinates.js';
import { REGION_ALIASES, ROUTE_WARNING_CODES, createRouteWarning } from './contracts.js';

const THEME_TERMS = {
  natural: ['natural', 'nature', 'forest', 'mountain', 'eco-tour', 'vacation', '山', '森林', '自然', '康养'],
  red_culture: ['red_culture', 'red-culture', 'red', 'history', 'ruijin', '红色', '革命', '瑞金'],
  hakka_culture: ['hakka', 'culture', 'family', '客家', '围屋', '擂茶'],
  heritage: ['heritage', 'history', 'old-city', 'grotto', 'bridge', 'engineering', '非遗', '历史', '宋城', '古城'],
  food: ['food', 'snack', 'dish', 'old-city', 'citywalk', 'local', '美食', '小吃', '老城'],
  family: ['family', 'vacation', 'culture', '亲子', '家庭'],
  photography: ['photo', 'photography', 'landmark', 'bridge', 'mountain', '拍照', '摄影']
};

const THEME_CATEGORY_CODES = {
  natural: ['scenic_nature'],
  red_culture: ['red_culture'],
  hakka_culture: ['scenic_history', 'heritage'],
  heritage: ['scenic_history', 'heritage'],
  food: ['food'],
  family: ['scenic_nature', 'scenic_history'],
  photography: ['scenic_nature', 'scenic_history']
};

const SCENIC_COORDINATE_ATTRIBUTES = [
  'latitude',
  'longitude',
  'coordinate_source',
  'coordinate_precision'
];

const COORDINATE_SOURCE_SET = new Set(COORDINATE_SOURCES);
const COORDINATE_PRECISION_SET = new Set(COORDINATE_PRECISIONS);
const COORDINATE_COLUMN_ERROR_PATTERN = /Unknown column ['"`][^'"`]*(latitude|longitude|coordinate_source|coordinate_precision)['"`]/i;

const FALLBACK_SCENIC_RECORDS = [
  {
    id: 1,
    name: '通天岩',
    region: 'Zhanggong',
    tags: 'grotto,history,weekend',
    intro: '赣州重要的人文景点之一，也是进入石窟遗存与历史景观线索的一处代表性入口。',
    culture_desc: '通天岩适合承接历史遗存、城市文脉与人文景观这条理解路径。',
    family_friendly: 1,
    route_label: '石窟与城脉',
    walking_intensity: '中等',
    recommend_flag: 1,
    hot_score: 98,
    category: { code: 'scenic_history', name: 'History Scenic' }
  },
  {
    id: 2,
    name: '郁孤台',
    region: 'Zhanggong',
    tags: 'old-city,history,citywalk',
    intro: '郁孤台是赣州老城历史文化阅读中最具代表性的地点之一。',
    culture_desc: '它把城市历史、文学记忆与空间体验叠加在一起。',
    family_friendly: 1,
    route_label: '高台与老城视线',
    walking_intensity: '轻至中等',
    recommend_flag: 1,
    hot_score: 95,
    category: { code: 'scenic_history', name: 'History Scenic' }
  },
  {
    id: 3,
    name: '古浮桥',
    region: 'Zhanggong',
    tags: 'bridge,landmark,photo',
    intro: '古浮桥把城市水系、古城生活与现实步行体验联系在一起。',
    culture_desc: '它让人看到城市如何把历史、水系与生活方式组织在一起。',
    family_friendly: 1,
    route_label: '桥与江流',
    walking_intensity: '轻度',
    recommend_flag: 1,
    hot_score: 90,
    category: { code: 'scenic_history', name: 'History Scenic' }
  },
  {
    id: 4,
    name: '三百山',
    region: 'Anyuan',
    tags: 'nature,forest,eco-tour',
    intro: '三百山适合作为赣州生态山水线的重要入口。',
    culture_desc: '它的阅读重点在东江源头、山岳生态与自然体验。',
    family_friendly: 1,
    route_label: '山地与水脉',
    walking_intensity: '中高',
    recommend_flag: 1,
    hot_score: 93,
    category: { code: 'scenic_nature', name: 'Nature Scenic' }
  },
  {
    id: 5,
    name: '客家文化城',
    region: 'Ganxian',
    tags: 'hakka,culture,family',
    intro: '客家文化城是进入客家文化的一座综合入口。',
    culture_desc: '它适合作为第一次接触赣州客家文化时的阅读起点。',
    family_friendly: 1,
    route_label: '客乡入口',
    walking_intensity: '轻至中等',
    recommend_flag: 0,
    hot_score: 85,
    category: { code: 'scenic_history', name: 'History Scenic' }
  },
  {
    id: 6,
    name: '丫山景区',
    region: 'Dayu',
    tags: 'vacation,nature,wellness',
    intro: '丫山适合作为生态休闲、森林康养和乡村度假方向的代表性入口。',
    culture_desc: '它的阅读重点在山地生态、康养体验与休闲空间。',
    family_friendly: 1,
    route_label: '山中停留',
    walking_intensity: '中等',
    recommend_flag: 0,
    hot_score: 82,
    category: { code: 'scenic_nature', name: 'Nature Scenic' }
  },
  {
    id: 7,
    name: '福寿沟',
    region: 'Zhanggong',
    tags: 'engineering,old-city,drainage',
    intro: '福寿沟是赣州古城最具代表性的城市工程遗存之一。',
    culture_desc: '它让古城系统变得具体，是一处仍在发挥作用的活文物。',
    family_friendly: 1,
    route_label: '地下城脉',
    walking_intensity: '轻度',
    recommend_flag: 1,
    hot_score: 80,
    category: { code: 'scenic_history', name: 'History Scenic' }
  }
];

const FALLBACK_ARTICLE_RECORDS = [
  {
    id: 1,
    title: '赣南小炒鱼：从一盘地方风味进入赣州的日常口味',
    tags: 'food,hakka,local-dish',
    summary: '地方风味可以把用户带入赣州的日常口味经验与城市生活感。',
    recommend_flag: 1,
    view_count: 128,
    category: { code: 'food', name: 'Ganzhou Food' }
  },
  {
    id: 3,
    title: '赣南采茶戏：从舞台进入赣州的地方表达',
    tags: 'heritage,opera,folk-art',
    summary: '赣南采茶戏适合作为从非遗进入地方文化结构的一条主线。',
    recommend_flag: 1,
    view_count: 150,
    category: { code: 'heritage', name: 'Intangible Heritage' }
  },
  {
    id: 5,
    title: '瑞金红色遗址：从真实地点进入红色记忆',
    tags: 'red-culture,history,study-tour',
    summary: '红色文化要真正被理解，最好的入口往往是仍留存在当地的真实遗址。',
    recommend_flag: 1,
    view_count: 166,
    category: { code: 'red_culture', name: 'Red Culture' }
  }
];

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeRegionKey(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return null;
  }

  return REGION_ALIASES[raw] || REGION_ALIASES[raw.toLowerCase()] || raw.toLowerCase();
}

function normalizeCoordinateEnum(value, allowedSet) {
  if (typeof value !== 'string') {
    return 'unknown';
  }

  const normalized = value.trim();
  return allowedSet.has(normalized) ? normalized : 'unknown';
}

function normalizeScenicCoordinates(record) {
  const lat = normalizeCoordinateValue(record?.latitude, 'latitude');
  const lng = normalizeCoordinateValue(record?.longitude, 'longitude');

  if (lat === null || lng === null) {
    return null;
  }

  return {
    lat,
    lng,
    source: normalizeCoordinateEnum(record?.coordinate_source, COORDINATE_SOURCE_SET),
    precision: normalizeCoordinateEnum(record?.coordinate_precision, COORDINATE_PRECISION_SET)
  };
}

function isCoordinateColumnUnavailableError(error) {
  const message = String(error?.message || error?.parent?.message || error?.original?.message || '');
  return COORDINATE_COLUMN_ERROR_PATTERN.test(message);
}

function withScenicCoordinateAttributes(query) {
  return {
    ...query,
    attributes: {
      ...(query.attributes && typeof query.attributes === 'object' && !Array.isArray(query.attributes)
        ? query.attributes
        : {}),
      include: [
        ...((query.attributes && typeof query.attributes === 'object' && Array.isArray(query.attributes.include))
          ? query.attributes.include
          : []),
        ...SCENIC_COORDINATE_ATTRIBUTES
      ]
    }
  };
}

async function findScenicRecordsWithCoordinateFallback(scenicModel, query) {
  try {
    return await scenicModel.findAll(withScenicCoordinateAttributes(query));
  } catch (error) {
    if (!isCoordinateColumnUnavailableError(error)) {
      throw error;
    }

    return scenicModel.findAll(query);
  }
}

function parseStringList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => normalizeText(item)).filter(Boolean) : [];
  } catch (error) {
    return normalizeText(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function uniqStrings(items) {
  return Array.from(new Set(items.map((item) => normalizeText(item)).filter(Boolean)));
}

function getThemeTerms(themePreferences) {
  return uniqStrings(themePreferences.flatMap((theme) => THEME_TERMS[theme] || [theme]));
}

function getThemeCategoryCodes(themePreferences) {
  return uniqStrings(themePreferences.flatMap((theme) => THEME_CATEGORY_CODES[theme] || []));
}

function splitSearchText(value) {
  return uniqStrings(
    normalizeText(value)
      .split(/[\s,，。；;、|()[\]'"“”‘’：:!?！？]+/)
      .filter((item) => item.length >= 2)
  );
}

function buildSearchTerms(snapshot) {
  const terms = new Set([
    ...getThemeTerms(snapshot.theme_preferences),
    ...splitSearchText(snapshot.destination_scope),
    ...splitSearchText(snapshot.route_origin)
  ]);

  if (snapshot.travel_mode === 'public_transport') {
    ['Zhanggong', 'old-city', 'citywalk'].forEach((term) => terms.add(term));
  }

  if (snapshot.travel_mode === 'self_drive') {
    ['Anyuan', 'Dayu', 'Ganxian', 'nature'].forEach((term) => terms.add(term));
  }

  return Array.from(terms).slice(0, 18);
}

function includesAny(text, terms) {
  const haystack = normalizeText(text).toLowerCase();
  return terms.some((term) => haystack.includes(normalizeText(term).toLowerCase()));
}

function getRecordText(record) {
  return [
    record.name,
    record.title,
    record.region,
    record.tags,
    record.intro,
    record.summary,
    record.culture_desc,
    record.route_label,
    record.category?.name,
    record.category?.code
  ].map((item) => normalizeText(item)).join(' ');
}

function scoreRecord(record, snapshot, sourceType, mode) {
  const themeTerms = getThemeTerms(snapshot.theme_preferences);
  const themeCodes = getThemeCategoryCodes(snapshot.theme_preferences);
  const text = getRecordText(record);
  const categoryCode = normalizeText(record.category?.code);
  const regionKey = normalizeRegionKey(record.region);
  const matchedBy = [];
  let score = 0;

  if (themeTerms.length && includesAny(text, themeTerms)) {
    matchedBy.push('theme_preferences');
    score += 28;
  }

  if (themeCodes.includes(categoryCode)) {
    matchedBy.push('category_code');
    score += 22;
  }

  if (snapshot.focused_region_key && regionKey === normalizeRegionKey(snapshot.focused_region_key)) {
    matchedBy.push('focused_region_key');
    score += 24;
  }

  if (snapshot.destination_scope && includesAny(text, [snapshot.destination_scope])) {
    matchedBy.push('destination_scope');
    score += 16;
  }

  if (snapshot.route_origin && includesAny(text, [snapshot.route_origin])) {
    matchedBy.push('route_origin');
    score += 8;
  }

  if (snapshot.travel_mode === 'public_transport' && regionKey === 'zhanggong') {
    matchedBy.push('travel_mode');
    score += 12;
  }

  if (snapshot.travel_mode === 'self_drive' && ['anyuan', 'dayu', 'ganxian'].includes(regionKey || '')) {
    matchedBy.push('travel_mode');
    score += 10;
  }

  score += Number(record.recommend_flag || 0) * 8;
  score += Math.min(Number(record.hot_score || record.view_count || 0), 100) / 10;

  if (!matchedBy.length && mode === 'primary' && snapshot.theme_preferences.length) {
    return {
      score: 0,
      matchedBy: [],
      directHit: false
    };
  }

  if (!matchedBy.length && mode === 'expanded') {
    matchedBy.push('expanded_pool');
    score += sourceType === 'scenic' ? 4 : 2;
  }

  return {
    score,
    matchedBy: uniqStrings(matchedBy),
    directHit: matchedBy.includes('theme_preferences') || matchedBy.includes('focused_region_key') || matchedBy.includes('category_code')
  };
}

/**
 * @param {any} record
 * @param {ConstraintsSnapshot} snapshot
 * @param {'primary' | 'expanded'} mode
 * @returns {CandidateRecord}
 */
function toScenicCandidate(record, snapshot, mode) {
  const score = scoreRecord(record, snapshot, 'scenic', mode);
  const regionKey = normalizeRegionKey(record.region);
  const coordinates = normalizeScenicCoordinates(record);

  return {
    item_key: `scenic:${Number(record.id)}`,
    source_type: /** @type {'scenic'} */ ('scenic'),
    source_id: Number(record.id),
    title: normalizeText(record.name),
    region_key: regionKey,
    family_friendly: record.family_friendly === true || Number(record.family_friendly) === 1,
    tags: parseStringList(record.tags),
    category_code: normalizeText(record.category?.code),
    route_label: normalizeText(record.route_label),
    walking_intensity: normalizeText(record.walking_intensity),
    recommend_flag: Number(record.recommend_flag || 0),
    hot_score: Number(record.hot_score || 0),
    matched_by: score.matchedBy,
    score: score.score,
    direct_hit: score.directHit,
    is_locked: false,
    is_route_item: true,
    coordinates,
    record
  };
}

function toLockedScenicCandidate(record, snapshot, orderIndex) {
  const candidate = toScenicCandidate(record, snapshot, 'expanded');

  return {
    ...candidate,
    matched_by: ['locked_targets'],
    score: 100000 - orderIndex,
    direct_hit: true,
    is_locked: true,
    is_route_item: true
  };
}

/**
 * @param {any} record
 * @param {ConstraintsSnapshot} snapshot
 * @param {'primary' | 'expanded'} mode
 * @returns {CandidateRecord}
 */
function toArticleCandidate(record, snapshot, mode) {
  const score = scoreRecord(record, snapshot, 'article', mode);

  return {
    item_key: `article:${Number(record.id)}`,
    source_type: /** @type {'article'} */ ('article'),
    source_id: Number(record.id),
    title: normalizeText(record.title),
    region_key: null,
    family_friendly: false,
    tags: parseStringList(record.tags),
    category_code: normalizeText(record.category?.code),
    route_label: '',
    walking_intensity: '',
    recommend_flag: Number(record.recommend_flag || 0),
    hot_score: Number(record.view_count || 0),
    matched_by: score.matchedBy,
    score: score.score,
    direct_hit: score.directHit,
    is_locked: false,
    is_route_item: false,
    record
  };
}

function applyHardFilters(candidate, snapshot) {
  if (!candidate.is_route_item) {
    return true;
  }

  if (snapshot.family_friendly_only && !candidate.family_friendly) {
    return false;
  }

  if (snapshot.same_region_only && snapshot.focused_region_key) {
    return candidate.region_key === normalizeRegionKey(snapshot.focused_region_key);
  }

  return true;
}

function compareCandidates(left, right) {
  if (left.is_locked !== right.is_locked) return left.is_locked ? -1 : 1;
  if (right.score !== left.score) return right.score - left.score;
  if (right.recommend_flag !== left.recommend_flag) return right.recommend_flag - left.recommend_flag;
  if (right.hot_score !== left.hot_score) return right.hot_score - left.hot_score;
  if (left.source_type !== right.source_type) return left.source_type === 'scenic' ? -1 : 1;
  return left.item_key.localeCompare(right.item_key, 'zh-CN');
}

function buildLikeConditions(terms, fields) {
  return terms.flatMap((term) => fields.map((field) => ({ [field]: { [Op.like]: `%${term}%` } })));
}

async function queryScenicRecords(snapshot, mode, scenicModel) {
  const terms = buildSearchTerms(snapshot);
  const where = { status: 1 };

  if (mode === 'primary' && terms.length) {
    where[Op.or] = buildLikeConditions(terms, ['name', 'region', 'intro', 'culture_desc', 'tags', 'route_label']);
  }

  return findScenicRecordsWithCoordinateFallback(scenicModel, {
    where,
    include: [
      {
        model: Category,
        as: 'category',
        required: false,
        attributes: ['id', 'name', 'code']
      }
    ],
    order: [['recommend_flag', 'DESC'], ['hot_score', 'DESC'], ['id', 'ASC']],
    limit: mode === 'primary' ? 40 : 80
  });
}

async function queryArticleRecords(snapshot, mode, articleModel) {
  const terms = buildSearchTerms(snapshot);
  const where = { status: 1 };

  if (mode === 'primary' && terms.length) {
    where[Op.or] = buildLikeConditions(terms, ['title', 'summary', 'content', 'tags']);
  }

  return articleModel.findAll({
    where,
    include: [
      {
        model: Category,
        as: 'category',
        required: false,
        attributes: ['id', 'name', 'code']
      }
    ],
    order: [['recommend_flag', 'DESC'], ['view_count', 'DESC'], ['id', 'ASC']],
    limit: mode === 'primary' ? 20 : 40
  });
}

/**
 * @param {{
 *   scenicRecords?: any[],
 *   articleRecords?: any[],
 *   constraintsSnapshot: ConstraintsSnapshot,
 *   mode?: 'primary' | 'expanded'
 * }} input
 * @returns {RetrievalResult}
 */
export function collectRouteCandidates({ scenicRecords = [], articleRecords = [], constraintsSnapshot, mode = 'primary' }) {
  const scenicCandidates = scenicRecords
    .map((record) => toScenicCandidate(record, constraintsSnapshot, mode))
    .filter((candidate) => candidate.score > 0)
    .filter((candidate) => applyHardFilters(candidate, constraintsSnapshot));
  const articleCandidates = articleRecords
    .map((record) => toArticleCandidate(record, constraintsSnapshot, mode))
    .filter((candidate) => candidate.score > 0);

  const seen = new Set();
  const candidates = [...scenicCandidates, ...articleCandidates]
    .sort(compareCandidates)
    .filter((candidate) => {
      if (seen.has(candidate.item_key)) {
        return false;
      }

      seen.add(candidate.item_key);
      return true;
    });

  return {
    mode,
    candidates,
    scenic_candidates: candidates.filter((candidate) => candidate.source_type === 'scenic'),
    article_candidates: candidates.filter((candidate) => candidate.source_type === 'article'),
    warnings: [],
    diagnostics: []
  };
}

function parseLockedTargetId(optionKey) {
  return Number(String(optionKey).slice('scenic:'.length));
}

function isRecordDisplayable(record) {
  return Number(record?.status ?? 1) === 1;
}

function mergeLockedAndOrdinaryCandidates(lockedCandidates, ordinaryResult) {
  const byKey = new Map();

  lockedCandidates.forEach((candidate) => {
    byKey.set(candidate.item_key, candidate);
  });

  ordinaryResult.candidates.forEach((candidate) => {
    if (!byKey.has(candidate.item_key)) {
      byKey.set(candidate.item_key, candidate);
    }
  });

  const candidates = [...byKey.values()].sort(compareCandidates);

  return {
    ...ordinaryResult,
    candidates,
    scenic_candidates: candidates.filter((candidate) => candidate.source_type === 'scenic'),
    article_candidates: candidates.filter((candidate) => candidate.source_type === 'article')
  };
}

async function resolveLockedTargets(snapshot, scenicModel) {
  const lockedTargets = Array.isArray(snapshot.locked_targets) ? snapshot.locked_targets : [];

  if (!lockedTargets.length) {
    return {
      candidates: [],
      warnings: []
    };
  }

  const ids = lockedTargets.map(parseLockedTargetId);
  const records = await findScenicRecordsWithCoordinateFallback(scenicModel, {
    where: {
      id: {
        [Op.in]: ids
      }
    },
    include: [
      {
        model: Category,
        as: 'category',
        required: false,
        attributes: ['id', 'name', 'code']
      }
    ],
    order: [['id', 'ASC']]
  });
  const recordById = new Map(records.map((record) => [Number(record.id), record]));
  const missingKeys = lockedTargets.filter((optionKey) => !recordById.has(parseLockedTargetId(optionKey)));

  if (missingKeys.length) {
    return {
      candidates: [],
      warnings: [
        createRouteWarning({
          code: ROUTE_WARNING_CODES.LOCKED_TARGET_NOT_FOUND,
          conflictingKeys: missingKeys
        })
      ]
    };
  }

  const unavailableKeys = lockedTargets.filter((optionKey) => !isRecordDisplayable(recordById.get(parseLockedTargetId(optionKey))));

  if (unavailableKeys.length) {
    return {
      candidates: [],
      warnings: [
        createRouteWarning({
          code: ROUTE_WARNING_CODES.LOCKED_TARGET_UNAVAILABLE,
          conflictingKeys: unavailableKeys
        })
      ]
    };
  }

  return {
    candidates: lockedTargets.map((optionKey, index) => toLockedScenicCandidate(recordById.get(parseLockedTargetId(optionKey)), snapshot, index)),
    warnings: []
  };
}

/**
 * @param {{
 *   constraintsSnapshot?: ConstraintsSnapshot,
 *   mode?: 'primary' | 'expanded',
 *   scenicModel?: any,
 *   articleModel?: any
 * }} input
 * @returns {Promise<RetrievalResult>}
 */
export async function retrieveRouteCandidates(input = {}) {
  const {
    constraintsSnapshot,
    mode = 'primary',
    scenicModel = ScenicSpot,
    articleModel = Article
  } = input;

  if (!constraintsSnapshot) {
    throw new Error('constraintsSnapshot is required');
  }
  const snapshot = constraintsSnapshot;
  const lockedResolution = await resolveLockedTargets(snapshot, scenicModel);

  if (lockedResolution.warnings.length) {
    return {
      mode,
      candidates: lockedResolution.candidates,
      scenic_candidates: lockedResolution.candidates,
      article_candidates: [],
      warnings: lockedResolution.warnings,
      diagnostics: []
    };
  }

  try {
    const [scenicRecords, articleRecords] = await Promise.all([
      queryScenicRecords(snapshot, mode, scenicModel),
      queryArticleRecords(snapshot, mode, articleModel)
    ]);

    const ordinaryResult = collectRouteCandidates({
      scenicRecords,
      articleRecords,
      constraintsSnapshot: snapshot,
      mode
    });

    return mergeLockedAndOrdinaryCandidates(lockedResolution.candidates, ordinaryResult);
  } catch (error) {
    const fallback = collectRouteCandidates({
      scenicRecords: FALLBACK_SCENIC_RECORDS,
      articleRecords: FALLBACK_ARTICLE_RECORDS,
      constraintsSnapshot: snapshot,
      mode: 'expanded'
    });

    return {
      ...mergeLockedAndOrdinaryCandidates(lockedResolution.candidates, fallback),
      diagnostics: ['database_unavailable_used_local_seed_fallback']
    };
  }
}

export const ROUTE_RETRIEVAL_PRIVATE = {
  FALLBACK_SCENIC_RECORDS,
  FALLBACK_ARTICLE_RECORDS,
  normalizeRegionKey,
  normalizeScenicCoordinates,
  SCENIC_COORDINATE_ATTRIBUTES,
  withScenicCoordinateAttributes,
  resolveLockedTargets,
  compareCandidates,
  scoreRecord
};
