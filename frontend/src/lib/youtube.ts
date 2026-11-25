const YOUTUBE_URL_RE =
  /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com\/(watch\?|shorts\/|live\/|embed\/)|youtu\.be\/)\S+/i;

// Loose client-side check; the backend does the real video ID extraction
export function isYoutubeUrl(url: string): boolean {
  return YOUTUBE_URL_RE.test(url.trim());
}
