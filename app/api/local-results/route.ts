import { localIndex } from '@/lib/local-index';
import { selectLocal } from '@/lib/local-results';
import { states } from '@/lib/elections';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const uf = (params.get('uf') || '').toUpperCase();
  const code = params.get('municipality') || undefined;
  const place = params.get('place') || undefined;
  const zone = params.get('zone') || undefined;
  const section = params.get('section') || undefined;
  if (
    !states.some((s) => s[1] === uf) ||
    (code && !/^\d{5}$/.test(code)) ||
    (place && !/^\d{4}-\d{1,6}$/.test(place)) ||
    (zone && !/^\d{4}$/.test(zone)) ||
    (section && !/^\d{4}$/.test(section)) ||
    (!code && (place || zone || section))
  )
    return Response.json(
      { error: 'Confira o estado, município, zona e seção informados.' },
      { status: 400 },
    );
  let index;
  try {
    index = await localIndex(uf);
  } catch {
    return Response.json(
      { error: 'O acervo local está temporariamente indisponível. Tente novamente.' },
      { status: 503 },
    );
  }
  try {
    return Response.json(selectLocal(index, code, place, zone, section), {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Local não encontrado.' },
      { status: 404 },
    );
  }
}
