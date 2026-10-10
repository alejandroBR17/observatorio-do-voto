// Next.js may expose an internal request URL behind a hosting proxy.
// The browser's Origin must still match the actual HTTP Host, never a wildcard.
export function isSameOrigin(req: Request) {
  try {
    const value = req.headers.get('origin');
    if (!value) return false;
    const origin = new URL(value),
      host = req.headers.get('host') || new URL(req.url).host;
    if (
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash
    )
      return false;
    const allowed =
      origin.protocol === 'https:' ||
      (origin.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname));
    return allowed && origin.host === host.toLowerCase();
  } catch {
    return false;
  }
}
