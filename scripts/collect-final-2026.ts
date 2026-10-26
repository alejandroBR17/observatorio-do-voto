import { writeFile } from 'node:fs/promises';
import { normalize, states } from '../lib/elections';

const rows = [];
for (const turn of [1, 2]) {
  const code = turn === 1 ? '6257' : '6258';
  for (const uf of ['BR', ...states.map((state) => state[1])]) {
    const area = uf.toLowerCase();
    const url = `https://resultados.tse.jus.br/oficial/ele2026/${code}/dados/${area}/${area}-c0001-e${code.padStart(6, '0')}-u.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error(`${uf} ${turn}T: HTTP ${response.status}`);
    const result = normalize(await response.json(), url);
    if (
      result.uf !== uf ||
      result.turn !== turn ||
      !result.final ||
      Math.abs(
        result.candidates.reduce((sum, candidate) => sum + candidate.votes, 0) - result.valid,
      ) > 0
    )
      throw Error(`Arquivo incompatível ou incompleto: ${uf} ${turn}T`);
    rows.push(result);
  }
}
await writeFile('public/data/history-2026.json', JSON.stringify(rows));
await writeFile(
  'public/data/final-2026-sources.json',
  JSON.stringify(
    {
      retrievedAt: new Date().toISOString(),
      description:
        'Resultados finais oficiais coletados diretamente no TSE. Brasil inclui exterior; regiões são agregadas pelas UFs.',
      sources: rows.map(({ year, turn, uf, source, generated, id }) => ({
        year,
        turn,
        uf,
        source,
        generated,
        id,
      })),
    },
    null,
    2,
  ),
);
console.log(`Conferidos ${rows.length} resultados finais: Brasil e 27 UFs, nos dois turnos.`);
