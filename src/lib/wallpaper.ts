const IMAGE_PARAM_NAMES = ['imgurl', 'mediaurl', 'image', 'url', 'u'];

export function normalizeWallpaperUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

  try {
    const parsed = new URL(trimmed);
    for (const name of IMAGE_PARAM_NAMES) {
      const candidate = parsed.searchParams.get(name);
      if (!candidate) continue;
      const decoded = decodeURIComponent(candidate);
      if (/^https?:\/\//i.test(decoded) && looksLikeImageUrl(decoded)) {
        return decoded;
      }
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function looksLikeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(parsed.pathname + parsed.search);
  } catch {
    return false;
  }
}
