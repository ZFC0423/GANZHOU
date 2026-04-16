import { ChapterConfig, SystemConfig } from '../models/index.js';

function normalizeValue(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return value;
}

export function formatChapterConfigRecord(record) {
  return {
    id: record.id,
    chapterCode: record.chapter_code,
    chapterTitle: record.chapter_title,
    chapterSubtitle: record.chapter_subtitle,
    chapterIntro: record.chapter_intro,
    heroImage: record.hero_image,
    heroCaption: record.hero_caption,
    routeLabel: record.route_label,
    moodTone: record.mood_tone,
    sort: record.sort,
    status: record.status
  };
}

export async function getSystemConfigMap(configKeys = []) {
  const where = configKeys.length
    ? { config_key: configKeys }
    : {};

  const rows = await SystemConfig.findAll({ where });
  return rows.reduce((result, item) => {
    result[item.config_key] = item.config_value;
    return result;
  }, {});
}

export async function getActiveChapterConfigMap() {
  const rows = await ChapterConfig.findAll({
    where: { status: 1 },
    order: [['sort', 'ASC'], ['id', 'ASC']]
  });

  return rows.reduce((result, item) => {
    result[item.chapter_code] = formatChapterConfigRecord(item);
    return result;
  }, {});
}

export async function upsertSystemConfigs(items, options = {}) {
  for (const item of items) {
    await SystemConfig.upsert({
      config_key: item.configKey,
      config_value: normalizeValue(item.configValue),
      remark: item.remark || null
    }, options);
  }
}
