/** Preview deployments may read public production data without database credentials. */
export async function previewPublicData(
  path: '/api/media' | '/api/live' | '/api/progression',
  uf?: string,
) {
  if (process.env.VERCEL_ENV !== 'preview') return null;
  const url = new URL(path, 'https://observatorio-voto.vercel.app');
  if (uf) url.searchParams.set('uf', uf);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    return Response.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return null;
  }
}
