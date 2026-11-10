import type { Result } from './elections';

/** Editorial verification is dated; an announced challenge is never a court ruling. */
export const postElectionReview = {
  reviewedAt: '2026-10-26T20:59:37Z',
  label: 'PÓS-ELEIÇÃO · ATUALIZAÇÃO DE 26/10',
  status: 'announced',
  title: 'Resultado oficial e contestação anunciada',
  summary:
    'A apuração presidencial está concluída. Lula consta como eleito no boletim do TSE consultado. Não foi confirmada decisão de anulação nesta checagem.',
  confirmed: [
    'A RadioAgência Senado publicou em 26/10 que Flávio Bolsonaro anunciou que recorrerá à Justiça para pedir a anulação da eleição. Protocolo do pedido e decisão de anulação não foram confirmados pelas fontes consultadas nesta checagem.',
    'Em publicação de 26/10, a TV Senado registrou a declaração do presidente do TSE de que o pleito ocorreu com segurança. Essa manifestação não é apresentada aqui como julgamento de um pedido de anulação.',
  ],
  sources: [
    {
      label: 'Boletim presidencial · TSE',
      url: 'https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json',
    },
    {
      label: 'Anúncio da contestação · Senado · 26/10',
      url: 'https://www12.senado.leg.br/noticias/audios/2026/10/flavio-bolsonaro-contesta-resultado-da-eleicao-e-anuncia-pedido-de-anulacao',
    },
    {
      label: 'Declaração do presidente do TSE · Senado · 26/10',
      url: 'https://www12.senado.leg.br/noticias/videos/2026/10/presidente-do-tse-diz-que-eleicao-ocorreu-com-seguranca-e-nao-ha-o-que-contestar',
    },
  ],
} as const;

export const postElectionServices = [
  {
    id: 'justificativa',
    title: 'Não votou? Consulte a justificativa',
    date: '1º turno: até 03/12/2026 · 2º turno: até 08/01/2027',
    text: 'Cada turno exige uma justificativa separada. Veja documentos, condições e regras para quem estava no exterior no TSE.',
    source: 'https://www.tse.jus.br/servicos-eleitorais/justificativa-eleitoral',
    label: 'Orientações do TSE',
  },
  {
    id: 'diplomacao',
    title: 'Prazo para diplomação',
    date: 'Até 18/12/2026',
    text: 'Prazo previsto no calendário; não é a confirmação da data de uma cerimônia específica.',
    source:
      'https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-751-de-26-de-fevereiro-de-2026',
    label: 'Regra oficial do TSE',
  },
  {
    id: 'posse',
    title: 'Posse da Presidência',
    date: '05/01/2027',
    text: 'Presidente e vice assumem em 5 de janeiro; governadores e vices, em 6 de janeiro.',
    source:
      'https://www12.senado.leg.br/noticias/materias/2026/10/23/presidente-e-governadores-eleitos-tomam-posse-em-novas-datas-em-2027',
    label: 'Entenda a mudança · Senado',
  },
] as const;

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
