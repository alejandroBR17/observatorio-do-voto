import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Dashboard from '../app/dashboard';
import Page from '../app/page';

test('the observatory design can render independently of preview-only behavior', () => {
  const production = renderToStaticMarkup(createElement(Dashboard, { observatory: true }));
  assert.ok(production.includes('control-room'));
  assert.ok(production.includes('or-masthead'));
  assert.ok(!production.includes('Prévia para revisão'));
  assert.ok(production.includes('Quero personalizar'));
  assert.ok(production.includes('Prefiro a visão padrão'));
  assert.ok(production.indexOf('id="personalizar"') >= 0);
  assert.ok(
    production.indexOf('id="personalizar"') < production.indexOf('id="territorio"'),
    'the personalization decision is visible before the entire map',
  );
  const preview = renderToStaticMarkup(createElement(Dashboard, { reviewOnly: true }));
  assert.ok(preview.includes('control-room'));
  assert.ok(preview.includes('Prévia para revisão'));
});

test('a direct section selection renders the requested heading without the panorama', () => {
  const polls = renderToStaticMarkup(
    createElement(Dashboard, { observatory: true, initialTab: 'polls' }),
  );
  assert.ok(polls.includes('O pulso da disputa.'));
  assert.ok(!polls.includes('or-masthead'));
  const invalid = renderToStaticMarkup(
    createElement(Dashboard, { observatory: true, initialTab: 'unknown' }),
  );
  assert.ok(invalid.includes('or-masthead'));
});

test('post-election startup waits for an official bulletin without announcing a future vote or assuming completion', (t) => {
  t.mock.method(Date, 'now', () => Date.parse('2026-10-26T15:00:00-03:00'));
  const html = renderToStaticMarkup(createElement(Dashboard, { observatory: true }));
  const masthead = html.slice(
    html.indexOf('class="or-masthead"'),
    html.indexOf('class="or-quicknav"'),
  );
  assert.ok(masthead.includes('Consulte o resultado'));
  assert.ok(masthead.includes('Consultando resultado'));
  assert.ok(masthead.includes('Aguardando o boletim oficial'));
  assert.ok(!masthead.includes('Resultados após o fim da votação'));
  assert.ok(!masthead.includes('Apuração concluída'));
});

test('the public entry point enables the approved design without enabling review mode', async () => {
  const page = await Page({ searchParams: Promise.resolve({ tab: 'polls' }) });
  const html = renderToStaticMarkup(page);
  assert.ok(html.includes('control-room'));
  assert.ok(html.includes('O pulso da disputa.'));
  assert.ok(!html.includes('Prévia para revisão'));
});
