const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

function createPlaceholder(text) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760">
      <defs>
        <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f6f0e4"/>
          <stop offset="100%" stop-color="#ddd0bd"/>
        </linearGradient>
        <radialGradient id="ink" cx="70%" cy="25%" r="80%">
          <stop offset="0%" stop-color="#27313a" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="#0f1419" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#paper)"/>
      <rect width="100%" height="100%" fill="url(#ink)" opacity="0.82"/>
      <path d="M0 620C190 560 290 740 520 670C720 612 848 506 1200 610V760H0Z" fill="#8b3328" opacity="0.2"/>
      <circle cx="186" cy="138" r="20" fill="#b84f3f" opacity="0.85"/>
      <line x1="90" y1="608" x2="1110" y2="608" stroke="#f0e7d6" stroke-opacity="0.22"/>
      <line x1="90" y1="624" x2="740" y2="624" stroke="#f0e7d6" stroke-opacity="0.12"/>
      <text x="96" y="118" font-family="'Noto Serif SC','STSong','SimSun',serif" font-size="24" letter-spacing="6" fill="#f3ecde" fill-opacity="0.72">GANZHOU SCROLL</text>
      <text x="96" y="392" font-family="'Noto Serif SC','STSong','SimSun',serif" font-size="78" font-weight="700" fill="#fff5e6">${text || '赣州长卷'}</text>
      <text x="96" y="450" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="24" fill="#f3ecde" fill-opacity="0.78">章节占位画板 · 待替换为真实图像</text>
    </svg>`
  )}`;
}

export function resolveAssetUrl(path, fallbackText = 'Ganzhou Travel') {
  if (!path) {
    return createPlaceholder(fallbackText);
  }

  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }

  return `${apiBase}${path}`;
}

export function applyImageFallback(event, text = 'Ganzhou Travel') {
  event.target.src = createPlaceholder(text);
}
