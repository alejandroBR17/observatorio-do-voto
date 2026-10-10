import { articleUrl, articleImage } from './article-image';
import type { Database } from './database';
import { eventId } from './push';
const memory = new Map<string, { image: string | null; updated: number }>();
const pending = new Map<string, Promise<string | null>>();
async function collect(url: string) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 5000);
  try {
    let current = url;
    for (let redirects = 0; redirects < 3; redirects++) {
      const r = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { Accept: 'text/html' },
      });
      if ([301, 302, 303, 307, 308].includes(r.status)) {
        const next = articleUrl(new URL(r.headers.get('location') || '', current).href);
        if (!next) return null;
        current = next.href;
        continue;
      }
      if (!r.ok || !r.headers.get('content-type')?.includes('text/html')) return null;
      const reader = r.body?.getReader();
      if (!reader) return null;
      let total = 0;
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.length;
          if (total > 600000) break;
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const bytes = new Uint8Array(chunks.reduce((n, b) => n + b.length, 0));
      let offset = 0;
      for (const b of chunks) {
        bytes.set(b, offset);
        offset += b.length;
      }
      const charset = /iso-8859-1/i.test(r.headers.get('content-type') || '')
        ? 'iso-8859-1'
        : 'utf-8';
      return articleImage(new TextDecoder(charset).decode(bytes), current);
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
export async function articlePreview(value: string, db?: Database): Promise<string | null> {
  const url = articleUrl(value);
  if (!url) return null;
  const key = eventId('article-image:v1', url.href);
  let cached = memory.get(key);
  try {
    const row = await db
      ?.prepare('SELECT value,updated FROM cache WHERE key=?')
      .bind(key)
      .first<{ value: string; updated: number }>();
    if (row) cached = { image: JSON.parse(row.value), updated: row.updated };
  } catch {
    // A failed shared cache read leaves the in-memory fallback available.
  }
  if (cached && Date.now() - cached.updated < (cached.image ? 86400000 : 3600000))
    return cached.image;
  let task = pending.get(key);
  if (!task) {
    task = collect(url.href);
    pending.set(key, task);
  }
  const image = await task;
  pending.delete(key);
  if (memory.size > 200) memory.clear();
  memory.set(key, { image, updated: Date.now() });
  try {
    await db
      ?.prepare(
        'INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated',
      )
      .bind(key, JSON.stringify(image), Date.now())
      .run();
  } catch {
    // Serve the collected preview even if the shared cache write failed.
  }
  return image;
}
