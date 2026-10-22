import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiscoveries, discoveryReason } from '../lib/discoveries';
import {
  correctInterest,
  discoveryFeedbackKey,
  emptyLearning,
  interestValue,
  learnDetail,
  learnInterest,
  noteDiscoveries,
  rankDiscoveries,
  readLearning,
  suggestedReading,
  type Discovery,
} from '../lib/personalization';

const now = Date.parse('2026-10-22T12:00:00Z');
const DAY = 86400000;
const enabled = () => ({ ...emptyLearning(), enabled: true });
const choices: Discovery[] = [
  {
    id: 'polls',
    topic: 'polls',
    title: 'Pesquisas',
    description: 'Comparar',
    publishedAt: new Date(now).toISOString(),
  },
  { id: 'history', topic: 'history', title: 'Histórico', description: 'Explorar' },
  { id: 'overview:BA', topic: 'overview', state: 'BA', title: 'Bahia', description: 'Observar' },
  {
    id: 'history:BA',
    topic: 'history',
    state: 'BA',
    title: 'Bahia antes',
    description: 'Explorar',
  },
  { id: 'municipality', topic: 'municipality', title: 'Municípios', description: 'Explorar' },
];
test('learning is opt-in, pausable and rejects candidate, note and precise voting-place signals', () => {
  const paused = emptyLearning();
  assert.equal(learnInterest(paused, 'topic:polls', now), paused);
  assert.equal(learnDetail(paused, 1, now), paused);
  assert.equal(correctInterest(paused, 'topic:polls', 1, now), paused);
  assert.deepEqual(rankDiscoveries(paused, choices, now), []);
  for (const key of [
    'candidate:13',
    'candidate:22',
    'topic:candidates',
    'note:my text',
    'section:123',
    'municipality:3550308',
    'state:XX',
    'topic:polls:',
  ])
    assert.equal(learnInterest(paused, key, now), paused);
  const state = enabled();
  assert.equal(learnInterest(state, 'candidate:22', now), state);
});
test('rapid reloads and repeated clicks count once, while independent visits build interest', () => {
  let state = learnInterest(enabled(), 'state:BA', now);
  assert.equal(learnInterest(state, 'state:BA', now + 1000), state);
  state = learnInterest(state, 'state:BA', now + 21 * 60000);
  assert.ok(state.interests['state:BA'].value > 1.9);
  const ranked = rankDiscoveries(state, choices, now + 21 * 60000);
  assert.equal(ranked[0].state, 'BA');
  assert.equal(new Set(ranked.map((item) => item.topic)).size, ranked.length);
  assert.equal(interestValue({ value: 8, at: now }, now + 7 * DAY), 4);
});
test('explicit corrections override learned interest and remain reversible without deleting source content', () => {
  let state = enabled();
  state.interests['state:BA'] = { value: 12, at: now };
  state = correctInterest(state, 'state:BA', -1, now);
  assert.equal(
    correctInterest({ ...state, enabled: false }, 'state:BA', 0, now).corrections['state:BA'],
    undefined,
  );
  assert.ok(rankDiscoveries(state, choices, now).every((item) => item.state !== 'BA'));
  state = correctInterest(state, 'state:BA', 0, now);
  assert.equal(rankDiscoveries(state, choices, now)[0].state, 'BA');
  state = correctInterest(state, 'topic:municipality', 1, now);
  assert.equal(rankDiscoveries(state, choices, now)[0].topic, 'municipality');
  assert.ok(rankDiscoveries(state, choices, now).some((item) => item.topic === 'municipality'));
  assert.equal(choices.length, 5);
  assert.equal(discoveryFeedbackKey(choices[2]), 'state:BA');
});
test('repeated suggestions rotate without suppressing newly published data', () => {
  let state = enabled();
  for (let index = 0; index < 3; index++)
    state = noteDiscoveries(state, ['polls'], now + index * 21 * 60000);
  const later = now + 43 * 60000;
  assert.ok(!rankDiscoveries(state, choices, later).some((item) => item.id === 'polls'));
  const newer = [
    { ...choices[0], publishedAt: new Date(later).toISOString() },
    ...choices.slice(1),
  ];
  assert.ok(rankDiscoveries(state, newer, later).some((item) => item.id === 'polls'));
  const once = noteDiscoveries(enabled(), ['polls'], now);
  assert.equal(noteDiscoveries(once, ['polls'], now + 1000).seen.polls.count, 1);
});
test('detail adaptation requires repeated evidence and respects pausing automatic details', () => {
  let state = enabled();
  for (let i = 0; i < 3; i++) state = learnDetail(state, 1, now + i * 5000);
  assert.equal(suggestedReading(state), null);
  state = learnDetail(state, 1, now + 15000);
  assert.equal(suggestedReading(state), 'detailed');
  assert.equal(suggestedReading({ ...state, autoDetails: false }), null);
  for (let i = 0; i < 9; i++) state = learnDetail(state, -1, now + 20000 + i * 5000);
  assert.equal(suggestedReading(state), 'essential');
});
test('reading stored learning sanitizes malformed input, removes expired signals and retains only bounded aggregates', () => {
  const result = readLearning(
    {
      version: 1,
      enabled: true,
      autoDetails: true,
      favorite: '13',
      secret: 'private',
      interests: {
        'candidate:13': { value: 8, at: now },
        'topic:polls': { value: 999, at: now },
        'state:SP': { value: 8, at: now - 31 * DAY },
        'state:BA': { value: 8, at: now + DAY },
      },
      corrections: { 'topic:history': { value: -1, at: now } },
      seen: { 'https://private.example': { count: 1, at: now }, polls: { count: 100, at: now } },
      detail: { samples: 1000, value: 999, at: now },
    },
    now,
  );
  assert.deepEqual(Object.keys(result.interests), ['topic:polls']);
  assert.equal(result.interests['topic:polls'].value, 12);
  assert.equal(result.seen.polls.count, 10);
  assert.equal(result.detail.value, 10);
  assert.ok(!JSON.stringify(result).includes('private'));
  assert.equal(readLearning({ version: 2, enabled: true }, now).enabled, false);
  for (const raw of [null, [], true, 'invalid'])
    assert.deepEqual(readLearning(raw, now), emptyLearning());
});
test('discoveries use actual consulted places, explain their reason and never infer a candidate choice', () => {
  const state = learnInterest(enabled(), 'state:BA');
  const discoveries = buildDiscoveries(state);
  const place = discoveries.find((item) => item.state === 'BA')!;
  assert.ok(place.title.includes('Bahia'));
  assert.equal(discoveryReason(state, place), 'Você tem explorado este lugar.');
  assert.ok(
    discoveries.every((item) => !item.title.includes('Lula') && !item.title.includes('Bolsonaro')),
  );
});
