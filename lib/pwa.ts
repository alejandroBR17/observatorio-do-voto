import type { Result } from './elections';

export function installationPlatform(userAgent: string, touchPoints = 0) {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1))
    return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  if (/Macintosh/i.test(userAgent) && /Safari/i.test(userAgent) && !/Chrome|Edg/i.test(userAgent))
    return 'safari';
  return 'desktop';
}

export function offlineSnapshot(result: Result, now = new Date().toISOString()) {
  if (!result.final || result.uf !== 'BR' || result.counted !== 100)
    throw Error('Guarde apenas um resultado nacional concluído.');
  const source = new URL(result.source);
  if (
    source.protocol !== 'https:' ||
    source.hostname !== 'resultados.tse.jus.br' ||
    !Number.isSafeInteger(result.valid) ||
    result.valid < 0 ||
    !result.candidates.length ||
    result.candidates.some(
      (c) =>
        !Number.isSafeInteger(c.votes) ||
        c.votes < 0 ||
        !Number.isFinite(c.percent) ||
        c.percent < 0 ||
        c.percent > 100,
    ) ||
    result.candidates.reduce((total, c) => total + c.votes, 0) !== result.valid
  )
    throw Error('Resultado oficial incompleto.');
  return {
    version: 1,
    final: true,
    uf: 'BR',
    savedAt: now,
    year: result.year,
    turn: result.turn,
    generated: result.generated,
    source: result.source,
    valid: result.valid,
    candidates: result.candidates.map(({ number, name, votes, percent }) => ({
      number,
      name,
      votes,
      percent,
    })),
  };
}
