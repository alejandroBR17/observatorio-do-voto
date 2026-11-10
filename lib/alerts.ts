import type { Result } from './elections';
import {
  adaptiveAlerts,
  type AdaptiveAlerts,
  type ContentSubject,
} from './content-personalization';
const categories = {
  winner: true,
  mathematical: true,
  lead: true,
  margin: true,
  progress: false,
  polls: true,
  coverage: false,
  debate: false,
  debateLive: false,
};
export type AlertType = keyof typeof categories;
export type AlertFrequency = 'immediate' | 'hourly' | 'daily';
export type AlertPreferences = Record<AlertType, boolean> & {
  frequency: AlertFrequency;
  adaptive?: AdaptiveAlerts;
};
export const defaultAlerts: AlertPreferences = { ...categories, frequency: 'immediate' };
export function alertPreferences(value: unknown): AlertPreferences {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    ...Object.fromEntries(
      Object.entries(categories).map(([key, fallback]) => [
        key,
        typeof input[key] === 'boolean' ? input[key] : fallback,
      ]),
    ),
    frequency: ['hourly', 'daily'].includes(input.frequency as string)
      ? (input.frequency as AlertFrequency)
      : 'immediate',
    ...(adaptiveAlerts(input.adaptive) ? { adaptive: adaptiveAlerts(input.adaptive) } : {}),
  } as AlertPreferences;
}
export const frequencyWindow = (prefs: AlertPreferences) =>
  prefs.frequency === 'hourly' ? 3600000 : prefs.frequency === 'daily' ? 86400000 : 900000;
export const priorityAlert = (types: AlertType[], prefs: AlertPreferences) =>
  types.some(
    (t) => prefs[t] && ['winner', 'mathematical', 'lead', 'debate', 'debateLive'].includes(t),
  );
/** Only common editorial updates change cadence. Never enable a category or delay a milestone. */
export function adaptiveWindow(
  prefs: AlertPreferences,
  event: { types: AlertType[]; subjects?: ContentSubject[] },
  now = Date.now(),
) {
  const base = frequencyWindow(prefs),
    learned = adaptiveAlerts(prefs.adaptive, now);
  if (
    !learned ||
    priorityAlert(event.types, prefs) ||
    event.types.some((type) => !['polls', 'coverage'].includes(type)) ||
    !event.subjects?.length
  )
    return base;
  return event.subjects.some((subject) => learned.subjects.includes(subject))
    ? base
    : Math.max(base, 86400000);
}
export const voteGap = (r: Result) =>
  (r.candidates.find((c) => c.number === '22')?.percent || 0) -
  (r.candidates.find((c) => c.number === '13')?.percent || 0);
export function resultAlertTypes(
  current: Result,
  prior: Result | null,
  kind: string,
  previousKind: string | null,
  marginBaseline = prior ? voteGap(prior) : voteGap(current),
): AlertType[] {
  const types: AlertType[] = [];
  if (kind === 'official' && previousKind !== 'official') types.push('winner');
  if (kind === 'mathematical' && !['official', 'mathematical'].includes(previousKind || ''))
    types.push('mathematical');
  if (prior && current.candidates[0]?.number !== prior.candidates[0]?.number) types.push('lead');
  if (prior && Math.abs(voteGap(current) - marginBaseline) >= 0.5 - 1e-9) types.push('margin');
  types.push('progress');
  return types;
}
