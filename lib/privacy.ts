export const privacyVersion = '2026-10-22.2';
export const pushConsentVersion = '2026-10-13-push';
export const analyticsConsentVersion = '2026-10-13-analytics';
export const privacyContact = {
  name: 'Alejandro Mateus Sobral Cortes',
  email: 'ale.sobral.cortes@gmail.com',
};
export const pushConsentText =
  'Autorizo os alertas que eu escolher, os testes que eu solicitar e o envio dos dados necessários para entregá-los.';
export const pushTransferText =
  'O endereço de entrega, as chaves e as preferências de alertas ficam no Turso, nos Estados Unidos. O provedor de notificações do navegador também pode processá-los fora do Brasil. Nome, candidato preferido e anotações não são enviados. A autorização é opcional e pode ser revogada em Alertas.';

export const pushAuthorization = {
  version: pushConsentVersion,
  noticeVersion: privacyVersion,
  purpose: 'selected-election-alerts',
  internationalTransfer: true,
  statement: pushConsentText,
  transferInformation: pushTransferText,
} as const;

export function validPushAuthorization(value: unknown): value is Omit<
  typeof pushAuthorization,
  'noticeVersion'
> & {
  noticeVersion: typeof privacyVersion | '2026-10-13.2' | '2026-10-22.1';
} {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  // The new notice adds optional local learning; the push purpose and statements are unchanged.
  // A still-open older client may submit the exact prior push disclosure it actually displayed.
  return Object.entries(pushAuthorization).every(([key, expected]) =>
    key === 'noticeVersion'
      ? record[key] === expected || record[key] === '2026-10-13.2' || record[key] === '2026-10-22.1'
      : record[key] === expected,
  );
}
