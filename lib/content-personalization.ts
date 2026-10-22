import { interestValue, readLearning, type LearningState } from './personalization';

// Subjects describe the content, never a candidate, ideology or inferred vote.
export const contentSubjects = [
  'polls',
  'proposals',
  'debates',
  'results',
  'service',
  'context',
] as const;
export type ContentSubject = (typeof contentSubjects)[number];
export const contentLabels: Record<ContentSubject, string> = {
  polls: 'Pesquisas',
  proposals: 'Propostas',
  debates: 'Debates',
  results: 'Apuração e resultados',
  service: 'Serviço ao eleitor',
  context: 'Contexto eleitoral',
};
export type ContentItem = { title: string; url: string; publishedAt: string | null };
const DAY = 86400000;
const relatedPages: Partial<Record<ContentSubject, string>> = {
  polls: 'polls',
  results: 'live',
  service: 'municipality',
};
function subjectEvidence(state: LearningState, subject: ContentSubject, now: number) {
  const signals = [
    state.interests[`content:${subject}`],
    state.interests[`topic:${relatedPages[subject]}`],
  ].filter((signal) => !!signal);
  return {
    value: signals.reduce((sum, signal) => sum + interestValue(signal, now), 0),
    at: Math.max(0, ...signals.map((signal) => signal.at)),
  };
}
const sourceHost = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};
export function contentSubject(title: string, publication = false): ContentSubject {
  if (publication) return 'polls';
  const text = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/\b(pesquisas?|datafolha|quaest|ipespe|intencao de voto|levantamentos?)\b/.test(text))
    return 'polls';
  if (/\b(apuracao|urnas apuradas|resultado das eleicoes|votos apurados)\b/.test(text))
    return 'results';
  if (/\b(debate|debates|sabatin[ao])\b/.test(text)) return 'debates';
  if (/\b(proposta|propostas|plano de governo|programa de governo)\b/.test(text))
    return 'proposals';
  if (
    /\b(local de votacao|titulo de eleitor|justificar|como votar|horario de votacao|servico ao eleitor)\b/.test(
      text,
    )
  )
    return 'service';
  return 'context';
}
/** An opaque local identifier, not the URL or title. Also matches syndicated headlines. */
export function contentFingerprint(title: string) {
  const normalized = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++)
    hash = Math.imul(hash ^ normalized.charCodeAt(i), 16777619);
  return `content:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
export function rankContent<T extends ContentItem>(
  items: T[],
  state: LearningState,
  publication = false,
  now = Date.now(),
): T[] {
  if (!state.enabled || !state.contentEnabled) return items;
  const clean = readLearning(state, now);
  const scored = items
    .map((item, index) => {
      const published = Date.parse(item.publishedAt || '');
      const age = Number.isFinite(published) ? Math.max(0, now - published) / DAY : 30;
      const key = `content:${contentSubject(item.title, publication)}`;
      const repeat = clean.seen[contentFingerprint(item.title)];
      return {
        item,
        index,
        score:
          Math.max(0, 8 - age * 4) +
          Math.min(3, subjectEvidence(clean, contentSubject(item.title, publication), now).value) +
          (clean.corrections[key]?.value || 0) * 3 -
          (repeat ? 4 : 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const chronological = [...items].sort(
    (a, b) => (Date.parse(b.publishedAt || '') || 0) - (Date.parse(a.publishedAt || '') || 0),
  );
  const result: T[] = [],
    used = new Set<string>();
  // Every fourth place preserves a fresh chronological discovery. Avoid one source occupying
  // the whole opening, without dropping any source, headline or unfavorable information.
  while (result.length < items.length) {
    const candidate =
      result.length % 4 === 3
        ? chronological.find((item) => !used.has(item.url))
        : scored.find(
            ({ item }) =>
              !used.has(item.url) &&
              (result.length >= 4 ||
                !(
                  result.slice(-2).length === 2 &&
                  result.slice(-2).every((old) => sourceHost(old.url) === sourceHost(item.url))
                )),
          )?.item;
    const next = candidate || scored.find(({ item }) => !used.has(item.url))?.item;
    if (!next) break;
    result.push(next);
    used.add(next.url);
  }
  return result;
}
export const adaptiveNoticeVersion = '2026-10-22-adaptive-1';
export const adaptiveNotice =
  'Autorizo adaptar a frequência de notícias e publicações pelo meu uso. Um resumo por assunto, sem candidatos, lugares ou histórico de leituras, será enviado ao servidor no Turso (Estados Unidos) para funcionar com o app fechado. Posso desligar a qualquer momento.';
export type AdaptiveAlerts = {
  version: typeof adaptiveNoticeVersion;
  acceptedAt: number;
  expiresAt: number;
  subjects: ContentSubject[];
};
export function adaptiveAlerts(value: unknown, now = Date.now()): AdaptiveAlerts | undefined {
  if (!value || typeof value !== 'object') return;
  const input = value as AdaptiveAlerts;
  if (
    input.version !== adaptiveNoticeVersion ||
    !Number.isFinite(input.acceptedAt) ||
    input.acceptedAt <= 0 ||
    input.acceptedAt > now ||
    !Number.isFinite(input.expiresAt) ||
    input.expiresAt <= now ||
    input.expiresAt > now + 7 * DAY ||
    !Array.isArray(input.subjects)
  )
    return;
  const subjects = contentSubjects.filter((subject) => input.subjects.includes(subject));
  if (!subjects.length) return;
  return {
    version: adaptiveNoticeVersion,
    acceptedAt: input.acceptedAt,
    expiresAt: input.expiresAt,
    subjects,
  };
}
export function learnedAlertSummary(
  state: LearningState,
  now = Date.now(),
): AdaptiveAlerts | undefined {
  if (!state.enabled || !state.contentEnabled || !state.pushEnabled || !state.pushAcceptedAt)
    return;
  const ranked = contentSubjects
    .map((subject) => ({ subject, evidence: subjectEvidence(state, subject, now) }))
    .filter(({ evidence }) => evidence.value >= 2);
  if (!ranked.length) return;
  ranked.sort((a, b) => b.evidence.value - a.evidence.value);
  return adaptiveAlerts(
    {
      version: adaptiveNoticeVersion,
      acceptedAt: state.pushAcceptedAt,
      expiresAt: Math.min(
        now + 7 * DAY,
        Math.max(...ranked.map(({ evidence }) => evidence.at)) + 7 * DAY,
      ),
      subjects: ranked.slice(0, 3).map(({ subject }) => subject),
    },
    now,
  );
}
