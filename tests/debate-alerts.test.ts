import test from 'node:test';
import assert from 'node:assert/strict';
import { alertPreferences } from '../lib/alerts';
import { debateAlertPreferences } from '../lib/debate-alerts';

test('a first debate subscription enables only explicitly selected debate categories', () => {
  const current = alertPreferences({ polls: true, winner: true });
  const next = debateAlertPreferences(current, false, { debate: false, debateLive: true });
  for (const key of [
    'winner',
    'mathematical',
    'lead',
    'margin',
    'progress',
    'polls',
    'coverage',
    'debate',
  ] as const) {
    assert.equal(next[key], false, key);
  }
  assert.equal(next.debateLive, true);
  assert.equal(current.polls, true);
});

test('debate choices preserve the other alerts and cadence of an existing subscriber', () => {
  const current = alertPreferences({
    polls: true,
    winner: false,
    debate: true,
    frequency: 'daily',
  });
  const next = debateAlertPreferences(current, true, { debate: false, debateLive: false });
  assert.deepEqual(next, { ...current, debate: false, debateLive: false });
  assert.equal(current.debate, true);
});
