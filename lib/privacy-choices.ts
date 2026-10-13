import { analyticsConsentVersion, pushConsentVersion } from './privacy';
export const privacyChoiceKey = 'observatorio.privacy-choices';
export const privacyChoiceEvent = 'observatorio:privacy-choice';
type Choice = 'analytics' | 'push';
type Receipt = { version: string; acceptedAt: string };
export function privacyChoice(value: unknown, kind: Choice): Receipt | null {
  const data = value && typeof value === 'object' ? (value as Record<string, unknown>)[kind] : null;
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const expected = kind === 'analytics' ? analyticsConsentVersion : pushConsentVersion;
  return record.version === expected &&
    typeof record.acceptedAt === 'string' &&
    Number.isFinite(Date.parse(record.acceptedAt))
    ? { version: expected, acceptedAt: record.acceptedAt }
    : null;
}
export function readPrivacyChoice(kind: Choice) {
  try {
    return privacyChoice(JSON.parse(localStorage.getItem(privacyChoiceKey) || '{}'), kind);
  } catch {
    return null;
  }
}
export function savePrivacyChoice(kind: Choice, allowed: boolean) {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(localStorage.getItem(privacyChoiceKey) || '{}') || {};
  } catch {
    /* Replace an unreadable local record with a minimal choice. */
  }
  const next = {
    analytics: privacyChoice(data, 'analytics'),
    push: privacyChoice(data, 'push'),
    [kind]: allowed
      ? {
          version: kind === 'analytics' ? analyticsConsentVersion : pushConsentVersion,
          acceptedAt: new Date().toISOString(),
        }
      : null,
  };
  localStorage.setItem(privacyChoiceKey, JSON.stringify(next));
  window.dispatchEvent(new Event(privacyChoiceEvent));
}
