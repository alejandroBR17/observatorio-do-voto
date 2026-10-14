import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicSiteOrigin, sharingMetadata } from '../lib/site-metadata';

test('public metadata never derives its canonical host from a temporary deployment', () => {
  assert.equal(
    publicSiteOrigin({ VERCEL_URL: 'temporary-project.vercel.app' }),
    'https://observatorio-voto.vercel.app',
  );
  assert.equal(
    publicSiteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: 'voto.example.org' }),
    'https://voto.example.org',
  );
  assert.equal(
    publicSiteOrigin({ SITE_URL: 'https://voto.example.org/?tab=profile#notes' }),
    'https://voto.example.org',
  );
  for (const SITE_URL of ['javascript:alert(1)', 'https://user:password@example.org'])
    assert.throws(() => publicSiteOrigin({ SITE_URL }));
  const metadata = sharingMetadata('Privacidade', 'Suas escolhas.', '/privacidade');
  assert.equal(metadata.alternates?.canonical, new URL('/privacidade', publicSiteOrigin()).href);
  assert.equal(metadata.openGraph?.url, metadata.alternates?.canonical);
  assert.equal(metadata.twitter?.description, 'Suas escolhas.');
});
