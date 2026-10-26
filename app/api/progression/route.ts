import { env } from '@/lib/runtime';
import { states } from '@/lib/elections';
import { readProgression } from '@/lib/progression';
import { previewPublicData } from '@/lib/preview-public-data';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const uf = (new URL(req.url).searchParams.get('uf') || 'BR').toUpperCase();
  if (uf !== 'BR' && !states.some((state) => state[1] === uf))
    return Response.json({ error: 'UF inválida' }, { status: 400 });
  try {
    const db = env.DB;
    if (!db) {
      const preview = await previewPublicData('/api/progression', uf);
      if (preview) return preview;
      return Response.json({ status: 'unavailable', points: [] }, { status: 503 });
    }
    const points = await readProgression(db, uf);
    return Response.json(
      {
        status: 'ready',
        uf,
        year: 2026,
        turn: 2,
        points,
        coverage: 'Boletins observados pelo serviço; não é o histórico completo da noite.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ status: 'unavailable', points: [] }, { status: 503 });
  }
}
