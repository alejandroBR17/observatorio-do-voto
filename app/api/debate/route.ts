import { env } from '@/lib/runtime';
import { media } from '@/lib/media';
import { debateContext } from '@/lib/debate-context-server';
import { syncDebateEditorial } from '@/lib/debate-editorial-server';
import { initialDebateEditorial } from '@/lib/debate-editorial';
import { dispatchPush } from '@/lib/push';
import { after } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;
export async function GET() {
  try {
    const db = env.DB;
    if (!db)
      return Response.json({
        status: 'unavailable',
        video: null,
        checks: [],
        editorial: initialDebateEditorial,
      });
    const [editorial, context] = await Promise.all([
      syncDebateEditorial(db),
      media(db)
        .then((coverage) => debateContext(db, coverage.articles || []))
        .catch(() => ({ status: 'unavailable', video: null, checks: [] })),
    ]);
    if (
      editorial.updates.some(
        (update) => update.notify && Date.parse(update.publishedAt) + 600000 > Date.now(),
      )
    )
      after(() => dispatchPush(db).catch(() => {}));
    return Response.json({ ...context, editorial }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable', video: null, checks: [] }, { status: 503 });
  }
}
