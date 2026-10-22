import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import webpush from 'web-push';
import { createDatabase } from '../lib/database';
import { dispatchPush, queuePush } from '../lib/push';
import { cleanupPushRetention } from '../lib/push-storage';
import { adaptiveWindow, alertPreferences } from '../lib/alerts';
import {
  emptyLearning,
  learnInterest,
  noteDiscoveries,
  readLearning,
} from '../lib/personalization';
import {
  adaptiveAlerts,
  adaptiveNoticeVersion,
  contentFingerprint,
  contentSubject,
  learnedAlertSummary,
  rankContent,
} from '../lib/content-personalization';
const DAY = 86400000;
test('content learning needs its own opt-in and classifies subjects without candidates or sentiment', () => {
  assert.equal(contentSubject('Lula apresenta propostas'), 'proposals');
  assert.equal(contentSubject('Bolsonaro apresenta propostas'), 'proposals');
  assert.equal(contentSubject('Lula em nova pesquisa'), 'polls');
  assert.equal(contentSubject('Críticas a Bolsonaro'), 'context');
  assert.equal(contentSubject('Críticas a Lula'), 'context');
  assert.equal(contentSubject('Debate presidencial', true), 'polls');
  const items = [
    { title: 'Propostas', url: 'https://a.test/1', publishedAt: new Date().toISOString() },
  ];
  assert.equal(rankContent(items, { ...emptyLearning(), enabled: true }), items);
  assert.deepEqual(readLearning({ ...emptyLearning(), enabled: true }).contentEnabled, false);
  assert.equal(readLearning({ ...emptyLearning(), enabled: true }).pushEnabled, false);
  assert.equal(readLearning({ ...emptyLearning(), contentOrder: 'recent' }).contentOrder, 'recent');
});
test('ranking learns autonomously, reduces opened headlines and keeps chronology, all stories and source variety', () => {
  const now = Date.now();
  let state = { ...emptyLearning(), enabled: true, contentEnabled: true };
  for (let i = 3; i >= 0; i--)
    state = learnInterest(state, 'content:proposals', now - i * 21 * 60000);
  const items = [
    {
      title: 'Acontecimento recente',
      url: 'https://a.test/1',
      publishedAt: new Date(now).toISOString(),
    },
    {
      title: 'Propostas de Lula',
      url: 'https://b.test/2',
      publishedAt: new Date(now - 60000).toISOString(),
    },
    {
      title: 'Propostas de Bolsonaro',
      url: 'https://c.test/3',
      publishedAt: new Date(now - 60000).toISOString(),
    },
    {
      title: 'Outra fonte recente',
      url: 'https://d.test/4',
      publishedAt: new Date(now - 120000).toISOString(),
    },
    {
      title: 'Propostas antigas',
      url: 'https://b.test/5',
      publishedAt: new Date(now - 10 * DAY).toISOString(),
    },
  ];
  const ranked = rankContent(items, state, false, now);
  assert.equal(ranked[0].title, 'Propostas de Lula');
  assert.equal(ranked[1].title, 'Propostas de Bolsonaro');
  assert.notEqual(ranked[0].title, 'Propostas antigas');
  assert.deepEqual(new Set(ranked.map((item) => item.url)), new Set(items.map((item) => item.url)));
  state = noteDiscoveries(state, [contentFingerprint('Propostas de Lula')], now);
  assert.equal(rankContent(items, state, false, now)[0].title, 'Propostas de Bolsonaro');
  assert.equal(contentFingerprint('PROPOSTAS DE LULA!'), contentFingerprint('Propostas de Lula'));
  assert.ok(!JSON.stringify(state).includes('https://'));
});
test('remote summary requires separate permission and sufficient recent evidence; expires and excludes raw signals', () => {
  const now = Date.now();
  let state = { ...emptyLearning(), enabled: true, contentEnabled: true };
  for (let i = 3; i >= 0; i--)
    state = learnInterest(state, 'content:debates', now - i * 21 * 60000);
  assert.equal(learnedAlertSummary(state, now), undefined);
  state = { ...state, pushEnabled: true, pushAcceptedAt: now };
  const summary = learnedAlertSummary(state, now)!;
  assert.deepEqual(summary.subjects, ['debates']);
  let byPage = {
    ...emptyLearning(),
    enabled: true,
    contentEnabled: true,
    pushEnabled: true,
    pushAcceptedAt: now - DAY,
  };
  for (let i = 3; i >= 0; i--) byPage = learnInterest(byPage, 'topic:polls', now - i * 21 * 60000);
  assert.deepEqual(
    learnedAlertSummary(byPage, now)?.subjects,
    ['polls'],
    'consulting the app also informs alerts, without requiring notification clicks',
  );
  assert.deepEqual(Object.keys(summary).sort(), ['acceptedAt', 'expiresAt', 'subjects', 'version']);
  assert.equal(learnedAlertSummary({ ...state, enabled: false }, now), undefined);
  assert.equal(learnedAlertSummary(state, now + 8 * DAY), undefined);
  assert.equal(adaptiveAlerts({ ...summary, expiresAt: now + 8 * DAY }, now), undefined);
  assert.equal(adaptiveAlerts({ ...summary, subjects: ['candidate:13'] }, now), undefined);
  assert.deepEqual(
    adaptiveAlerts(
      { ...summary, subjects: ['debates', 'candidate:13'], rawHistory: ['private'] },
      now,
    ),
    summary,
  );
  const prefs = alertPreferences({ coverage: true, adaptive: summary });
  assert.equal(adaptiveWindow(prefs, { types: ['coverage'], subjects: ['debates'] }, now), 900000);
  assert.equal(adaptiveWindow(prefs, { types: ['coverage'], subjects: ['proposals'] }, now), DAY);
  assert.equal(adaptiveWindow(prefs, { types: ['winner'], subjects: ['proposals'] }, now), 900000);
  assert.equal(adaptiveWindow(prefs, { types: ['progress'] }, now), 900000);
});
test('adaptive delivery respects categories, does not starve daily summaries, expires stored profiles and preserves decisive alerts', async () => {
  const client = createClient({ url: 'file::memory:' }),
    db = createDatabase(client),
    now = Date.now();
  const endpoint = 'https://fcm.googleapis.com/fcm/send/adaptive';
  const subscription = {
    endpoint,
    keys: {
      p256dh: webpush.generateVAPIDKeys().publicKey,
      auth: Buffer.alloc(16, 1).toString('base64url'),
    },
  };
  const adaptive = {
    version: adaptiveNoticeVersion,
    acceptedAt: now,
    expiresAt: now + DAY,
    subjects: ['debates'],
  };
  try {
    await db
      .prepare('INSERT INTO subscriptions(endpoint,preferences,updated) VALUES(?,?,?)')
      .bind(endpoint, JSON.stringify({ coverage: true, polls: false, adaptive }), now)
      .run();
    await db
      .prepare('INSERT INTO subscription_keys(endpoint,value,created) VALUES(?,?,?)')
      .bind(endpoint, JSON.stringify(subscription), 0)
      .run();
    const sent: string[] = [];
    const sender = async (_db: unknown, _sub: unknown, event: { id: string }) => {
      sent.push(event.id);
      return {} as any;
    };
    const event = {
      id: 'context1',
      types: ['coverage'] as ['coverage'],
      subjects: ['context'] as ['context'],
      title: 'Contexto',
      body: 'Fonte',
      url: '/?tab=social',
    };
    await queuePush(db, event);
    await dispatchPush(db, sender);
    assert.deepEqual(sent, ['context1']);
    await db
      .prepare("UPDATE push_deliveries SET updated=? WHERE event_id='context1'")
      .bind(now - 2 * 3600000)
      .run();
    await queuePush(db, { ...event, id: 'context2' });
    await dispatchPush(db, sender);
    assert.equal(sent.length, 1);
    await queuePush(db, { ...event, id: 'debate1', subjects: ['debates'] });
    await dispatchPush(db, sender);
    assert.deepEqual(sent, ['context1', 'debate1']);
    await queuePush(db, { ...event, id: 'poll-disabled', types: ['polls'], subjects: ['polls'] });
    await queuePush(db, { ...event, id: 'winner1', types: ['winner'], urgent: true });
    await dispatchPush(db, sender);
    assert.ok(sent.includes('winner1'));
    assert.ok(!sent.includes('poll-disabled'));
    await db
      .prepare("UPDATE push_deliveries SET updated=? WHERE event_id='context1'")
      .bind(now - DAY - 1000)
      .run();
    await db
      .prepare("UPDATE push_deliveries SET updated=? WHERE event_id='debate1'")
      .bind(now - 16 * 60000)
      .run();
    await db.prepare("UPDATE push_deliveries SET updated=0 WHERE status='deferred'").run();
    await dispatchPush(db, sender);
    assert.ok(
      sent.includes('context2'),
      'daily story is not perpetually postponed by followed subjects',
    );
    await cleanupPushRetention(db, now + DAY + 1000);
    const stored = await db
      .prepare('SELECT preferences FROM subscriptions WHERE endpoint=?')
      .bind(endpoint)
      .first<{ preferences: string }>();
    assert.equal(JSON.parse(stored!.preferences).adaptive, undefined);
  } finally {
    client.close();
  }
});
