import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/database';
import { isSameOrigin } from '@/lib/request';
import { validEndpoint, eventId, sendPush } from '@/lib/push';
import { pushTestFailure } from '@/lib/push-test-error';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return Response.json({ error: 'Origem inválida' }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (typeof body?.endpoint !== 'string' || !validEndpoint(body.endpoint))
    return Response.json({ error: 'Inscrição inválida' }, { status: 400 });
  let phase: 'storage' | 'delivery' = 'storage';
  try {
    const db = getDatabase();
    if (!db) throw Error();
    const row = await db
      .prepare('SELECT value FROM subscription_keys WHERE endpoint=?')
      .bind(body.endpoint)
      .first<{ value: string }>();
    if (!row)
      return Response.json(
        { error: 'Ative ou atualize sua inscrição antes de testar.' },
        { status: 400 },
      );
    if (body.check === true) {
      const receipt = await db
        .prepare('SELECT value FROM cache WHERE key=?')
        .bind(eventId('test-receipt', body.endpoint))
        .first<{ value: string }>();
      return Response.json({ received: !!receipt && receipt.value === body.id });
    }
    const id = 'test:' + randomUUID();
    const lease = await db
      .prepare(
        'INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated WHERE cache.updated<?',
      )
      .bind(eventId('test', body.endpoint), id, Date.now(), Date.now() - 60000)
      .run();
    if (!lease.meta.changes)
      return Response.json(
        { error: 'Aguarde um minuto antes de testar novamente.' },
        { status: 429 },
      );
    phase = 'delivery';
    await sendPush(db, JSON.parse(row.value), {
      id,
      types: [],
      title: 'Teste de notificação',
      body: 'Seu aparelho recebeu o teste do Observatório do Voto. Os avisos reais seguem as categorias que você escolheu.',
      url: '/?tab=alerts',
    });
    return Response.json({ ok: true, id });
  } catch (e) {
    const failure = pushTestFailure(e, phase);
    console.error('push-test-failed', {
      phase,
      code: failure.code,
      statusCode: (e as { statusCode?: number })?.statusCode || null,
    });
    return Response.json({ error: failure.error, code: failure.code }, { status: failure.status });
  }
}
