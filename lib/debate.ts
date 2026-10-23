import type { MediaArticle } from './media-types';
import type { PollSnapshot } from './polls/types';
import { newsPublisher, newsKey } from './news-sources';

export const debate = {
  id: 'globo-2026-10-23',
  startsAt: '2026-10-23T21:20:00-03:00',
  reminderAt: '2026-10-23T21:05:00-03:00',
  reminderExpiresAt: '2026-10-23T21:35:00-03:00',
  // This switches the presentation, not a claim that the broadcast actually ended.
  recapFrom: '2026-10-24T06:00:00-03:00',
  watchUrl: 'https://g1.globo.com/politica/eleicoes/2026/',
  scheduleSource:
    'https://noticias.uol.com.br/eleicoes/2026/10/19/quando-sera-o-debate-presidencial-da-globo-veja-data-e-horario.ghtm',
} as const;
const planBase =
  'https://www.tse.jus.br/eleicoes/eleicoes-2026-content/propostas-de-governo-dos-candidatos-ao-cargo-de-presidente-da-republica-eleicoes-2026/';
export const debatePlans = {
  '22': planBase + 'flavio-bolsonaro',
  '13': planBase + 'lula-propostas-de-governo',
};
/** Short paraphrases of the TSE's thematic index, checked on 22/10/2026. */
export const debateTopics = [
  {
    id: 'economia',
    name: 'Economia e trabalho',
    question: 'Como financiar as propostas e o que muda no trabalho?',
    meaning: 'Responsabilidade fiscal é cuidar de como o governo arrecada, gasta e se endivida.',
    terms: ['economia', 'fiscal', 'emprego', 'trabalho', 'imposto', 'salario', 'jornada'],
    proposals: {
      '22': 'Reduzir impostos e custos do trabalho, com revisão das regras fiscais.',
      '13': 'Manter o arcabouço fiscal e propor redução da jornada para 40 horas, com fim da escala 6x1.',
    },
    pages: { '22': '30, 43–45 e 70–72', '13': '6–14, 47–49 e 73–77' },
  },
  {
    id: 'saude',
    name: 'Saúde',
    question: 'Qual é a proposta para diminuir a espera por atendimento?',
    meaning:
      'Atenção especializada inclui consultas, exames e tratamentos que exigem especialistas.',
    terms: ['saude', 'sus', 'hospital', 'medico', 'vacina', 'medicamento'],
    proposals: {
      '22': 'Digitalizar o SUS, integrar prontuários e ampliar a telessaúde.',
      '13': 'Reduzir filas de especialistas e fortalecer Mais Médicos e Farmácia Popular.',
    },
    pages: { '22': '25–26 e 37–39', '13': '34–40' },
  },
  {
    id: 'seguranca',
    name: 'Segurança',
    question: 'O que depende do presidente, dos estados ou do Congresso?',
    meaning:
      'A União e os estados dividem responsabilidades. Alterações em leis dependem do Legislativo.',
    terms: ['seguranca', 'crime', 'faccao', 'faccoes', 'policia', 'presidio', 'armas'],
    proposals: {
      '22': 'Combater facções e reforçar fronteiras, com propostas de mudanças nas penas.',
      '13': 'Criar o Ministério da Segurança Pública e combater o financiamento do crime organizado.',
    },
    pages: { '22': '13–16', '13': '26–30' },
  },
  {
    id: 'educacao',
    name: 'Educação',
    question: 'Que medidas chegam à escola e como serão executadas?',
    meaning:
      'Escola em tempo integral amplia a jornada do aluno. Não é o mesmo que ensino técnico.',
    terms: ['educacao', 'escola', 'ensino', 'professor', 'creche', 'universidade'],
    proposals: {
      '22': 'Ampliar escolas em tempo integral e ensino técnico, com formação contínua de professores.',
      '13': 'Expandir tempo integral e Institutos Federais, mantendo o Pé-de-Meia.',
    },
    pages: { '22': '34–37', '13': '30–34' },
  },
] as const;
export type DebateTopic = (typeof debateTopics)[number]['id'];
export type DebatePhase = 'before' | 'scheduled' | 'after';
export function debatePhase(now: number): DebatePhase {
  return now < Date.parse(debate.startsAt)
    ? 'before'
    : now < Date.parse(debate.recapFrom)
      ? 'scheduled'
      : 'after';
}
const normalized = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function debateTopic(title: string): DebateTopic | null {
  const words = normalized(title).split(/[^a-z0-9]+/);
  return debateTopics.find((topic) => topic.terms.some((term) => words.includes(term)))?.id || null;
}
/** Headline matching selects links only; it never extracts a verdict, quote or broadcast status. */
export function debatePublicationTime(value: string) {
  return Date.parse(/Z$|[+-]\d{2}:\d{2}$/.test(value) ? value : value + '-03:00');
}
export function debateCoverage(articles: MediaArticle[], now = Date.now()) {
  const cutoff = Date.parse('2026-10-19T00:00:00-03:00');
  const valid = articles.filter((article) => {
    const title = normalized(article.title),
      stamp = debatePublicationTime(article.publishedAt);
    return (
      newsPublisher(article.url) &&
      Number.isFinite(stamp) &&
      stamp >= cutoff &&
      stamp <= now &&
      /\bdebate\b/.test(title) &&
      /\b(lula|flavio|presidencial|presidente)\b/.test(title) &&
      /\b(globo|tralli)\b/.test(title) &&
      !/\b(governador|governadores|prefeito|prefeitos)\b/.test(title)
    );
  });
  return [...new Map(valid.map((article) => [newsKey(article.url), article])).values()]
    .sort((a, b) => debatePublicationTime(b.publishedAt) - debatePublicationTime(a.publishedAt))
    .slice(0, 24);
}
export function debateChecks(articles: MediaArticle[], now = Date.now()) {
  return debateCoverage(articles, now).filter(
    (article) =>
      debatePublicationTime(article.publishedAt) >= Date.parse(debate.startsAt) &&
      /checagem|checa|verificamos|fato ou fake|confira o que e fato/.test(
        normalized(article.title),
      ),
  );
}
/** Classify the actual fieldwork, never publication time. A mixed period isn't a post-debate poll. */
export function debatePollPeriod(
  poll: Pick<PollSnapshot, 'fieldwork'>,
): 'before' | 'mixed' | 'after' | 'unknown' {
  const match = poll.fieldwork.match(/^(\d{1,2})\s+a\s+(\d{1,2})\/10\/2026\b/);
  if (!match) return 'unknown';
  const from = Number(match[1]),
    to = Number(match[2]);
  if (from < 1 || to > 31 || from > to) return 'unknown';
  return to < 23 ? 'before' : from > 23 ? 'after' : 'mixed';
}
