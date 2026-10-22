import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Dashboard from '../app/dashboard';
import Page from '../app/page';

test('the observatory design can render independently of preview-only behavior', () => {
  const production = renderToStaticMarkup(createElement(Dashboard, { observatory: true }));
  assert.ok(production.includes('control-room'));
  assert.ok(production.includes('pela Presidência.'));
  assert.ok(!production.includes('Prévia para revisão'));
  const preview = renderToStaticMarkup(createElement(Dashboard, { reviewOnly: true }));
  assert.ok(preview.includes('control-room'));
  assert.ok(preview.includes('Prévia para revisão'));
});

test('a direct section selection renders the requested heading without the panorama', () => {
  const polls = renderToStaticMarkup(
    createElement(Dashboard, { observatory: true, initialTab: 'polls' }),
  );
  assert.ok(polls.includes('O pulso da disputa.'));
  assert.ok(!polls.includes('pela Presidência.'));
  const invalid = renderToStaticMarkup(
    createElement(Dashboard, { observatory: true, initialTab: 'unknown' }),
  );
  assert.ok(invalid.includes('pela Presidência.'));
});

test('the public entry point enables the approved design without enabling review mode', async () => {
  const page = await Page({ searchParams: Promise.resolve({ tab: 'polls' }) });
  const html = renderToStaticMarkup(page);
  assert.ok(html.includes('control-room'));
  assert.ok(html.includes('O pulso da disputa.'));
  assert.ok(!html.includes('Prévia para revisão'));
});
