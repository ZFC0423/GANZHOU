const brokenTextPattern = /閿焲锟絴闁簗閸﹟閺倈鈧瑋smart service platform|ganzhou travel platform/i;

export function isBrokenNarrativeText(value) {
  const text = String(value || '').trim();
  return !text || brokenTextPattern.test(text) || /\?{2,}/.test(text);
}

export function pickNarrativeText(value, fallback = '') {
  return isBrokenNarrativeText(value) ? fallback : String(value).trim();
}
