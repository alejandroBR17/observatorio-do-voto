export const termsVersion = '2026-10-13';

export function hasCurrentTerms(saved: string | null): boolean {
  try {
    const value = JSON.parse(saved || 'null');
    return value?.version === termsVersion;
  } catch {
    return false;
  }
}
