import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { states } from './elections';
import type { LocalIndex } from './local-results';

const cached = new Map<string, Promise<LocalIndex>>();
export function localIndex(uf: string, turn = 1) {
  if (!states.some((s) => s[1] === uf)) throw Error('Estado inválido.');
  if (turn !== 1 && turn !== 2) throw Error('Turno inválido.');
  const key = `${turn}:${uf}`;
  let pending = cached.get(key);
  if (!pending) {
    pending = readFile(
      join(
        process.cwd(),
        'data',
        'local-results',
        ...(turn === 2 ? ['2'] : []),
        `${uf.toLowerCase()}.json.gz`,
      ),
    )
      .then((buffer) => {
        const index = JSON.parse(gunzipSync(buffer).toString('utf8')) as LocalIndex;
        if (index.year !== 2026 || index.turn !== turn)
          throw Error('Acervo incompatível com o turno.');
        return index;
      })
      .catch((e: unknown) => {
        cached.delete(key);
        throw e;
      });
    cached.set(key, pending);
    // Keep serverless memory bounded when many states are queried.
    if (cached.size > 3) cached.delete(cached.keys().next().value!);
  }
  return pending;
}
