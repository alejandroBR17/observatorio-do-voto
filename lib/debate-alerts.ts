import { alertPreferences, type AlertPreferences } from './alerts';

/** A first subscription from the debate must not opt into unrelated election alerts. */
export function debateAlertPreferences(
  current: AlertPreferences,
  subscribed: boolean,
  choices: Pick<AlertPreferences, 'debate' | 'debateLive'>,
): AlertPreferences {
  const base = subscribed
    ? current
    : alertPreferences({
        winner: false,
        mathematical: false,
        lead: false,
        margin: false,
        progress: false,
        polls: false,
        coverage: false,
        frequency: 'immediate',
      });
  return { ...base, ...choices };
}
