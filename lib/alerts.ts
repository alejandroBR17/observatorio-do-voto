import type { Result } from './elections';
const categories = {
  winner: true,
  mathematical: true,
  lead: true,
  margin: true,
  progress: false,
  polls: true,
  coverage: false,
};
export type AlertType = keyof typeof categories;
export type AlertFrequency = 'immediate' | 'hourly' | 'daily';
export type AlertPreferences = Record<AlertType, boolean> & { frequency: AlertFrequency };
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
  } as AlertPreferences;
}
export const frequencyWindow = (prefs: AlertPreferences) =>
  prefs.frequency === 'hourly' ? 3600000 : prefs.frequency === 'daily' ? 86400000 : 900000;
export const priorityAlert = (types: AlertType[], prefs: AlertPreferences) =>
  types.some((t) => prefs[t] && ['winner', 'mathematical', 'lead'].includes(t));
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
