import { isSameOrigin } from '@/lib/request';
import { env } from '@/lib/runtime';
import { pushKeys, validEndpoint, validSubscription } from '@/lib/push';
import { alertPreferences } from '@/lib/alerts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const unavailable = () =>
  Response.json(
    {
      error: 'Não foi possível conectar ao serviço de notificações. Tente novamente em instantes.',
    },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
export async function GET() {
  try {
    const db = env.DB;
    if (!db) return unavailable();
    const keys = await pushKeys(db);
    return Response.json({ publicKey: keys.public }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return unavailable();
  }
}
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return Response.json({ error: 'Origem inválida' }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (
    !body ||
    !validSubscription(body.subscription) ||
    body.endpoint !== body.subscription.endpoint
  )
    return Response.json(
      { error: 'Inscrição push inválida. Atualize o app e tente novamente.' },
      { status: 400 },
    );
  try {
    const db = env.DB;
    if (!db) return unavailable();
    await db
      .prepare(
        'INSERT INTO subscriptions(endpoint,preferences,updated) VALUES(?,?,?) ON CONFLICT(endpoint) DO UPDATE SET preferences=excluded.preferences,updated=excluded.updated',
      )
      .bind(body.endpoint, JSON.stringify(alertPreferences(body.preferences)), Date.now())
      .run();
    await db
      .prepare(
        'INSERT INTO subscription_keys(endpoint,value,created) VALUES(?,?,?) ON CONFLICT(endpoint) DO UPDATE SET value=excluded.value',
      )
      .bind(body.endpoint, JSON.stringify(body.subscription), Date.now())
      .run();
    return Response.json({ ok: true });
  } catch {
    return unavailable();
  }
}
export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) return Response.json({ error: 'Origem inválida' }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (typeof body?.endpoint !== 'string' || !validEndpoint(body.endpoint))
    return Response.json({ error: 'Inscrição inválida.' }, { status: 400 });
  try {
    const db = env.DB;
    if (!db) return unavailable();
    await db.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(body.endpoint).run();
    await db.prepare('DELETE FROM subscription_keys WHERE endpoint=?').bind(body.endpoint).run();
    return Response.json({ ok: true });
  } catch {
    return unavailable();
  }
}
