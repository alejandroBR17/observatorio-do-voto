import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import type { Database } from './database';

export const rateRetentionMs = 24 * 60 * 60 * 1000;
const windowMs = 15 * 60 * 1000;
type Operation = 'write' | 'signup' | 'test' | 'check';
const limits: Record<Operation, number> = { write: 120, signup: 30, test: 30, check: 600 };

export function clientAddress(req: Request, trustedProxy = !!process.env.VERCEL) {
  if (!trustedProxy) return 'local';
  const address = (req.headers.get('x-vercel-forwarded-for') || '').trim();
  return isIP(address) ? address : 'unknown';
}

export function rateKey(secret: string, address: string, operation: Operation, now: number) {
  const day = Math.floor(now / rateRetentionMs);
  const digest = createHmac('sha256', secret).update(`${day}:${address}`).digest('hex');
  return `ratelimit:push:${operation}:${day}:${digest}`;
}

export async function consumeWindow(
  db: Database,
  key: string,
  limit: number,
  duration: number,
  now: number,
) {
  const result = await db
    .prepare(
      "INSERT INTO cache(key,value,updated) VALUES(?,'1',?) ON CONFLICT(key) DO UPDATE SET value=CASE WHEN cache.updated<=? THEN '1' ELSE CAST(CAST(cache.value AS INTEGER)+1 AS TEXT) END,updated=CASE WHEN cache.updated<=? THEN excluded.updated ELSE cache.updated END WHERE cache.updated<=? OR CAST(cache.value AS INTEGER)<?",
    )
    .bind(key, now, now - duration, now - duration, now - duration, limit)
    .run();
  if (result.meta.changes) return null;
  const row = await db
    .prepare('SELECT updated FROM cache WHERE key=?')
    .bind(key)
    .first<{ updated: number }>();
  const retryAfter = Math.max(1, Math.ceil(((row?.updated ?? now) + duration - now) / 1000));
  return Response.json(
    {
      error: 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.',
      code: 'rate_limited',
      retryAfter,
    },
    { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } },
  );
}

export async function limitPush(
  db: Database,
  req: Request,
  operation: Operation,
  secret: string,
  now = Date.now(),
) {
  const blocked = await consumeWindow(
    db,
    rateKey(secret, clientAddress(req), operation, now),
    limits[operation],
    windowMs,
    now,
  );
  if (blocked) return blocked;
  if (operation === 'signup' || operation === 'test')
    return consumeWindow(
      db,
      `ratelimit:push:global:${operation}`,
      operation === 'signup' ? 300 : 200,
      windowMs,
      now,
    );
  return null;
}

export async function cleanupPushRateLimits(db: Database, now = Date.now()) {
  await db
    .prepare("DELETE FROM cache WHERE key LIKE 'ratelimit:push:%' AND updated<?")
    .bind(now - rateRetentionMs)
    .run();
}
