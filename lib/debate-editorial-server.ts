import type { Database } from './database';
import { queuePush } from './push';
import { debate } from './debate';
import {
  initialDebateEditorial,
  parseDebateEditorial,
  editorialCacheKey,
  type DebateEditorial,
} from './debate-editorial';

/** Accept only a newer trusted release; old warm instances cannot roll editorial state back. */
export async function syncDebateEditorial(
  db: Database,
  candidate: unknown = initialDebateEditorial,
  now = Date.now(),
): Promise<DebateEditorial> {
  const incoming = parseDebateEditorial(candidate, now);
  if (!incoming) throw Error('Invalid editorial content');
  await db
    .prepare(
      "INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated WHERE CAST(json_extract(cache.value,'$.revision') AS INTEGER)<?",
    )
    .bind(editorialCacheKey, JSON.stringify(incoming), now, incoming.revision)
    .run();
  const stored = await db
    .prepare('SELECT value FROM cache WHERE key=?')
    .bind(editorialCacheKey)
    .first<{ value: string }>();
  const state = stored && parseDebateEditorial(JSON.parse(stored.value), now);
  if (!state) throw Error('Editorial state unavailable');
  // Retry a queue write after an interrupted publication; stable IDs prevent duplicate sends.
  for (const update of state.updates) {
    const expiresAt = Date.parse(update.publishedAt) + 10 * 60000;
    if (!update.notify || now >= expiresAt) continue;
    const id = update.kind === 'note' ? update.id : update.kind;
    await queuePush(db, {
      id: `debate:${debate.id}:editorial:${id}`,
      types: ['debateLive'],
      title: update.title,
      body: update.body,
      url: '/debate#debate-acompanhar',
      urgent: update.kind !== 'note',
      expiresAt,
    });
  }
  return state;
}
