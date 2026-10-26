import { localIndex } from '@/lib/local-index';
import { selectLocal } from '@/lib/local-results';
import { states } from '@/lib/elections';
import { fetchSecondTurn, secondTurnCatalog } from '@/lib/local-second-turn';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const uf = (params.get('uf') || '').toUpperCase();
  const turnValue = params.get('turn') || '1';
  const turn = Number(turnValue);
  const code = params.get('municipality') || undefined;
  const place = params.get('place') || undefined;
  const zone = params.get('zone') || undefined;
  const section = params.get('section') || undefined;
  if (
    !states.some((s) => s[1] === uf) ||
    !['1', '2'].includes(turnValue) ||
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
    index = await localIndex(uf, turn);
  } catch {
    if (turn === 2) {
      try {
        const catalog = await localIndex(uf, 1);
        if (!code)
          return Response.json(secondTurnCatalog(catalog), {
            headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
          });
        const municipality = catalog.municipalities.find((item) => item.code === code);
        if (!municipality)
          return Response.json(
            { error: 'Município não encontrado neste estado.' },
            { status: 404 },
          );
        if (place || section)
          return Response.json(
            {
              error:
                'Colégios e seções do segundo turno ainda não estão disponíveis neste acervo. Consulte o município ou uma zona; o primeiro turno continua disponível.',
            },
            { status: 409 },
          );
        const data = await fetchSecondTurn(uf, code, municipality.name, zone);
        return Response.json(data, {
          headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
        });
      } catch (error) {
        const status =
          error && typeof error === 'object' && 'status' in error && error.status === 404
            ? 404
            : 503;
        return Response.json(
          {
            error: error instanceof Error ? error.message : 'Fonte do segundo turno indisponível.',
          },
          { status },
        );
      }
    }
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
