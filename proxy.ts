import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { contentSecurityPolicy } from './lib/csp';

export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString('base64');
  const origin = new URL(request.nextUrl.origin);
  origin.host = request.headers.get('host') || origin.host;
  if (process.env.VERCEL) origin.protocol = 'https:';
  const csp = contentSecurityPolicy(nonce, origin.origin, process.env.NODE_ENV === 'development');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {
  matcher: ['/((?!api|_next|assets|data|.*\\.).*)'],
};
