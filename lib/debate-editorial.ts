import bundled from '../data/debate-editorial.json';
import { debate, debatePhase, type DebatePhase, type DebateTopic } from './debate';

export type DebateEditorialUpdate = {
  id: string;
  kind: 'start' | 'end' | 'note';
  title: string;
  body: string;
  publishedAt: string;
  notify: boolean;
};
export type ProposalComparison = { label: string; flavio: string; lula: string };
export type DebateEditorial = {
  revision: number;
  state: 'planned' | 'live' | 'ended';
  confirmedAt: string | null;
  updatedAt: string;
  updates: DebateEditorialUpdate[];
  proposals: Record<DebateTopic, ProposalComparison[]>;
};
const text = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const stamp = (v: unknown) =>
  typeof v === 'string' && /Z$|[+-]\d{2}:\d{2}$/.test(v) && Number.isFinite(Date.parse(v));
/** Public editorial content travels as data. This is not a public write API. */
export function parseDebateEditorial(value: unknown, now = Date.now()): DebateEditorial | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as DebateEditorial;
  if (
    !Number.isSafeInteger(v.revision) ||
    v.revision < 1 ||
    !['planned', 'live', 'ended'].includes(v.state) ||
    !stamp(v.updatedAt) ||
    Date.parse(v.updatedAt) > now + 60000
  )
    return null;
  if (
    v.state !== 'planned' &&
    (!stamp(v.confirmedAt) ||
      Date.parse(v.confirmedAt!) > now ||
      Date.parse(v.confirmedAt!) < Date.parse('2026-10-23T00:00:00-03:00'))
  )
    return null;
  if (v.state === 'planned' && v.confirmedAt !== null) return null;
  if (
    !Array.isArray(v.updates) ||
    v.updates.length > 30 ||
    new Set(v.updates.map((u) => u?.id)).size !== v.updates.length
  )
    return null;
  if (
    v.updates.some(
      (u) =>
        !u ||
        !text(u.id, 80) ||
        !/^[a-z0-9:-]+$/.test(u.id) ||
        !['start', 'end', 'note'].includes(u.kind) ||
        !text(u.title, 120) ||
        !text(u.body, 500) ||
        !stamp(u.publishedAt) ||
        Date.parse(u.publishedAt) > now ||
        Date.parse(u.publishedAt) < Date.parse('2026-10-23T00:00:00-03:00') ||
        typeof u.notify !== 'boolean',
    )
  )
    return null;
  if (
    v.updates.some(
      (u) =>
        (u.kind === 'start' && v.state === 'planned') || (u.kind === 'end' && v.state !== 'ended'),
    )
  )
    return null;
  if (
    !v.proposals ||
    ['economia', 'saude', 'seguranca', 'educacao'].some((topic) => {
      const rows = v.proposals[topic as DebateTopic];
      return (
        !Array.isArray(rows) ||
        rows.length < 1 ||
        rows.length > 4 ||
        rows.some((r) => !r || !text(r.label, 80) || !text(r.flavio, 300) || !text(r.lula, 300))
      );
    })
  )
    return null;
  return v;
}
export const initialDebateEditorial = bundled as DebateEditorial;
export function editorialPhase(
  editorial: DebateEditorial | null | undefined,
  now: number,
): DebatePhase {
  return editorial?.state === 'live'
    ? 'scheduled'
    : editorial?.state === 'ended'
      ? 'after'
      : debatePhase(now);
}
export const editorialCacheKey = `debate:editorial:${debate.id}:v1`;
