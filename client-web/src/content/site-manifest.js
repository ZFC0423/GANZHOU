const themeMetaMap = {
  food: {
    code: 'food',
    chapterNo: 'Chapter I',
    chapterEn: 'City Pulse',
    chapterLabel: '城脉与老城生活',
    chapterShort: '老城风味',
    moodTone: 'amber',
    heroImage: '/immersive/topic-headers/P0-03_FoodTopic_official_04.png',
    heroCaption: '从夜色、街巷与火候入手，让城市气味先把人带进赣州。',
    opening: '这一章不把美食当成静态清单，而是把它当成进入城市肌理、老城日常与地方节奏的入口。',
    thesis: '食物真正动人的地方，不只是名字和招牌，而是它背后的摊火、街口、晚风与一座城的生活方式。',
    curatorNote: '优先保留市井密度、街巷方向感和夜色中的温度，让页面更像一次缓慢进入老城的过程，而不是一组整齐排列的餐饮卡片。',
    routeLabel: '夜色、街巷与锅气',
    quote: '真正留下记忆的，往往不是景点名单，而是街巷里那口熟悉的热气。',
    atlasTitle: '老城风味索引',
    atlasNote: '把每个条目看作进入城市肌理的一个入口，而不是静态资料。'
  },
  heritage: {
    code: 'heritage',
    chapterNo: 'Chapter II',
    chapterEn: 'Hands & Homeland',
    chapterLabel: '客乡与手艺',
    chapterShort: '手艺客乡',
    moodTone: 'earth',
    heroImage: '/immersive/topic-headers/P0-04_HakkaCulture_culture_03.jpg',
    heroCaption: '从器物、聚落与传承关系切入，看见地方文化真正落地的纹理。',
    opening: '这一章关心的不是“非遗项目列表”，而是手艺如何留在生活里、留在聚落里，也留在一代代人的手上。',
    thesis: '越贴近日常的手艺，越能显出一座城市真正的精神结构与地方秩序。',
    curatorNote: '优先强调材料、手感、聚落关系和生活语境，让阅读更像走进地方工艺与客乡生活内部，而不是旁观式介绍。',
    routeLabel: '手艺、聚落与生活方式',
    quote: '手艺的价值，不只是被展示，更在于它仍然被使用、被传承、被生活需要。',
    atlasTitle: '手艺与客乡索引',
    atlasNote: '把每个对象当作一件馆藏慢慢看，理解它与地方之间的血缘与气息。'
  },
  red_culture: {
    code: 'red_culture',
    chapterNo: 'Chapter III',
    chapterEn: 'Red Earth',
    chapterLabel: '红土与记忆',
    chapterShort: '红土记忆',
    moodTone: 'crimson',
    heroImage: '/immersive/topic-headers/P0-05_RedCulture_official_04.png',
    heroCaption: '让地点先开口，再进入历史重量与记忆的层层回响。',
    opening: '这一章不从口号开始，而是从地点、遗址、纪念物和现场感开始，让记忆重新落回真实空间。',
    thesis: '历史真正有重量的时候，往往不是在概念里，而是在你与一个真实地点重新相遇的那一刻。',
    curatorNote: '保持克制，不把历史做成喧闹展示，而是让图像、题注与空间关系把记忆的力度慢慢推到眼前。',
    routeLabel: '旧址、纪念与历史重量',
    quote: '记忆从不是漂浮的，它总要落在某个真实地点上，才能被重新看见。',
    atlasTitle: '红土记忆索引',
    atlasNote: '从地点开始，而不是从口号开始。'
  }
};

function normalizeThemeCode(code) {
  return String(code || 'food').replace(/-/g, '_');
}

export const siteManifesto = {
  title: '赣州长卷',
  subtitle: '把景点、专题与 AI 导览重新编排成一部可进入、可停留、可继续追问的数字文化体验。',
  footerImage: '/immersive/hero/P0-01_JiangnanSongcheng_official_02.jpg'
};

export function getThemeMeta(code) {
  return themeMetaMap[normalizeThemeCode(code)] || themeMetaMap.food;
}

export function getAllThemeMeta() {
  return themeMetaMap;
}
