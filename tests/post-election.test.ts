import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { postElectionContext, postElectionReview } from '../lib/post-election';
import { ElectionStatusNotice } from '../app/components/election-status-notice';
import type { Result } from '../lib/elections';

const national = {
  year: 2026,
  turn: 2,
  uf: 'BR',
  final: true,
  candidates: [{ number: '13', elected: true }],
} as Result;
const afterReview = Date.parse(postElectionReview.reviewedAt) + 1;

test('a dated announcement is shown only with the matching final official national result', () => {
  assert.equal(postElectionContext(national, afterReview)?.status, 'announced');
  for (const result of [
    undefined,
    { ...national, uf: 'SP' },
    { ...national, year: 2022 },
    { ...national, turn: 1 },
    { ...national, final: false },
    { ...national, candidates: [{ number: '22', elected: true }] } as Result,
  ])
    assert.equal(postElectionContext(result, afterReview), null);
  assert.equal(postElectionContext(national, afterReview - 2), null);
});

test('post-election context distinguishes the announcement from a filing or annulment ruling and dates its sources', () => {
  const html = renderToStaticMarkup(createElement(ElectionStatusNotice, { result: national }));
  assert.ok(html.includes('Flávio anuncia que pedirá'));
  assert.ok(html.includes('Não foi confirmada decisão de anulação nesta checagem'));
  assert.ok(html.includes('Protocolo do pedido e decisão de anulação não foram confirmados'));
  assert.ok(html.includes('dateTime="2026-10-26T02:42:43Z"'));
  assert.ok(html.includes('www12.senado.leg.br'));
  assert.ok(!html.includes('eleição anulada'));
});
