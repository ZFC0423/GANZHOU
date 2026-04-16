const categoryPathMap = {
  food: '/food',
  heritage: '/heritage',
  red_culture: '/red-culture'
};

const themeMetaMap = {
  food: {
    code: 'food',
    chapterNo: 'Chapter I',
    chapterEn: 'City Pulse',
    title: '城脉与老城生活',
    subtitle: '从味觉、街巷和夜色进入赣州。',
    description: '先闻见这座城，再理解这座城的节奏与日常。',
    heroImage: '/immersive/topic-headers/P0-03_FoodTopic_official_04.png',
    heroCaption: '从夜色、街巷和锅气进入赣州，先感到城市，再理解城市。',
    routeLabel: '夜色、街巷与锅气',
    moodTone: 'amber'
  },
  heritage: {
    code: 'heritage',
    chapterNo: 'Chapter II',
    chapterEn: 'Hands & Homeland',
    title: '客乡与手艺',
    subtitle: '从器物、聚落和代际传承进入赣州。',
    description: '地方文化不是展品清单，而是仍在日常里工作的生活方式。',
    heroImage: '/immersive/topic-headers/P0-04_HakkaCulture_culture_03.jpg',
    heroCaption: '器物、动作与人群关系一起构成地方文化，而不是孤立展品。',
    routeLabel: '手艺、聚落与生活方式',
    moodTone: 'earth'
  },
  red_culture: {
    code: 'red_culture',
    chapterNo: 'Chapter III',
    chapterEn: 'Red Earth',
    title: '红土与记忆',
    subtitle: '从旧址、纪念空间与历史路径进入赣州。',
    description: '让地点先开口，再理解记忆的重量。',
    heroImage: '/immersive/topic-headers/P0-05_RedCulture_official_04.png',
    heroCaption: '纪念空间、旧址与公共记忆共同构成叙事，而不是口号。',
    routeLabel: '旧址、纪念与历史重量',
    moodTone: 'crimson'
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
    routeLabel: '石窟与城脉',
    moodTone: 'earth',
    bestVisitSeason: '春秋更适合步行进入',
    quote: '通天岩更像一块被时间反复雕刻的山体，而不只是一个打卡点。',
    visitMode: '步行漫游',
    pairingSuggestion: '适合与郁孤台、古城墙组成历史线索。',
    bestLightTime: '上午到傍晚',
    walkingIntensity: '中等',
    familyFriendly: true,
    photoPoint: '石窟立面与山体转折处'
  },
  2: {
    heroImage: '/immersive/scenic-details/P0-07_Yugutai_official_02.jpg',
    supportImages: ['/immersive/hero/P0-01_Yugutai_official_01.jpg'],
    heroCaption: '老城的高度、文人的记忆和街区的走向，在这里被收束成同一眼风景。',
    routeLabel: '高台与老城视线',
    moodTone: 'amber',
    bestVisitSeason: '四季皆宜，晴天更适合远景',
    quote: '郁孤台的价值不在高，而在它让整座老城的关系一下子清楚起来。',
    visitMode: '老城步行',
    pairingSuggestion: '适合与古浮桥、福寿沟串成老城日行线。',
    bestLightTime: '傍晚到夜色初起',
    walkingIntensity: '轻至中等',
    familyFriendly: true,
    photoPoint: '高台远望老城一线'
  },
  3: {
    heroImage: '/immersive/scenic-details/P0-08_AncientFloatingBridge_culture_02.jpg',
    supportImages: ['/immersive/scenic-details/P0-08_AncientFloatingBridge_culture_01.jpg'],
    heroCaption: '桥不是孤立景观，它是人与江水、城墙和日常动线之间的连接装置。',
    routeLabel: '桥与江流',
    moodTone: 'amber',
    bestVisitSeason: '四季皆宜',
    quote: '一座浮桥，往往比一段说明文字更能让人理解一座城市怎么生活。',
    visitMode: '慢走停留',
    pairingSuggestion: '适合纳入老城 city walk。',
    bestLightTime: '清晨或傍晚',
    walkingIntensity: '轻度',
    familyFriendly: true,
    photoPoint: '桥身与江面关系最清楚的位置'
  },
  4: {
    heroImage: '/immersive/scenic-details/P0-11_Sanbaishan_media_02.jpg',
    supportImages: ['/immersive/scenic-details/P0-11_Sanbaishan_media_01.jpg'],
    heroCaption: '当山、水与栈道一起出现时，赣州的另一种气质就会慢慢展开。',
    routeLabel: '山地与水脉',
    moodTone: 'pine',
    bestVisitSeason: '春夏更适合自然体验',
    quote: '三百山是自然线的开口，它让城市叙事之外多了一种更辽阔的呼吸。',
    visitMode: '半日到一日游',
    pairingSuggestion: '适合自驾或单独安排自然线。',
    bestLightTime: '上午到下午',
    walkingIntensity: '中高',
    familyFriendly: true,
    photoPoint: '山体远景与栈道交界处'
  },
  5: {
    heroImage: '/immersive/scenic-details/P0-09_HakkaCultureCity_official_01.jpg',
    supportImages: ['/immersive/scenic-details/P0-09_HakkaCultureCity_official_02.jpg'],
    heroCaption: '它不是孤立景区，而是把客家文化整理给初次进入者的综合入口。',
    routeLabel: '客乡入口',
    moodTone: 'earth',
    bestVisitSeason: '四季皆宜',
    quote: '这里更像进入客家文化的前厅，而不是一个单独的打卡景点。',
    visitMode: '文化导览',
    pairingSuggestion: '适合与围屋、擂茶和非遗内容一起阅读。',
    bestLightTime: '白天',
    walkingIntensity: '轻至中等',
    familyFriendly: true,
    photoPoint: '入口建筑群与文化标识区'
  },
  6: {
    heroImage: '/immersive/scenic-details/P0-12_Yashan_official_01.jpg',
    supportImages: ['/immersive/scenic-details/P0-12_Yashan_official_02.jpg'],
    heroCaption: '远山、建筑与雾气一起，把休闲线索从资料页变成一段真实的空间想象。',
    routeLabel: '山中停留',
    moodTone: 'pine',
    bestVisitSeason: '春秋最佳',
    quote: '丫山适合慢下来，它的叙事不靠厚重历史，而靠停留本身。',
    visitMode: '休闲停留',
    pairingSuggestion: '适合独立成线，不强行并入老城叙事。',
    bestLightTime: '清晨到上午',
    walkingIntensity: '中等',
    familyFriendly: true,
    photoPoint: '远山与建筑叠景处'
  },
  7: {
    heroImage: '/immersive/scenic-details/P0-10_Fushougou_media_01.jpg',
    supportImages: ['/immersive/scenic-details/P0-10_Fushougou_media_02.jpg'],
    heroCaption: '真正惊人的不是古，而是这套城市工程直到今天还在继续工作。',
    routeLabel: '地下城脉',
    moodTone: 'ink',
    bestVisitSeason: '四季皆宜',
    quote: '福寿沟最值得看的地方，是它让“古城系统”第一次变得具体。',
    visitMode: '老城知识型步行',
    pairingSuggestion: '适合与郁孤台、古浮桥、古城墙一起看。',
    bestLightTime: '白天',
    walkingIntensity: '轻度',
    familyFriendly: true,
    photoPoint: '解释系统结构的展示点位'
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

function toPath(basePath, id) {
  return `${basePath}/${id}`;
}

function resolveArticlePath(item) {
  return toPath(categoryPathMap[item.categoryCode] || '/food', item.id);
}

export function getThemeMeta(code, override = null) {
  const baseMeta = themeMetaMap[code] || themeMetaMap.food;

  if (!override) {
    return baseMeta;
  }

  return {
    ...baseMeta,
    title: pickNarrativeText(override.chapterTitle, baseMeta.title),
    subtitle: pickNarrativeText(override.chapterSubtitle, baseMeta.subtitle),
    description: pickNarrativeText(override.chapterIntro, baseMeta.description),
    heroImage: override.heroImage || baseMeta.heroImage,
    heroCaption: pickNarrativeText(override.heroCaption, baseMeta.heroCaption),
    routeLabel: pickNarrativeText(override.routeLabel, baseMeta.routeLabel),
    moodTone: override.moodTone || baseMeta.moodTone
  };
}

export function getScenicMeta(id) {
  return scenicMetaMap[Number(id)] || {};
}

export function getArticleMeta(id) {
  return articleMetaMap[Number(id)] || {};
}

export function enhanceScenicView(item) {
  const meta = getScenicMeta(item.id);
  const galleryImages = [
    meta.heroImage || item.coverImage || '',
    ...(meta.supportImages || []),
    ...(item.galleryImages || [])
  ].filter(Boolean);

  return {
    ...item,
    subtitle: pickNarrativeText(item.categoryName, '地方线索'),
    dek: item.intro || '',
    heroCaption: pickNarrativeText(item.heroCaption, pickNarrativeText(meta.heroCaption, item.intro || '')),
    curatorNote: pickNarrativeText(item.cultureDesc, item.intro || ''),
    routeLabel: pickNarrativeText(item.routeLabel, pickNarrativeText(meta.routeLabel, item.region || '赣州地方图谱')),
    moodTone: item.moodTone || meta.moodTone || 'amber',
    bestVisitSeason: pickNarrativeText(item.bestVisitSeason, pickNarrativeText(meta.bestVisitSeason, '四季皆宜')),
    quote: pickNarrativeText(item.quote, pickNarrativeText(meta.quote, '')),
    coverImageMobile: meta.heroImage || item.coverImage || '',
    focalPointX: 50,
    focalPointY: 48,
    visitMode: pickNarrativeText(item.visitMode, pickNarrativeText(meta.visitMode, '自由漫游')),
    pairingSuggestion: pickNarrativeText(item.pairingSuggestion, pickNarrativeText(meta.pairingSuggestion, '')),
    bestLightTime: pickNarrativeText(item.bestLightTime, pickNarrativeText(meta.bestLightTime, '白天')),
    walkingIntensity: pickNarrativeText(item.walkingIntensity, pickNarrativeText(meta.walkingIntensity, '中等')),
    familyFriendly: item.familyFriendly ?? meta.familyFriendly ?? true,
    photoPoint: pickNarrativeText(item.photoPoint, pickNarrativeText(meta.photoPoint, '')),
    media: {
      coverImage: meta.heroImage || item.coverImage || '',
      coverImageMobile: meta.heroImage || item.coverImage || '',
      galleryImages,
      altText: item.name,
      caption: pickNarrativeText(item.heroCaption, pickNarrativeText(meta.heroCaption, item.intro || '')),
      aspectHint: item.aspectHint || '3:2',
      mobileCropHint: 'safe-center',
      dominantTone: item.moodTone || meta.moodTone || 'amber',
      isHeroSafe: true
    },
    path: toPath('/scenic', item.id)
  };
}

export function enhanceArticleView(item) {
  const meta = getArticleMeta(item.id);
  const themeMeta = getThemeMeta(item.categoryCode, item.chapterMeta);

  return {
    ...item,
    subtitle: pickNarrativeText(themeMeta.title, '章节内容'),
    dek: item.summary || '',
    heroCaption: pickNarrativeText(item.heroCaption, themeMeta.heroCaption),
    curatorNote: pickNarrativeText(item.curatorNote, themeMeta.description),
    routeLabel: pickNarrativeText(item.routeLabel, themeMeta.routeLabel),
    moodTone: item.moodTone || themeMeta.moodTone,
    bestVisitSeason: '四季皆宜',
    quote: pickNarrativeText(item.quote, pickNarrativeText(meta.quote, themeMeta.heroCaption)),
    coverImageMobile: meta.image || item.coverImage || '',
    focalPointX: 50,
    focalPointY: 48,
    media: {
      coverImage: meta.image || item.coverImage || '',
      coverImageMobile: meta.image || item.coverImage || '',
      galleryImages: [meta.image || item.coverImage || ''].filter(Boolean),
      altText: item.title,
      caption: pickNarrativeText(item.quote, pickNarrativeText(meta.quote, item.summary || '')),
      aspectHint: '4:5',
      mobileCropHint: 'safe-center',
      dominantTone: item.moodTone || themeMeta.moodTone,
      isHeroSafe: true
    },
    path: resolveArticlePath(item)
  };
}

export function buildHomeViewPayload({
  siteName,
  siteDescription,
  heroImage,
  heroNote,
  chapterConfigMap,
  scenicItems,
  foodItems,
  heritageItems,
  redCultureItems
}) {
  const chapters = [
    { ...getThemeMeta('food', chapterConfigMap?.food), path: '/food', items: foodItems },
    { ...getThemeMeta('heritage', chapterConfigMap?.heritage), path: '/heritage', items: heritageItems },
    { ...getThemeMeta('red_culture', chapterConfigMap?.red_culture), path: '/red-culture', items: redCultureItems }
  ];

  return {
    hero: {
      title: siteName || '赣州长卷',
      subtitle: siteDescription || '把景点、专题与 AI 导览重新编排成一场可进入、可停留、可继续追问的数字文化体验。',
      image: heroImage || '/immersive/hero/P0-01_AncientWall_official_03.jpg',
      primaryAction: { label: '进入景点图谱', path: '/scenic' },
      secondaryAction: { label: '向 AI 导览员提问', path: '/ai-chat' },
      note: heroNote || '先形成城市气质，再进入章节、地点与 AI 导览。'
    },
    chapterEntries: chapters.map((item) => ({
      code: item.code,
      chapterNo: item.chapterNo,
      chapterEn: item.chapterEn,
      chapterLabel: item.title,
      chapterShort: item.title,
      heroImage: item.heroImage,
      heroCaption: item.heroCaption,
      routeLabel: item.routeLabel,
      moodTone: item.moodTone,
      path: item.path,
      leadItem: item.items[0] || null,
      count: item.items.length
    })),
    featuredScenic: scenicItems.slice(0, 6),
    curatedArticles: [...foodItems.slice(0, 2), ...heritageItems.slice(0, 1), ...redCultureItems.slice(0, 1)],
    aiEntry: {
      title: 'AI 不在站外，它就在这部长卷里面继续带路。',
      description: '问答像导览员，路线像工作室，把你已经看见的内容继续整理成清晰路径。',
      chatPath: '/ai-chat',
      tripPath: '/ai-trip'
    },
    epilogue: {
      title: '一座城最好的打开方式，不是更快浏览，而是更慢进入。',
      description: '把景点、专题与 AI 导览重新编排成一场可进入、可停留、可继续追问的数字文化体验。',
      image: '/immersive/hero/P0-01_JiangnanSongcheng_official_02.jpg'
    }
  };
}

export function buildCitationCard(context) {
  const isScenic = context.type === 'scenic';
  const scenicMeta = isScenic ? getScenicMeta(context.id) : null;
  const articleMeta = !isScenic ? getArticleMeta(context.id) : null;
  const path = isScenic
    ? toPath('/scenic', context.id)
    : resolveArticlePath({
        id: context.id,
        categoryCode: context.categoryCode || 'food'
      });

  return {
    type: context.type,
    id: context.id,
    title: context.title,
    summary: context.summary || '',
    image: scenicMeta?.heroImage || articleMeta?.image || '',
    caption: pickNarrativeText(scenicMeta?.heroCaption, pickNarrativeText(articleMeta?.quote, context.summary || '')),
    path
  };
}

export function buildChatViewPayload({ question, result, matchedContext }) {
  const citations = matchedContext.map(buildCitationCard);
  const heroSpotlight = citations[0] || null;

  return {
    leadTitle: `关于“${question}”的导览回答`,
    answerBlocks: [
      {
        type: 'lead',
        title: '导览回答',
        content: result.directAnswer
      },
      {
        type: 'context',
        title: '文化线索',
        content: result.culturalContext
      }
    ].filter((item) => item.content),
    citations,
    relatedCards: citations.slice(0, 3),
    followupPrompts: result.nextSteps || [],
    heroSpotlight
  };
}

export function buildTripViewPayload({ input, result, matchedContext }) {
  const paceLabelMap = {
    relaxed: '轻松漫游',
    normal: '适中铺陈',
    compact: '紧凑推进'
  };
  const transportLabelMap = {
    public_transport: '公共交通',
    self_drive: '自驾'
  };
  const interestLabel = input.interests?.[0] ? (themeMetaMap[input.interests[0]]?.title || '') : '';
  const citations = matchedContext.map(buildCitationCard);

  return {
    routeTitle: result.pathPositioning || '赣州导览路线',
    routeMood: `${input.days} 天 / ${paceLabelMap[input.pace] || input.pace} / ${transportLabelMap[input.transport] || input.transport}`,
    introNote: result.summary,
    days: (result.days || []).map((day, index) => ({
      ...day,
      chapterTitle: `Day ${day.dayIndex}`,
      coverSpot: day.items?.[0]?.name || `第 ${day.dayIndex} 天`,
      coverImage: citations[index]?.image || '',
      items: (day.items || []).map((item) => ({
        ...item,
        visualHint: item.type === 'scenic' ? '以地点为主的段落' : '以专题为主的补充段落'
      }))
    })),
    packingTips: result.travelTips || [],
    routeWarnings: Array.isArray(result.adjustmentSuggestions)
      ? result.adjustmentSuggestions
      : result.adjustmentSuggestions
        ? [result.adjustmentSuggestions]
        : [],
    citations,
    interestLabel
  };
}
