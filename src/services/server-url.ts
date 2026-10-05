/** Turns whatever the user typed into a base URL: http:// by default, no surrounding spaces, no trailing slash. */
export function normalizeServerUrl(raw: string): string {
  let url = raw.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `http://${url}`;
  }
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url;
}
