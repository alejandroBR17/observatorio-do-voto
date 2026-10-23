import { env } from '@/lib/runtime';
import { media } from '@/lib/media';
import { debateContext } from '@/lib/debate-context-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;
export async function GET() {
  try {
    const db = env.DB;
    if (!db) return Response.json({ status: 'unavailable', video: null, checks: [] });
    const coverage = await media(db);
    const context = await debateContext(db, coverage.articles || []);
    return Response.json(context, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable', video: null, checks: [] }, { status: 503 });
  }
}
