// client-safe (no node imports): the import page uses it to route a pasted link to the video
// importer, lib/videoImport to validate before running yt-dlp
export type VideoPlatform = "instagram" | "youtube" | "tiktok";

// Solo post/video pubblici singoli: niente Stories, niente caroselli multi-immagine (fuori scope).
const PLATFORM_PATTERNS: Record<VideoPlatform, RegExp> = {
  instagram: /^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/?/i,
  youtube: /^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=[\w-]+|shorts\/[\w-]+)|youtu\.be\/[\w-]+)/i,
  tiktok: /^https:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
};

export function isValidVideoUrl(platform: VideoPlatform, url: string): boolean {
  return PLATFORM_PATTERNS[platform].test(url);
}

export function detectVideoPlatform(url: string): VideoPlatform | null {
  const trimmed = url.trim();
  return (Object.keys(PLATFORM_PATTERNS) as VideoPlatform[]).find((p) => isValidVideoUrl(p, trimmed)) ?? null;
}

/** First http(s) URL inside shared text ("Guarda questa ricetta https://..."), or null. */
export function extractFirstUrl(text: string): string | null {
  return text.match(/https?:\/\/[^\s<>"]+/i)?.[0] ?? null;
}
