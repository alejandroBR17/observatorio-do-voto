import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ['@libsql/client'],
  outputFileTracingIncludes: {
    '/api/local-results': ['./data/local-results/*.json.gz'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};
export default config;
