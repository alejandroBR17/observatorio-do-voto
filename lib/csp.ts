import { imageHosts } from './article-image';

export function contentSecurityPolicy(nonce: string | null, origin: string, development = false) {
  const url = new URL(origin);
  const websocket = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
  const images = [...new Set(imageHosts)].flatMap((host) => [
    `https://${host}`,
    `https://*.${host}`,
  ]);
  return [
    "default-src 'self'",
    `script-src 'self'${nonce ? ` 'nonce-${nonce}' 'strict-dynamic'` : ''}${development ? " 'unsafe-eval' https://va.vercel-scripts.com" : ''}`,
    // Charts and interactive controls currently use inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${images.join(' ')}`,
    "font-src 'self'",
    `connect-src 'self' ${websocket}${development ? ' https://vitals.vercel-insights.com' : ''}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!development ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}
