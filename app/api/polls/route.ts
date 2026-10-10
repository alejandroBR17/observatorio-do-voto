export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { env } from '@/lib/runtime';
import { polls } from '@/lib/polls';
import { dispatchPush } from '@/lib/push';
export async function GET() {
  let db;
  try {
    db = env.DB;
  } catch {}
  const data = await polls(db);
  if (db) await dispatchPush(db).catch(() => {});
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
