import { ChapterConfig, HomeRecommend, sequelize } from '../models/index.js';
import {
  formatChapterConfigRecord,
  getSystemConfigMap,
  upsertSystemConfigs
} from '../utils/content-config.js';

const HOME_MODULES = ['scenic', 'food', 'heritage', 'red_culture'];
const CHAPTER_CODES = ['food', 'heritage', 'red_culture'];

function normalizeNullable(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return value;
}

function formatRecommendRecord(item) {
  return {
    id: item.id,
    moduleName: item.module_name,
    targetType: item.target_type,
    targetId: item.target_id,
    visualRole: item.visual_role,
    summaryOverride: item.summary_override,
    sort: item.sort,
    status: item.status
  };
}

function buildRecommendPayload(item, index) {
  return {
    module_name: item.moduleName,
    target_type: item.targetType,
    target_id: Number(item.targetId),
    visual_role: normalizeNullable(item.visualRole) || 'support',
    summary_override: normalizeNullable(item.summaryOverride),
    sort: item.sort === undefined ? index : Number(item.sort || 0),
    status: item.status === undefined ? 1 : Number(item.status)
  };
}

function buildChapterPayload(item, index) {
  return {
    chapter_code: item.chapterCode,
    chapter_title: item.chapterTitle,
    chapter_subtitle: normalizeNullable(item.chapterSubtitle),
    chapter_intro: normalizeNullable(item.chapterIntro),
    hero_image: normalizeNullable(item.heroImage),
    hero_caption: normalizeNullable(item.heroCaption),
    route_label: normalizeNullable(item.routeLabel),
    mood_tone: normalizeNullable(item.moodTone) || 'amber',
    sort: item.sort === undefined ? index : Number(item.sort || 0),
    status: item.status === undefined ? 1 : Number(item.status)
  };
}

function sanitizeChapterConfigs(chapterConfigs = []) {
  return chapterConfigs
    .filter((item) => CHAPTER_CODES.includes(item.chapterCode))
    .map(buildChapterPayload);
}

function sanitizeRecommendEntries(recommendEntries = []) {
  return recommendEntries
    .filter((item) => HOME_MODULES.includes(item.moduleName))
    .filter((item) => ['scenic', 'article'].includes(item.targetType))
    .filter((item) => Number(item.targetId) > 0)
    .map(buildRecommendPayload);
}

export async function getAdminHomeConfigDetail() {
  const [systemConfigMap, chapterRows, recommendRows] = await Promise.all([
    getSystemConfigMap(['site_name', 'site_description', 'home_hero_image', 'home_hero_note']),
    ChapterConfig.findAll({
      order: [['sort', 'ASC'], ['id', 'ASC']]
    }),
    HomeRecommend.findAll({
      where: {
        module_name: HOME_MODULES
      },
      order: [['sort', 'ASC'], ['id', 'ASC']]
    })
  ]);

  return {
    siteName: systemConfigMap.site_name || '',
    siteDescription: systemConfigMap.site_description || '',
    homeHeroImage: systemConfigMap.home_hero_image || '',
    homeHeroNote: systemConfigMap.home_hero_note || '',
    chapterConfigs: chapterRows.map(formatChapterConfigRecord),
    recommendEntries: recommendRows.map(formatRecommendRecord)
  };
}

export async function updateAdminHomeConfig(payload) {
  const chapterConfigs = sanitizeChapterConfigs(payload.chapterConfigs || []);
  const recommendEntries = sanitizeRecommendEntries(payload.recommendEntries || []);

  await sequelize.transaction(async (transaction) => {
    await upsertSystemConfigs([
      { configKey: 'site_name', configValue: payload.siteName, remark: 'Frontend site name' },
      { configKey: 'site_description', configValue: payload.siteDescription, remark: 'Frontend site description' },
      { configKey: 'home_hero_image', configValue: payload.homeHeroImage, remark: 'Frontend home hero image' },
      { configKey: 'home_hero_note', configValue: payload.homeHeroNote, remark: 'Frontend home hero note' }
    ], { transaction });

    for (const item of chapterConfigs) {
      await ChapterConfig.upsert(item, { transaction });
    }

    await HomeRecommend.destroy({
      where: {
        module_name: HOME_MODULES
      },
      transaction
    });

    if (recommendEntries.length) {
      await HomeRecommend.bulkCreate(recommendEntries, { transaction });
    }
  });

  return getAdminHomeConfigDetail();
}
