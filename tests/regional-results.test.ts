import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RegionalResults } from '../app/regional-results';
import type { Result } from '../lib/elections';

const data: Result[] = JSON.parse(readFileSync('public/data/history-2022.json', 'utf8'));
const render = (rows: Result[], turn = 2) =>
  renderToStaticMarkup(
    createElement(RegionalResults, { data: rows, turn, region: 'Nordeste', onRegion: () => {} }),
  );

test('regional summaries show the actual leader for each region and retain candidate identity', () => {
  const html = render(data);
  const cards = html.split('class="regional-result"').slice(1);
  assert.equal(cards.length, 5);
  const northeast = cards.find((card) => card.includes('<strong>Nordeste</strong>'))!;
  const south = cards.find((card) => card.includes('<strong>Sul</strong>'))!;
  assert.ok(northeast.indexOf('Lula') < northeast.indexOf('Jair Bolsonaro'));
  assert.ok(south.indexOf('Jair Bolsonaro') < south.indexOf('Lula'));
  assert.ok(northeast.includes('aria-pressed="true"'));
  assert.ok(html.includes('Mais votado'));
});

test('regional summaries disclose incomplete coverage and do not invent missing turn results', () => {
  assert.ok(
    render(data.filter((row) => row.uf !== 'SP')).includes('Faltam registros de 1 estado(s).'),
  );
  const empty = render(data, 3);
  assert.ok(empty.includes('Aguardando dados deste recorte'));
  assert.ok(!empty.includes('Mais votado'));
  assert.ok(
    render(data.map((row) => ({ ...row, final: false }))).includes('Lidera a contagem parcial'),
  );
});
