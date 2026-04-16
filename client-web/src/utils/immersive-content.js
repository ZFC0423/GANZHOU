const themeMetaMap = {
  food: {
    code: 'food',
    chapterNo: 'Chapter I',
    chapterEn: 'City Pulse',
    chapterLabel: '城脉与老城生活',
    chapterShort: '老城风味',
    moodTone: 'amber',
    heroImage: '/immersive/topic-headers/P0-03_FoodTopic_official_04.png',
    heroCaption: '从夜色、街巷和锅气进入赣州，先感到城市，再理解城市。',
    opening: '这里不把风味当作小吃目录，而是把它视作进入老城温度、街区节奏与日常生活的入口。',
    thesis: '先从最能入口的味觉经验出发，再走向街区、景点和城市记忆，赣州会变得更有层次。',
    curatorNote: '阅读方式：先看主线条目，再看支线内容，不急着找最多信息，而是先形成城市的气味、光影与步调。',
    routeLabel: '夜色、街巷与锅气',
    quote: '真正留下记忆的，往往不是景点名单，而是街巷里那口熟悉的热气。',
    atlasTitle: '老城风味索引',
    atlasNote: '把条目看作进入城市肌理的入口，而不是静态资料。'
  },
  heritage: {
    code: 'heritage',
    chapterNo: 'Chapter II',
    chapterEn: 'Hands & Homeland',
    chapterLabel: '客乡与手艺',
    chapterShort: '手艺与客乡',
    moodTone: 'earth',
    heroImage: '/immersive/topic-headers/P0-04_HakkaCulture_culture_03.jpg',
    heroCaption: '器物、动作与人群关系一起构成地方文化，而不是孤立的展品。',
    opening: '非遗不是看一个项目，而是理解一套地方生活如何被代代传递。',
    thesis: '从手作、聚落与生活方式进入赣州，你看到的是更深的人文结构，而不只是表面符号。',
    curatorNote: '阅读方式：先认一门手艺，再认它背后的生活关系，最后回到场所与景点。',
    routeLabel: '手艺、聚落与生活方式',
    quote: '越贴近日常的手艺，越能看见一座城市真正的精神纹理。',
    atlasTitle: '手艺与客乡索引',
    atlasNote: '把每个条目当作一件展品，慢慢看它们之间的血缘和气息。'
  },
  red_culture: {
    code: 'red_culture',
    chapterNo: 'Chapter III',
    chapterEn: 'Red Earth',
    chapterLabel: '红土与记忆',
    chapterShort: '红土与旧址',
    moodTone: 'crimson',
    heroImage: '/immersive/topic-headers/P0-05_RedCulture_official_04.png',
    heroCaption: '纪念空间、旧址与公共记忆共同构成叙事，而不是口号本身。',
    opening: '这一章不追求热烈，而追求清晰。先看地点，再看历史如何在地点里留下重量。',
    thesis: '只有把真实场所、行进路径和历史叙事放在一起，红色文化才会从抽象概念重新变得可进入。',
    curatorNote: '阅读方式：先建立地理与时间感，再进入历史人物、纪念方式与后续延展。',
    routeLabel: '旧址、纪念与历史重量',
    quote: '记忆从不是漂浮的，它总要落在某个真实地点上，才能被重新看见。',
    atlasTitle: '红土记忆索引',
    atlasNote: '从地点开始，而不是从口号开始。'
  }
};

const scenicMetaMap = {
  1: {
    heroImage: '/immersive/scenic-details/P0-06_Tongtianyan_official_03.png',
    supportImages: [
      '/immersive/scenic-details/P0-06_Tongtianyan_official_01.jpg',
      '/immersive/scenic-details/P0-06_Tongtianyan_official_02.jpg'
    ],
    heroCaption: '石窟、山体与历史遗存叠在一起，让地点本身先说话。',
    routeLabel: '石窟与城郊山体',
    group: 'cultural',
    moodTone: 'earth',
    quote: '通天岩更像一块被时间反复雕刻的山体，而不只是一个打卡点。'
  },
  2: {
    heroImage: '/immersive/scenic-details/P0-07_Yugutai_official_02.jpg',
    supportImages: ['/immersive/hero/P0-01_Yugutai_official_01.jpg'],
    heroCaption: '老城的高度、文人的记忆和街区的走向，在这里被收束成同一眼风景。',
    routeLabel: '高台与老城视线',
    group: 'city',
    moodTone: 'amber',
    quote: '郁孤台的价值不在高，而在它让整座老城的关系一下子清晰起来。'
  },
  3: {
    heroImage: '/immersive/scenic-details/P0-08_AncientFloatingBridge_culture_02.jpg',
    supportImages: ['/immersive/scenic-details/P0-08_AncientFloatingBridge_culture_01.jpg'],
    heroCaption: '桥不是孤立景观，它是人与江水、城墙和日常动线之间的连接装置。',
    routeLabel: '桥与江流',
    group: 'city',
    moodTone: 'amber',
    quote: '一座浮桥，往往比一段说明文字更能让人理解一座城市怎么生活。'
  },
  4: {
    heroImage: '/immersive/scenic-details/P0-11_Sanbaishan_media_02.jpg',
    supportImages: ['/immersive/scenic-details/P0-11_Sanbaishan_media_01.jpg'],
    heroCaption: '当山、水与栈道一起出现时，赣州的另一种气质就会慢慢展开。',
    routeLabel: '山地与水线',
    group: 'mountain',
    moodTone: 'pine',
    quote: '三百山是自然线的开口，它让城市叙事之外多了一种更辽阔的呼吸。'
  },
  5: {
    heroImage: '/immersive/scenic-details/P0-09_HakkaCultureCity_official_01.jpg',
    supportImages: ['/immersive/scenic-details/P0-09_HakkaCultureCity_official_02.jpg'],
    heroCaption: '它不是孤立景区，而是把客家文化整理给初次进入者的综合入口。',
    routeLabel: '客乡入口',
    group: 'cultural',
    moodTone: 'earth',
    quote: '这里更像进入客家文化的前厅，而不是一个单独的打卡景点。'
  },
  6: {
    heroImage: '/immersive/scenic-details/P0-12_Yashan_official_01.jpg',
    supportImages: ['/immersive/scenic-details/P0-12_Yashan_official_02.jpg'],
    heroCaption: '远山、建筑与雾气一起，把休闲线索从资料页变成一段真实的空间想象。',
    routeLabel: '山中停留',
    group: 'mountain',
    moodTone: 'pine',
    quote: '丫山适合慢下来，它的叙事不靠厚重历史，而靠停留本身。'
  },
  7: {
    heroImage: '/immersive/scenic-details/P0-10_Fushougou_media_01.jpg',
    supportImages: ['/immersive/scenic-details/P0-10_Fushougou_media_02.jpg'],
    heroCaption: '真正惊人的不是古，而是这套城市工程直到今天还在继续工作。',
    routeLabel: '地下城脉',
    group: 'city',
    moodTone: 'ink',
    quote: '福寿沟最值得看的地方，是它让“古城系统”第一次变得具体。'
  }
};

const articleMetaMap = {
  1: {
    image: '/immersive/content-cards/P0-13_GanzhouFriedFish_sina_01.jpg',
    quote: '风味不是配角，它常常是进入一座城市最直接的入口。'
  },
  2: {
    image: '/immersive/topic-headers/P0-03_FoodTopic_cyw_02.jpg',
    quote: '越日常的食物，越能说明在地生活如何被保存。'
  },
  3: {
    image: '/immersive/content-cards/P0-13_GannanTeaPickingOpera_culture_02.jpg',
    quote: '地方戏曲不是舞台装饰，而是一种仍在流动的地方表达。'
  },
  4: {
    image: '/immersive/content-cards/P0-13_HakkaLeicha_culture_01.jpg',
    quote: '擂茶真正承载的是生活方式，而不只是一碗饮品。'
  },
  5: {
    image: '/immersive/content-cards/P0-13_RuijinRedSites_official_01.jpg',
    quote: '历史一旦落在地点上，就会比概念更有重量。'
  },
  6: {
    image: '/immersive/topic-headers/P0-05_RedCulture_official_01.jpg',
    quote: '理解长征精神，最好先从出发地理解它。'
  },
  7: {
    image: '/immersive/content-cards/P0-13_JiangnanSongcheng_official_01.jpg',
    quote: '老城不是一张照片，而是一整套仍能被走进去的空间结构。'
  },
  8: {
    image: '/immersive/content-cards/P0-13_HakkaWeiwu_official_01.jpg',
    quote: '围屋是空间，也是族群如何安顿自己的方式。'
  }
};

const brokenTextPattern = /锟|�|閺|鍩|鏂|€|smart service platform|ganzhou travel platform/i;

function normalizeThemeCode(code) {
  return String(code || 'food').replace(/-/g, '_');
}

export const siteManifesto = {
  title: '赣州长卷',
  subtitle: '把景点、专题与 AI 导览重新编排成一部可进入、可停留、可继续追问的数字文化体验。',
  footerImage: '/immersive/hero/P0-01_JiangnanSongcheng_official_02.jpg'
};

export function isBrokenNarrativeText(value) {
  const text = String(value || '').trim();
  return !text || brokenTextPattern.test(text) || /\?{2,}/.test(text);
}

export function pickNarrativeText(value, fallback = '') {
  return isBrokenNarrativeText(value) ? fallback : String(value).trim();
}

export function getThemeMeta(code) {
  return themeMetaMap[normalizeThemeCode(code)] || themeMetaMap.food;
}

export function getScenicMeta(id) {
  return scenicMetaMap[Number(id)] || {};
}

export function getArticleMeta(id) {
  return articleMetaMap[Number(id)] || {};
}

export function getNarrativeImage(item, type = 'scenic') {
  if (!item) {
    return '';
  }

  if (item.media?.coverImage) {
    return item.media.coverImage;
  }

  if (type === 'scenic') {
    return getScenicMeta(item.id).heroImage || item.coverImage || '';
  }

  return getArticleMeta(item.id).image || item.coverImage || '';
}

export function getNarrativeQuote(item, type = 'scenic') {
  if (!item) {
    return '';
  }

  if (!isBrokenNarrativeText(item.quote)) {
    return item.quote;
  }

  if (type === 'scenic') {
    return getScenicMeta(item.id).quote || '';
  }

  return getArticleMeta(item.id).quote || '';
}

export function getScenicGallery(detail) {
  const scenicMeta = getScenicMeta(detail?.id);
  return [
    detail?.media?.coverImage,
    scenicMeta.heroImage,
    ...(detail?.media?.galleryImages || []),
    ...(scenicMeta.supportImages || []),
    ...(detail?.galleryImages || [])
  ].filter(Boolean);
}

export function getScenicGroup(item) {
  if (item?.group) {
    return item.group;
  }

  const scenicMeta = getScenicMeta(item?.id);
  if (scenicMeta.group) {
    return scenicMeta.group;
  }

  const text = [
    item?.region,
    item?.name,
    ...(Array.isArray(item?.tags) ? item.tags : []),
    item?.routeLabel
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/(mountain|forest|nature|eco|山|水|瀑布|温泉)/.test(text)) {
    return 'mountain';
  }

  if (/(heritage|hakka|culture|非遗|客家|围屋|石窟|手艺)/.test(text)) {
    return 'cultural';
  }

  return 'city';
}

export function getContextCard(context) {
  if (!context) {
    return null;
  }

  const isScenic = context.type === 'scenic';
  const scenicMeta = isScenic ? getScenicMeta(context.id) : null;
  const articleMeta = !isScenic ? getArticleMeta(context.id) : null;
  const categoryCode = normalizeThemeCode(context.categoryCode);
  const articleBasePath = {
    food: '/food',
    heritage: '/heritage',
    red_culture: '/red-culture'
  }[categoryCode] || '/food';

  return {
    id: context.id,
    type: context.type,
    title: context.title,
    summary: context.summary || '',
    image: context.image || scenicMeta?.heroImage || articleMeta?.image || '',
    caption:
      context.caption
      || scenicMeta?.heroCaption
      || articleMeta?.quote
      || context.summary
      || '',
    path: context.path || (isScenic ? `/scenic/${context.id}` : `${articleBasePath}/${context.id}`)
  };
}

export function getThemeEntries(homeData = {}) {
  const provided = Array.isArray(homeData.chapterEntries) ? homeData.chapterEntries.filter(Boolean) : [];
  if (provided.length) {
    return provided.map((item, index) => {
      const fallback = getThemeMeta(index === 0 ? 'food' : index === 1 ? 'heritage' : 'red_culture');
      return {
        ...fallback,
        ...item,
        chapterLabel: pickNarrativeText(item.chapterLabel, fallback.chapterLabel),
        heroCaption: pickNarrativeText(item.heroCaption, fallback.heroCaption),
        routeLabel: pickNarrativeText(item.routeLabel, fallback.routeLabel),
        moodTone: item.moodTone || fallback.moodTone
      };
    });
  }

  return [
    {
      ...getThemeMeta('food'),
      path: '/food',
      count: homeData?.recommends?.food?.length || 0,
      leadItem: homeData?.recommends?.food?.[0] || null
    },
    {
      ...getThemeMeta('heritage'),
      path: '/heritage',
      count: homeData?.recommends?.heritage?.length || 0,
      leadItem: homeData?.recommends?.heritage?.[0] || null
    },
    {
      ...getThemeMeta('red_culture'),
      path: '/red-culture',
      count: homeData?.recommends?.redCulture?.length || 0,
      leadItem: homeData?.recommends?.redCulture?.[0] || null
    }
  ];
}
