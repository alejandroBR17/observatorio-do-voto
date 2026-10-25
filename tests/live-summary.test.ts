import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Result } from '../lib/elections';
import { currentLiveResult, liveMargin } from '../lib/live-summary';
import { LiveObservatory } from '../app/live-observatory';
import { LiveStateList } from '../app/components/live-state-list';

const archive: Result[] = JSON.parse(readFileSync('public/data/history-2022.json', 'utf8'));
const result = {
  ...archive.find((row) => row.uf === 'BR' && row.turn === 2)!,
  year: 2026,
  final: false,
};

test('outages retain only official second-turn results for the requested UF and year', () => {
  assert.equal(currentLiveResult({ lastGood: result }, 'BR'), result);
  assert.equal(currentLiveResult({ lastGood: result }, 'SP'), undefined);
  assert.equal(currentLiveResult({ result: { ...result, turn: 1 } }, 'BR'), undefined);
  assert.equal(currentLiveResult({ result: { ...result, year: 2022 } }, 'BR'), undefined);
});

test('margin uses vote order, handles ties and leaves a zero-vote bulletin without a leader', () => {
  const reversed = { ...result, candidates: [...result.candidates].reverse() };
  const margin = liveMargin(reversed)!;
  assert.equal(margin.votes, 2139645);
  assert.equal(margin.leader.number, '13');
  assert.equal(liveMargin({ ...result, valid: 0 }), null);
  assert.equal(
    liveMargin({
      ...result,
      candidates: result.candidates.map((c) => ({ ...c, votes: 100, percent: 50 })),
    })?.votes,
    0,
  );
});

test('live page shows retained counts and an outage warning without returning to the first-turn preview', () => {
  const html = renderToStaticMarkup(
    createElement(LiveObservatory, {
      live: { status: 'unavailable', lastGood: result },
      uf: 'BR',
      region: 'Brasil',
      notification: '',
      points: [],
      stateResults: [],
      canPreview: true,
      onState: () => {},
      onRegion: () => {},
      onAlerts: () => {},
      onNight: () => {},
      onHistory: () => {},
    }),
  );
  assert.ok(html.includes('Última parcial disponível'));
  assert.ok(html.includes('Boletim do TSE:'));
  assert.ok(html.includes('Votos válidos'));
  assert.ok(!html.includes('Um ensaio antes da contagem.'));
});

test('state list excludes past elections and identifies missing records without assigning a leader', () => {
  const html = renderToStaticMarkup(
    createElement(LiveStateList, {
      data: archive,
      region: 'Sul',
      selected: 'BR',
      onSelect: () => {},
    }),
  );
  assert.ok(html.includes('0 de 3 UFs'));
  assert.ok(html.includes('Aguardando boletim'));
  assert.ok(!html.includes(' lidera<'));
  assert.ok(!html.includes('São Paulo'));
});
