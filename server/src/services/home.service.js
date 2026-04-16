import { Op } from 'sequelize';
import { Banner, HomeRecommend, ScenicSpot, Article, Category } from '../models/index.js';
import { buildHomeViewPayload, enhanceArticleView, enhanceScenicView, getThemeMeta } from '../utils/front-view-models.js';
import { getActiveChapterConfigMap, getSystemConfigMap } from '../utils/content-config.js';

function isBrokenNarrativeText(value) {
  const text = String(value || '').trim();

  if (!text) {
    return true;
  }

  if (/\?{2,}|�/.test(text)) {
    return true;
  }

  if (/[鏅偣鍩庤剦绾㈠湡瀹埂]/.test(text)) {
    return true;
  }

  if (/ganzhou travel platform/i.test(text)) {
    return true;
  }

  if (/smart service platform/i.test(text)) {
    return true;
  }

  return false;
}

function pickNarrativeText(value, fallback) {
  return isBrokenNarrativeText(value) ? fallback : String(value).trim();
}

function parseStringList(value) {
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

function formatScenicItem(item) {
  return enhanceScenicView({
    id: item.id,
    name: item.name,
    region: item.region,
    coverImage: item.cover_image,
    galleryImages: parseStringList(item.gallery_images),
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
    familyFriendly: item.family_friendly === 1,
    openTime: item.open_time,
    ticketInfo: item.ticket_info,
    suggestedDuration: item.suggested_duration,
    address: item.address,
    trafficGuide: item.traffic_guide,
    tips: item.tips,
    tags: parseStringList(item.tags),
    hotScore: item.hot_score,
    recommendFlag: item.recommend_flag,
    status: item.status,
    categoryName: item.category?.name || ''
  });
}

function formatArticleItem(item, chapterConfigMap = {}) {
  return enhanceArticleView({
    id: item.id,
    title: item.title,
    coverImage: item.cover_image,
    summary: item.summary,
    quote: item.quote,
    content: item.content,
    source: item.source,
    author: item.author,
    tags: parseStringList(item.tags),
    recommendFlag: item.recommend_flag,
    categoryId: item.category_id,
    categoryName: item.category?.name || '',
    categoryCode: item.category?.code || '',
    chapterMeta: chapterConfigMap[item.category?.code || ''] || null
  });
}

async function getModuleList(moduleName, chapterConfigMap = {}) {
  const recommends = await HomeRecommend.findAll({
    where: {
      module_name: moduleName,
      status: 1
    },
    order: [['sort', 'ASC'], ['id', 'DESC']]
  });

  const scenicIds = recommends.filter((item) => item.target_type === 'scenic').map((item) => item.target_id);
  const articleIds = recommends.filter((item) => item.target_type === 'article').map((item) => item.target_id);

  const scenicRows = scenicIds.length
    ? await ScenicSpot.findAll({
        where: { id: { [Op.in]: scenicIds }, status: 1 },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'code'],
            required: false
          }
        ]
      })
    : [];

  const articleRows = articleIds.length
    ? await Article.findAll({
        where: { id: { [Op.in]: articleIds }, status: 1 },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'code'],
            required: false
          }
        ]
      })
    : [];

  const scenicMap = new Map(scenicRows.map((item) => [Number(item.id), formatScenicItem(item)]));
  const articleMap = new Map(articleRows.map((item) => [Number(item.id), formatArticleItem(item, chapterConfigMap)]));

  return recommends
    .map((item) => {
      let record = null;

      if (item.target_type === 'scenic') {
        record = scenicMap.get(Number(item.target_id));
      }

      if (item.target_type === 'article') {
        record = articleMap.get(Number(item.target_id));
      }

      if (!record) {
        return null;
      }

      return {
        ...record,
        visualRole: item.visual_role || 'support',
        summaryOverride: item.summary_override || '',
        dek: item.summary_override || record.dek
      };
    })
    .filter(Boolean);
}

export async function getHomeData() {
  const [banners, systemConfigMap, chapterConfigMap] = await Promise.all([
    Banner.findAll({ where: { status: 1 }, order: [['sort', 'ASC'], ['id', 'DESC']] }),
    getSystemConfigMap(['site_name', 'site_description', 'home_hero_image', 'home_hero_note']),
    getActiveChapterConfigMap()
  ]);

  const [scenicList, foodList, heritageList, redCultureList] = await Promise.all([
    getModuleList('scenic', chapterConfigMap),
    getModuleList('food', chapterConfigMap),
    getModuleList('heritage', chapterConfigMap),
    getModuleList('red_culture', chapterConfigMap)
  ]);

  const siteName = pickNarrativeText(systemConfigMap.site_name, '赣州长卷');
  const siteDescription = pickNarrativeText(
    systemConfigMap.site_description,
    '把景点、专题与 AI 导览重新编排成一场可进入、可停留、可继续追问的数字文化体验。'
  );
  const homeView = buildHomeViewPayload({
    siteName,
    siteDescription,
    heroImage: systemConfigMap.home_hero_image,
    heroNote: pickNarrativeText(systemConfigMap.home_hero_note, '先形成城市气质，再进入章节、地点与 AI 导览。'),
    chapterConfigMap,
    scenicItems: scenicList,
    foodItems: foodList,
    heritageItems: heritageList,
    redCultureItems: redCultureList
  });

  return {
    siteName,
    siteDescription,
    banners: banners.map((item) => ({
      id: item.id,
      title: item.title,
      imageUrl: item.image_url,
      linkType: item.link_type,
      linkTarget: item.link_target,
      sort: item.sort
    })),
    recommends: {
      scenic: scenicList,
      food: foodList,
      heritage: heritageList,
      redCulture: redCultureList
    },
    hero: homeView.hero,
    chapterEntries: homeView.chapterEntries,
    featuredScenic: homeView.featuredScenic,
    curatedArticles: homeView.curatedArticles,
    aiEntry: homeView.aiEntry,
    epilogue: homeView.epilogue,
    visualSystem: {
      thesis: '夜色长卷、城市灯影、低饱和纸面与克制高光。',
      accentColor: '#a83a2e',
      chapters: [
        getThemeMeta('food', chapterConfigMap.food),
        getThemeMeta('heritage', chapterConfigMap.heritage),
        getThemeMeta('red_culture', chapterConfigMap.red_culture)
      ].map((item) => ({
        code: item.code,
        title: item.title,
        routeLabel: item.routeLabel,
        moodTone: item.moodTone
      }))
    }
  };
}
