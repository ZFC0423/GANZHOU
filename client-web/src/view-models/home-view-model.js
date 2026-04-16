import { getThemeMeta, siteManifesto } from '../content/site-manifest';
import { pickNarrativeText } from '../utils/narrative-text';

function buildThemeEntries(homeData = {}) {
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

export function buildHomeViewModel(homeData = {}) {
  const hero = homeData.hero || {};
  const chapterEntries = buildThemeEntries(homeData);
  const featuredScenicSource = Array.isArray(homeData.featuredScenic) && homeData.featuredScenic.length
    ? homeData.featuredScenic
    : homeData.recommends?.scenic || [];
  const featuredScenic = featuredScenicSource.slice(0, 5);

  const curatedArticles = Array.isArray(homeData.curatedArticles) && homeData.curatedArticles.length
    ? homeData.curatedArticles.map((item) => ({
        ...item,
        basePath: item.path?.replace(/\/\d+$/, '') || item.basePath || '/food'
      }))
    : [
        { basePath: '/food', items: homeData.recommends?.food || [] },
        { basePath: '/heritage', items: homeData.recommends?.heritage || [] },
        { basePath: '/red-culture', items: homeData.recommends?.redCulture || [] }
      ]
        .flatMap((source) => source.items.slice(0, 2).map((item) => ({ ...item, basePath: source.basePath })))
        .slice(0, 4);

  const guideEntry = homeData.aiEntry || {};
  const epilogue = homeData.epilogue || {};

  return {
    heroData: {
      title: pickNarrativeText(hero.title, siteManifesto.title),
      subtitle: pickNarrativeText(hero.subtitle, siteManifesto.subtitle),
      image: hero.image || '/immersive/hero/P0-01_AncientWall_official_03.jpg',
      note: pickNarrativeText(
        hero.note,
        '先感到赣州的气质，再进入章节、地方与 AI 导览。'
      ),
      primaryAction: hero.primaryAction || {
        label: '进入景点图谱',
        path: '/scenic'
      },
      secondaryAction: hero.secondaryAction || {
        label: '向 AI 导览员提问',
        path: '/ai-chat'
      }
    },
    chapterEntries,
    apertureLead: chapterEntries[0] || null,
    apertureTrail: chapterEntries.slice(1, 3),
    featuredScenic,
    leadScenic: featuredScenic[0] || null,
    scenicTrail: featuredScenic.slice(1, 4),
    curatedArticles,
    readingLead: curatedArticles[0] || null,
    readingTrail: curatedArticles.slice(1, 4),
    guideEntry: {
      title: pickNarrativeText(
        guideEntry.title,
        'AI 不在站外，它就在这部长卷里面继续带路。'
      ),
      description: pickNarrativeText(
        guideEntry.description,
        '问答像导览员，路线像工作室，把你已经看到的内容继续整理成清晰的路径。'
      ),
      chatPath: guideEntry.chatPath || '/ai-chat',
      tripPath: guideEntry.tripPath || '/ai-trip'
    },
    epilogue: {
      title: pickNarrativeText(
        epilogue.title,
        '这不是把内容更整齐地摆出来，而是把进入赣州的方式重新编排。'
      ),
      description: pickNarrativeText(epilogue.description, siteManifesto.subtitle)
    }
  };
}

export function resolveHomeArticleLink(item) {
  if (item?.path) {
    return item.path;
  }

  return `${item?.basePath || '/food'}/${item?.id}`;
}
