import { localIndex } from '@/lib/local-index';
import { selectLocal } from '@/lib/local-results';
import { states } from '@/lib/elections';
import { fetchSecondTurn, secondTurnCatalog } from '@/lib/local-second-turn';
import { fetchSectionBallot, secondTurnPlaceDirectory } from '@/lib/section-ballot';
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
  const directory = params.get('directory');
  if (
    !states.some((s) => s[1] === uf) ||
    !['1', '2'].includes(turnValue) ||
    (code && !/^\d{5}$/.test(code)) ||
    (place && !/^\d{4}-\d{1,6}$/.test(place)) ||
    (zone && !/^\d{4}$/.test(zone)) ||
    (section && !/^\d{4}$/.test(section)) ||
    (section && !zone && !place) ||
    (directory !== null &&
      (directory !== '1' || turn !== 2 || !code || place || zone || section)) ||
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
        if (directory)
          return Response.json(await secondTurnPlaceDirectory(uf, municipality, catalog), {
            headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
          });
        if (place && !section)
          return Response.json(
            {
              error:
                'O total por colégio do segundo turno ainda não está disponível neste acervo. Consulte uma seção informando zona e número, ou consulte o município e a zona.',
            },
            { status: 409 },
          );
        const located = place ? municipality.places.find((item) => item.id === place) : undefined;
        if (place && (!located || (zone && located.zone !== zone)))
          return Response.json({ error: 'Local não encontrado nesta zona.' }, { status: 404 });
        const data = section
          ? await fetchSectionBallot(uf, code, municipality.name, zone || located!.zone, section)
          : await fetchSecondTurn(uf, code, municipality.name, zone);
        if (located && data.ballot?.placeNumber !== located.number)
          return Response.json(
            {
              error:
                'O boletim desta seção indica outro local de votação. Consulte pela zona e seção, ou confira seu e-Título.',
            },
            { status: 409 },
          );
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
    const data = selectLocal(index, code, place, zone, section);
    if (directory) delete data.tally;
    return Response.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Local não encontrado.' },
      { status: 404 },
    );
  }
}
