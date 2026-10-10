import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { states } from './elections';
import type { LocalIndex } from './local-results';

const cached = new Map<string, Promise<LocalIndex>>();
export function localIndex(uf: string) {
  if (!states.some((s) => s[1] === uf)) throw Error('Estado inválido.');
  let pending = cached.get(uf);
  if (!pending) {
    pending = readFile(join(process.cwd(), 'data', 'local-results', `${uf.toLowerCase()}.json.gz`))
      .then((buffer) => JSON.parse(gunzipSync(buffer).toString('utf8')) as LocalIndex)
      .catch((e: unknown) => {
        cached.delete(uf);
        throw e;
      });
    cached.set(uf, pending);
    // Keep serverless memory bounded when many states are queried.
    if (cached.size > 3) cached.delete(cached.keys().next().value!);
  }
  return pending;
}
