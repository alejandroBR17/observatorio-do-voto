import { getDatabase } from '@/lib/database';
import { monitorAuthorized, runMonitor } from '@/lib/monitor';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: 'Monitor não configurado.' }, { status: 503 });
  if (!monitorAuthorized(req.headers.get('authorization'), expected))
    return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  const db = getDatabase();
  if (!db) return Response.json({ error: 'Banco não configurado.' }, { status: 503 });
  const data = await runMonitor(db);
  return Response.json(data, {
    status: data.status === 'ready' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
