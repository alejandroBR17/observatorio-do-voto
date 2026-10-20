import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { years } from '../lib/content';
import type { Result } from '../lib/elections';
import { candidateIdentity } from '../lib/candidate-identity';
import { electionPalette } from '../lib/election-palette';
import { importantUpdates } from '../lib/important-updates';
import { pollSnapshots } from '../lib/polls/catalog';

const archive = (year: number): Result[] =>
  JSON.parse(fs.readFileSync(`public/data/history-${year}.json`, 'utf8'));

test('every archive year has positive national counts and every turn conserves votes across states', () => {
  for (const year of years) {
    const rows = archive(year);
    const turns = [...new Set(rows.map((result) => result.turn))].sort();
    assert.deepEqual(turns, [1994, 1998].includes(year) ? [1] : [1, 2]);
    for (const turn of turns) {
      const national = rows.find((result) => result.uf === 'BR' && result.turn === turn)!;
      assert.ok(national.valid > 0, String(year));
      assert.equal(
        national.valid,
        rows
          .filter((result) => result.uf !== 'BR' && result.turn === turn)
          .reduce((total, result) => total + result.valid, 0),
      );
      for (const result of rows.filter((result) => result.turn === turn))
        assert.equal(
          result.valid,
          result.candidates.reduce((total, candidate) => total + candidate.votes, 0),
        );
    }
  }
  const result = archive(1998).find((row) => row.uf === 'BR')!;
  assert.equal(result.valid, 67722303);
  assert.equal(result.candidates[0].votes, 35936382);
  assert.equal(result.candidates[1].votes, 21475211);
});

test('all visible historical leaders have a real local portrait matched by identity, never ballot number', () => {
  for (const year of years)
    for (const result of archive(year)) {
      if (result.valid === 0 || result.uf === 'ZZ') continue;
      for (const candidate of result.candidates.slice(0, 2)) {
        const person = candidateIdentity(candidate.name);
        assert.ok(person, `${year} ${result.uf}: ${candidate.name}`);
        assert.ok(fs.existsSync('public' + person.photo), person.photo);
      }
    }
  assert.notEqual(
    candidateIdentity('JAIR BOLSONARO')?.photo,
    candidateIdentity('FLAVIO BOLSONARO')?.photo,
  );
  assert.notEqual(candidateIdentity('FERNANDO HADDAD')?.photo, candidateIdentity('LULA')?.photo);
});

test('historical legends use that election’s candidates rather than current candidate names', () => {
  const palette = electionPalette(
    archive(2010).find((row) => row.uf === 'BR' && row.turn === 2)!.candidates,
  );
  assert.deepEqual(
    palette.map((candidate) => candidate.name),
    ['Dilma Rousseff', 'José Serra'],
  );
  assert.equal(palette[0].color, '#c96856');
  assert.equal(palette[1].color, '#24796d');
});

test('important visit updates exclude articles and publications, deduplicate polls and reject future dates', () => {
  const sample = { ...pollSnapshots[0], publishedAt: '2026-10-19T12:00:00Z' };
  const result = importantUpdates(
    {
      polls: [sample, sample, { ...sample, id: 'future', publishedAt: '2099-01-01' }],
      publications: [
        {
          title: 'Unconfirmed headline',
          url: 'https://example.com',
          source: 'Source',
          institute: 'Institute',
          publishedAt: sample.publishedAt,
          kind: 'publication',
        },
      ],
    },
    { status: 'waiting' },
    Date.parse('2026-10-20T12:00:00Z'),
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, 'Pesquisa');
});

test('state results never create a national decisive milestone in the visit summary', () => {
  const live = {
    status: 'live',
    checkedAt: '2026-10-25T22:00:00Z',
    result: { uf: 'SP', turn: 2, year: 2026 },
    victory: { kind: 'official' },
  };
  assert.equal(importantUpdates(null, live).length, 0);
  assert.equal(
    importantUpdates(null, { ...live, result: { uf: 'BR', turn: 2, year: 2022 } }).length,
    0,
  );
  assert.equal(
    importantUpdates(null, { ...live, result: { uf: 'BR', turn: 1, year: 2026 } }).length,
    0,
  );
  assert.equal(
    importantUpdates(null, { ...live, result: { uf: 'BR', turn: 2, year: 2026 }, stale: true })
      .length,
    0,
  );
  assert.equal(
    importantUpdates(null, { ...live, result: { uf: 'BR', turn: 2, year: 2026 } })[0].id,
    'phase:2026-2:official',
  );
});
