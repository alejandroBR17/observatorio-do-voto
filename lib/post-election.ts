import type { Result } from './elections';

/** Editorial verification is dated; an announced challenge is never a court ruling. */
export const postElectionReview = {
  reviewedAt: '2026-10-26T02:42:43Z',
  status: 'announced',
  title: 'Flávio anuncia que pedirá anulação da eleição',
  summary:
    'Lula consta como eleito no boletim do TSE consultado. Não foi confirmada decisão de anulação nesta checagem.',
  sources: [
    {
      label: 'Pronunciamento de Flávio · Rádio Senado',
      url: 'https://www12.senado.leg.br/radio/1/noticia/2026/10/25/flavio-bolsonaro-contesta-resultado-da-eleicao-e-anuncia-pedido-de-anulacao',
    },
    {
      label: 'Balanço do presidente do TSE · Rádio Senado',
      url: 'https://www12.senado.leg.br/radio/1/noticia/2026/10/25/presidente-do-tse-afirma-que-prorrogacao-da-votacao-nao-comprometeu-a-apuracao',
    },
  ],
} as const;

export function postElectionContext(result?: Result, now = Date.now()) {
  if (
    !result ||
    result.year !== 2026 ||
    result.turn !== 2 ||
    result.uf !== 'BR' ||
    !result.final ||
    !result.candidates?.some((candidate) => candidate.number === '13' && candidate.elected) ||
    now < Date.parse(postElectionReview.reviewedAt)
  )
    return null;
  return postElectionReview;
}
