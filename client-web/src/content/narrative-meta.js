const scenicMetaMap = {
  1: {
    heroImage: '/immersive/scenic-details/P0-06_Tongtianyan_official_03.png',
    supportImages: [
      '/immersive/scenic-details/P0-06_Tongtianyan_official_01.jpg',
      '/immersive/scenic-details/P0-06_Tongtianyan_official_02.jpg'
    ],
    heroCaption: '先让石窟的山体气息、造像尺度与被时间磨过的肌理建立场域。',
    routeLabel: '石窟遗存入口',
    group: 'cultural',
    moodTone: 'earth',
    quote: '通天岩更像一块被时间反复雕刻的山体，而不只是一个打卡点。'
  },
  2: {
    heroImage: '/immersive/scenic-details/P0-07_Yugutai_official_02.jpg',
    supportImages: ['/immersive/hero/P0-01_Yugutai_official_01.jpg'],
    heroCaption: '把楼阁、江岸与词句留在同一画面里，让城市记忆先安静落地。',
    routeLabel: '章江高台眺望',
    group: 'city',
    moodTone: 'amber',
    quote: '郁孤台最动人的地方，不只是典故，而是它仍然站在城市风景与历史情绪之间。'
  },
  3: {
    heroImage: '/immersive/scenic-details/P0-08_AncientFloatingBridge_culture_02.jpg',
    supportImages: ['/immersive/scenic-details/P0-08_AncientFloatingBridge_culture_01.jpg'],
    heroCaption: '让浮桥先作为一种过江方式出现，再慢慢显出它与城市日常的关系。',
    routeLabel: '古桥与江面',
    group: 'city',
    moodTone: 'amber',
    quote: '浮桥不是单一景观，它把两岸生活的节奏直接连在了一起。'
  },
  4: {
    heroImage: '/immersive/scenic-details/P0-11_Sanbaishan_media_02.jpg',
    supportImages: ['/immersive/scenic-details/P0-11_Sanbaishan_media_01.jpg'],
    heroCaption: '把云海、山势与水源气口放在前面，让空间尺度先说话。',
    routeLabel: '山体水源线',
    group: 'mountain',
    moodTone: 'pine',
    quote: '三百山的价值，不只在“看山”，更在它让人重新感到水从哪里开始。'
  },
  5: {
    heroImage: '/immersive/scenic-details/P0-09_HakkaCultureCity_official_01.jpg',
    supportImages: ['/immersive/scenic-details/P0-09_HakkaCultureCity_official_02.jpg'],
    heroCaption: '让聚落秩序、客家语境与文化展示并置，形成立体的地方阅读入口。',
    routeLabel: '客乡聚落线',
    group: 'cultural',
    moodTone: 'earth',
    quote: '客家文化城的意义，不只是汇集内容，而是把客乡生活的结构感具体摆到眼前。'
  },
  6: {
    heroImage: '/immersive/scenic-details/P0-12_Yashan_official_01.jpg',
    supportImages: ['/immersive/scenic-details/P0-12_Yashan_official_02.jpg'],
    heroCaption: '先感受崖壁、峰线与植被的层次，再进入更细的观看路径。',
    routeLabel: '山势进深',
    group: 'mountain',
    moodTone: 'pine',
    quote: '丫山的阅读方式不在于一次看尽，而在于顺着山体缓慢深入。'
  },
  7: {
    heroImage: '/immersive/scenic-details/P0-10_Fushougou_media_01.jpg',
    supportImages: ['/immersive/scenic-details/P0-10_Fushougou_media_02.jpg'],
    heroCaption: '先让古城地下水系成立，再去理解它怎样支撑地表之上的城市秩序。',
    routeLabel: '地下水脉',
    group: 'city',
    moodTone: 'ink',
    quote: '福寿沟真正惊人的地方，是它把一座城的内部逻辑藏在了看不见的地方。'
  }
};

const articleMetaMap = {
  1: {
    image: '/immersive/content-cards/P0-13_GanzhouFriedFish_sina_01.jpg',
    quote: '一盘口味能留下来的前提，是它已经在街巷与日常里被反复验证。'
  },
  2: {
    image: '/immersive/topic-headers/P0-03_FoodTopic_cyw_02.jpg',
    quote: '地方风味真正动人，不只靠招牌，而是靠城市生活把它一点点养出来。'
  },
  3: {
    image: '/immersive/content-cards/P0-13_GannanTeaPickingOpera_culture_02.jpg',
    quote: '戏曲不只是舞台表演，它也保留了一整个地方说话、抒情与叙事的方式。'
  },
  4: {
    image: '/immersive/content-cards/P0-13_HakkaLeicha_culture_01.jpg',
    quote: '擂茶像一种慢工序的日常仪式，把手艺、待客与地方性揉在一处。'
  },
  5: {
    image: '/immersive/content-cards/P0-13_RuijinRedSites_official_01.jpg',
    quote: '红色地点的力量，往往来自现场感，而不是抽象口号。'
  },
  6: {
    image: '/immersive/topic-headers/P0-05_RedCulture_official_01.jpg',
    quote: '当历史重新回到地点，它才会重新变得具体、可感，也可被继续追问。'
  },
  7: {
    image: '/immersive/content-cards/P0-13_JiangnanSongcheng_official_01.jpg',
    quote: '城市更新真正有效的时候，不是把旧记忆擦掉，而是把它重新编排进新的日常。'
  },
  8: {
    image: '/immersive/content-cards/P0-13_HakkaWeiwu_official_01.jpg',
    quote: '围屋的意义不只是形制，而是它让聚居、守望与地方秩序同时可见。'
  }
};

export function getScenicMeta(id) {
  return scenicMetaMap[Number(id)] || {};
}

export function getArticleMeta(id) {
  return articleMetaMap[Number(id)] || {};
}

export function getAllScenicMeta() {
  return scenicMetaMap;
}

export function getAllArticleMeta() {
  return articleMetaMap;
}
