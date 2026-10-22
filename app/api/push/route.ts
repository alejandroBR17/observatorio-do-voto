import { isSameOrigin } from '@/lib/request';
import { env } from '@/lib/runtime';
import { pushKeys, validEndpoint, validSubscription } from '@/lib/push';
import { alertPreferences } from '@/lib/alerts';
import { pushAuthorization, validPushAuthorization } from '@/lib/privacy';
import { removePushRegistration } from '@/lib/push-storage';
import { limitedJson } from '@/lib/json-request';
import { limitPush } from '@/lib/push-rate-limit';
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
  const body = await limitedJson(req);
  if (body instanceof Response) return body;
  if (
    !body ||
    typeof body.endpoint !== 'string' ||
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
    const authorization = body.authorization;
    const authorized = validPushAuthorization(authorization);
    if (body.authorization !== undefined && !authorized)
      return Response.json(
        {
          error: 'Revise a autorização de notificações antes de ativar.',
          code: 'consent_required',
        },
        { status: 409 },
      );
    const existing = await db
      .prepare('SELECT endpoint FROM subscription_keys WHERE endpoint=?')
      .bind(body.endpoint)
      .first();
    if (!authorized && !existing)
      return Response.json(
        {
          error: 'Revise a autorização em Alertas para registrar este aparelho.',
          code: 'consent_required',
        },
        { status: 409 },
      );
    const secret = process.env.CRON_SECRET || (await pushKeys(db)).private.d;
    const blocked =
      (await limitPush(db, req, 'write', secret)) ||
      (!existing ? await limitPush(db, req, 'signup', secret) : null);
    if (blocked) return blocked;
    if (authorized) {
      await db
        .prepare(
          'INSERT INTO subscription_consents(endpoint,value,accepted) VALUES(?,?,?) ON CONFLICT(endpoint) DO UPDATE SET value=excluded.value,accepted=excluded.accepted',
        )
        .bind(
          body.endpoint,
          JSON.stringify({ ...pushAuthorization, noticeVersion: authorization.noticeVersion }),
          Date.now(),
        )
        .run();
    }
    const saved = await db
      .prepare(
        authorized
          ? 'INSERT INTO subscriptions(endpoint,preferences,updated) VALUES(?,?,?) ON CONFLICT(endpoint) DO UPDATE SET preferences=excluded.preferences,updated=excluded.updated'
          : 'UPDATE subscriptions SET preferences=?,updated=? WHERE endpoint=?',
      )
      .bind(
        ...(authorized
          ? [body.endpoint, JSON.stringify(alertPreferences(body.preferences)), Date.now()]
          : [JSON.stringify(alertPreferences(body.preferences)), Date.now(), body.endpoint]),
      )
      .run();
    if (!saved.meta.changes)
      return Response.json(
        {
          error: 'Esta inscrição foi removida. Revise a autorização para ativar novamente.',
          code: 'consent_required',
        },
        { status: 409 },
      );
    await db
      .prepare(
        'INSERT INTO subscription_keys(endpoint,value,created) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM subscriptions WHERE endpoint=?) ON CONFLICT(endpoint) DO UPDATE SET value=excluded.value',
      )
      .bind(body.endpoint, JSON.stringify(body.subscription), Date.now(), body.endpoint)
      .run();
    return Response.json({ ok: true });
  } catch {
    return unavailable();
  }
}
export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) return Response.json({ error: 'Origem inválida' }, { status: 403 });
  const body = await limitedJson(req);
  if (body instanceof Response) return body;
  if (typeof body?.endpoint !== 'string' || !validEndpoint(body.endpoint))
    return Response.json({ error: 'Inscrição inválida.' }, { status: 400 });
  try {
    const db = env.DB;
    if (!db) return unavailable();
    await removePushRegistration(db, body.endpoint);
    return Response.json({ ok: true });
  } catch {
    return unavailable();
  }
}
