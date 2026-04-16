import { resolveAssetUrl } from '../utils/assets';
import { getScenicMeta } from '../content/narrative-meta';
import { getNarrativeQuote } from '../utils/narrative-meta';
import { pickNarrativeText } from '../utils/narrative-text';

function buildScenicGallery(detail, scenicMeta) {
  return [
    detail?.media?.coverImage,
    scenicMeta.heroImage,
    ...(detail?.media?.galleryImages || []),
    ...(scenicMeta.supportImages || []),
    ...(detail?.galleryImages || [])
  ].filter(Boolean);
}

export function buildScenicDetailViewModel(detail) {
  const scenicMeta = getScenicMeta(detail?.id);
  const value = detail || {};

  const heroData = {
    title: value.name || '赣州地方线索',
    region: pickNarrativeText(value.region, '赣州'),
    category: pickNarrativeText(value.categoryName, '地方 dossier'),
    intro: pickNarrativeText(
      value.intro,
      scenicMeta.heroCaption || '先让地方成立，再让信息慢慢跟上。'
    ),
    quote: getNarrativeQuote(value, 'scenic') || '先记住这个地方，再去理解它与赣州的关系。',
    image: value.media?.coverImage || scenicMeta.heroImage || value.coverImage || '',
    caption: pickNarrativeText(value.media?.caption, scenicMeta.heroCaption || value.intro || '')
  };

  const quickFactsSource = Array.isArray(value.quickFacts) && value.quickFacts.length
    ? value.quickFacts
    : [
        { label: 'Region', value: value.region || '赣州' },
        { label: 'Suggested Duration', value: value.suggestedDuration || value.visitMode || '按现场节奏停留' },
        { label: 'Opening Info', value: value.openTime || '以现场公告为准' },
        { label: 'Route Cue', value: value.routeLabel || scenicMeta.routeLabel || '继续沿着地方线索走' }
      ];

  const labelMap = {
    Region: '所在区域',
    'Suggested Duration': '建议停留',
    'Opening Info': '开放信息',
    'Route Cue': '路线线索'
  };

  const dossierSections = Array.isArray(value.dossierSections)
    ? value.dossierSections.filter((item) => item?.content).map((item) => ({
        kicker: pickNarrativeText(item.kicker, 'Dossier'),
        title: pickNarrativeText(item.title, '地方叙事'),
        content: item.content
      }))
    : [];

  const fallbackSections = [
    {
      kicker: 'Arrival',
      title: '先抵达这处地方',
      content: pickNarrativeText(value.intro, '当前暂无地点概览内容。')
    },
    {
      kicker: 'Context',
      title: '再理解它的文化与历史层',
      content: pickNarrativeText(value.cultureDesc, '当前暂无更深入的文化背景说明。')
    },
    {
      kicker: 'Route',
      title: '最后安排行进、停留与观看方式',
      content: pickNarrativeText(
        value.trafficGuide,
        pickNarrativeText(value.tips, '建议结合天气、步行强度和现场公告灵活调整。')
      )
    }
  ].filter((item) => item.content);

  const gallerySource = Array.isArray(value.gallerySequence) && value.gallerySequence.length
    ? value.gallerySequence
    : buildScenicGallery(value, scenicMeta).map((image) => ({ image }));
  const galleryCaptions = [
    heroData.caption || '建立场域的首图。',
    '补充空间关系，让地点的结构更加具体。',
    '把观看重心收窄到细节，让记忆停住。',
    '把这处地方的气口留给最后一张图。'
  ];
  const routeBridgeItems = Array.isArray(value.routeBridge) && value.routeBridge.length
    ? value.routeBridge
    : value.relatedList || [];

  return {
    scenicMeta,
    heroData,
    quickFacts: quickFactsSource.map((item) => ({
      label: labelMap[item.label] || item.label,
      value: item.value
    })),
    dossierSections: dossierSections.length ? dossierSections : fallbackSections,
    sidebarNotes: [
      {
        label: '路线线索',
        content: pickNarrativeText(value.routeLabel, scenicMeta.routeLabel || '从当前地点继续进入地方叙事。')
      },
      {
        label: '最佳时段',
        content: pickNarrativeText(value.bestLightTime, value.openTime || '白天更适合建立空间印象。')
      },
      {
        label: '停留方式',
        content: pickNarrativeText(value.visitMode, value.suggestedDuration || '按现场节奏漫游停留。')
      },
      {
        label: '建议季节',
        content: pickNarrativeText(value.bestVisitSeason, '四季皆宜。')
      }
    ].filter((item) => item.content),
    servicePanels: [
      {
        label: '门票与开放',
        content: pickNarrativeText(value.ticketInfo, '当前暂无门票信息。')
      },
      {
        label: '地址',
        content: pickNarrativeText(value.address, '当前暂无详细地址。')
      },
      {
        label: '出行提示',
        content: pickNarrativeText(value.tips, '建议结合天气、体力和现场公告灵活安排。'),
        muted: true
      }
    ].filter((item) => item.content),
    gallerySequence: gallerySource.slice(0, 4).map((item, index) => ({
      src: resolveAssetUrl(item.image || item.src || item, heroData.title),
      caption: pickNarrativeText(item.caption, galleryCaptions[index] || galleryCaptions[galleryCaptions.length - 1])
    })),
    routeNodes: routeBridgeItems.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title || item.name,
      subtitle: pickNarrativeText(item.routeLabel, item.region || '继续沿着地方线索走'),
      summary: pickNarrativeText(item.heroCaption, item.intro || '从这里继续打开更完整的空间关系。'),
      image: resolveAssetUrl(item.media?.coverImage || item.coverImage || '', item.title || item.name),
      path: item.path || `/scenic/${item.id}`
    }))
  };
}
