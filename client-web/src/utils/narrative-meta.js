import { getArticleMeta, getScenicMeta } from '../content/narrative-meta';
import { isBrokenNarrativeText } from './narrative-text';

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

  if (/(mountain|forest|nature|eco|灞眧姘磡鐎戝竷|娓╂硥)/.test(text)) {
    return 'mountain';
  }

  if (/(heritage|hakka|culture|闈為仐|瀹㈠|鍥村眿|鐭崇獰|鎵嬭壓)/.test(text)) {
    return 'cultural';
  }

  return 'city';
}
