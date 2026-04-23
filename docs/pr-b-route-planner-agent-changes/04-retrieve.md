# server/src/services/ai/route-planner-agent/retrieve.js

```js
// @ts-check

/** @typedef {import('./types.js').CandidateRecord} CandidateRecord */
/** @typedef {import('./types.js').ConstraintsSnapshot} ConstraintsSnapshot */
/** @typedef {import('./types.js').RetrievalResult} RetrievalResult */

import { Op } from 'sequelize';

import { Article, Category, ScenicSpot } from '../../../models/index.js';
import { REGION_ALIASES } from './contracts.js';

const THEME_TERMS = {
  natural: ['natural', 'nature', 'forest', 'mountain', 'eco-tour', 'vacation', '灞?, '妫灄', '鑷劧', '搴峰吇'],
  red_culture: ['red_culture', 'red-culture', 'red', 'history', 'ruijin', '绾㈣壊', '闈╁懡', '鐟為噾'],
  hakka_culture: ['hakka', 'culture', 'family', '瀹㈠', '鍥村眿', '鎿傝尪'],
  heritage: ['heritage', 'history', 'old-city', 'grotto', 'bridge', 'engineering', '闈為仐', '鍘嗗彶', '瀹嬪煄', '鍙ゅ煄'],
  food: ['food', 'snack', 'dish', 'old-city', 'citywalk', 'local', '缇庨', '灏忓悆', '鑰佸煄'],
  family: ['family', 'vacation', 'culture', '浜插瓙', '瀹跺涵'],
  photography: ['photo', 'photography', 'landmark', 'bridge', 'mountain', '鎷嶇収', '鎽勫奖']
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

const FALLBACK_SCENIC_RECORDS = [
  {
    id: 1,
    name: '閫氬ぉ宀?,
    region: 'Zhanggong',
    tags: 'grotto,history,weekend',
    intro: '璧ｅ窞閲嶈鐨勪汉鏂囨櫙鐐逛箣涓€锛屼篃鏄繘鍏ョ煶绐熼仐瀛樹笌鍘嗗彶鏅绾跨储鐨勪竴澶勪唬琛ㄦ€у叆鍙ｃ€?,
    culture_desc: '閫氬ぉ宀╅€傚悎鎵挎帴鍘嗗彶閬楀瓨銆佸煄甯傛枃鑴変笌浜烘枃鏅杩欐潯鐞嗚В璺緞銆?,
    family_friendly: 1,
    route_label: '鐭崇獰涓庡煄鑴?,
    walking_intensity: '涓瓑',
    recommend_flag: 1,
    hot_score: 98,
    category: { code: 'scenic_history', name: 'History Scenic' }
  },
  {
    id: 2,
    name: '閮佸鍙?,
    region: 'Zhanggong',
    tags: 'old-city,history,citywalk',
    intro: '閮佸鍙版槸璧ｅ窞鑰佸煄鍘嗗彶鏂囧寲闃呰涓渶鍏蜂唬琛ㄦ€х殑鍦扮偣涔嬩竴銆?,
    culture_desc: '瀹冩妸鍩庡競鍘嗗彶銆佹枃瀛﹁蹇嗕笌绌洪棿浣撻獙鍙犲姞鍦ㄤ竴璧枫€?,
    family_friendly: 1,
    route_label: '楂樺彴涓庤€佸煄瑙嗙嚎',
    walking_intensity: '杞昏嚦涓瓑',
    recommend_flag: 1,
    hot_score: 95,
    category: { code: 'scenic_history', name: 'History Scenic' }
  },
  {
    id: 3,
    name: '鍙ゆ诞妗?,
    region: 'Zhanggong',
    tags: 'bridge,landmark,photo',
    intro: '鍙ゆ诞妗ユ妸鍩庡競姘寸郴銆佸彜鍩庣敓娲讳笌鐜板疄姝ヨ浣撻獙鑱旂郴鍦ㄤ竴璧枫€?,
    culture_desc: '瀹冭浜虹湅鍒板煄甯傚浣曟妸鍘嗗彶銆佹按绯讳笌鐢熸椿鏂瑰紡缁勭粐鍦ㄤ竴璧枫€?,
    family_friendly: 1,
    route_label: '妗ヤ笌姹熸祦',
    walking_intensity: '杞诲害',
    recommend_flag: 1,
    hot_score: 90,
    category: { code: 'scenic_history', name: 'History Scenic' }
  },
  {
    id: 4,
    name: '涓夌櫨灞?,
    region: 'Anyuan',
    tags: 'nature,forest,eco-tour',
    intro: '涓夌櫨灞遍€傚悎浣滀负璧ｅ窞鐢熸€佸北姘寸嚎鐨勯噸瑕佸叆鍙ｃ€?,
    culture_desc: '瀹冪殑闃呰閲嶇偣鍦ㄤ笢姹熸簮澶淬€佸北宀崇敓鎬佷笌鑷劧浣撻獙銆?,
    family_friendly: 1,
    route_label: '灞卞湴涓庢按鑴?,
    walking_intensity: '涓珮',
    recommend_flag: 1,
    hot_score: 93,
    category: { code: 'scenic_nature', name: 'Nature Scenic' }
  },
  {
    id: 5,
    name: '瀹㈠鏂囧寲鍩?,
    region: 'Ganxian',
    tags: 'hakka,culture,family',
    intro: '瀹㈠鏂囧寲鍩庢槸杩涘叆瀹㈠鏂囧寲鐨勪竴搴х患鍚堝叆鍙ｃ€?,
    culture_desc: '瀹冮€傚悎浣滀负绗竴娆℃帴瑙﹁担宸炲瀹舵枃鍖栨椂鐨勯槄璇昏捣鐐广€?,
    family_friendly: 1,
    route_label: '瀹埂鍏ュ彛',
    walking_intensity: '杞昏嚦涓瓑',
    recommend_flag: 0,
    hot_score: 85,
    category: { code: 'scenic_history', name: 'History Scenic' }
  },
  {
    id: 6,
    name: '涓北鏅尯',
    region: 'Dayu',
    tags: 'vacation,nature,wellness',
    intro: '涓北閫傚悎浣滀负鐢熸€佷紤闂层€佹．鏋楀悍鍏诲拰涔℃潙搴﹀亣鏂瑰悜鐨勪唬琛ㄦ€у叆鍙ｃ€?,
    culture_desc: '瀹冪殑闃呰閲嶇偣鍦ㄥ北鍦扮敓鎬併€佸悍鍏讳綋楠屼笌浼戦棽绌洪棿銆?,
    family_friendly: 1,
    route_label: '灞变腑鍋滅暀',
    walking_intensity: '涓瓑',
    recommend_flag: 0,
    hot_score: 82,
    category: { code: 'scenic_nature', name: 'Nature Scenic' }
  },
  {
    id: 7,
    name: '绂忓娌?,
    region: 'Zhanggong',
    tags: 'engineering,old-city,drainage',
    intro: '绂忓娌熸槸璧ｅ窞鍙ゅ煄鏈€鍏蜂唬琛ㄦ€х殑鍩庡競宸ョ▼閬楀瓨涔嬩竴銆?,
    culture_desc: '瀹冭鍙ゅ煄绯荤粺鍙樺緱鍏蜂綋锛屾槸涓€澶勪粛鍦ㄥ彂鎸ヤ綔鐢ㄧ殑娲绘枃鐗┿€?,
    family_friendly: 1,
    route_label: '鍦颁笅鍩庤剦',
    walking_intensity: '杞诲害',
    recommend_flag: 1,
    hot_score: 80,
    category: { code: 'scenic_history', name: 'History Scenic' }
  }
];

const FALLBACK_ARTICLE_RECORDS = [
  {
    id: 1,
    title: '璧ｅ崡灏忕倰楸硷細浠庝竴鐩樺湴鏂归鍛宠繘鍏ヨ担宸炵殑鏃ュ父鍙ｅ懗',
    tags: 'food,hakka,local-dish',
    summary: '鍦版柟椋庡懗鍙互鎶婄敤鎴峰甫鍏ヨ担宸炵殑鏃ュ父鍙ｅ懗缁忛獙涓庡煄甯傜敓娲绘劅銆?,
    recommend_flag: 1,
    view_count: 128,
    category: { code: 'food', name: 'Ganzhou Food' }
  },
  {
    id: 3,
    title: '璧ｅ崡閲囪尪鎴忥細浠庤垶鍙拌繘鍏ヨ担宸炵殑鍦版柟琛ㄨ揪',
    tags: 'heritage,opera,folk-art',
    summary: '璧ｅ崡閲囪尪鎴忛€傚悎浣滀负浠庨潪閬楄繘鍏ュ湴鏂规枃鍖栫粨鏋勭殑涓€鏉′富绾裤€?,
    recommend_flag: 1,
    view_count: 150,
    category: { code: 'heritage', name: 'Intangible Heritage' }
  },
  {
    id: 5,
    title: '鐟為噾绾㈣壊閬楀潃锛氫粠鐪熷疄鍦扮偣杩涘叆绾㈣壊璁板繂',
    tags: 'red-culture,history,study-tour',
    summary: '绾㈣壊鏂囧寲瑕佺湡姝ｈ鐞嗚В锛屾渶濂界殑鍏ュ彛寰€寰€鏄粛鐣欏瓨鍦ㄥ綋鍦扮殑鐪熷疄閬楀潃銆?,
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
      .split(/[\s,锛屻€傦紱;銆亅()[\]'"鈥溾€濃€樷€欙細:!?锛侊紵]+/)
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
    is_route_item: true,
    record
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

  return scenicModel.findAll({
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
    diagnostics: []
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
  try {
    const [scenicRecords, articleRecords] = await Promise.all([
      queryScenicRecords(snapshot, mode, scenicModel),
      queryArticleRecords(snapshot, mode, articleModel)
    ]);

    return collectRouteCandidates({
      scenicRecords,
      articleRecords,
      constraintsSnapshot: snapshot,
      mode
    });
  } catch (error) {
    const fallback = collectRouteCandidates({
      scenicRecords: FALLBACK_SCENIC_RECORDS,
      articleRecords: FALLBACK_ARTICLE_RECORDS,
      constraintsSnapshot: snapshot,
      mode: 'expanded'
    });

    return {
      ...fallback,
      diagnostics: ['database_unavailable_used_local_seed_fallback']
    };
  }
}

export const ROUTE_RETRIEVAL_PRIVATE = {
  FALLBACK_SCENIC_RECORDS,
  FALLBACK_ARTICLE_RECORDS,
  normalizeRegionKey,
  compareCandidates,
  scoreRecord
};
```

