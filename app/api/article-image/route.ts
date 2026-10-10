import { articleUrl } from '@/lib/article-image';
import { articlePreview } from '@/lib/article-preview';
import { getDatabase } from '@/lib/database';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;
export async function GET(req: Request) {
  const url = articleUrl(new URL(req.url).searchParams.get('url') || '');
  if (!url) return Response.json({ image: null }, { status: 400 });
  let db;
  try {
    db = getDatabase();
  } catch {
    /* The memory cache also works without a configured database. */
  }
  const image = await articlePreview(url.href, db);
  return Response.json({ image }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
