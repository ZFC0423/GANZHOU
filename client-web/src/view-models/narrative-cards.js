import { getArticleMeta, getScenicMeta } from '../content/narrative-meta';

function normalizeThemeCode(code) {
  return String(code || 'food').replace(/-/g, '_');
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

export function normalizeContextCards(items = []) {
  return items.map(getContextCard).filter(Boolean);
}
