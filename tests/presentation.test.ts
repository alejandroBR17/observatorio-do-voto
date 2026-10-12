import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatDateTime, formatCompactPercent } from '../lib/presentation';

test('display dates keep date-only publications and convert timestamps to Brasília', () => {
  assert.equal(formatDate('2026-10-11'), '11/10/2026');
  assert.equal(formatDate('2026-10-11T01:00:00Z'), '10/10/2026');
  assert.match(formatDateTime('2026-10-11T01:00:00Z'), /10\/10\/2026.*22:00:00/);
  assert.equal(formatDate(null), 'Data não informada');
  assert.equal(formatDateTime('invalid'), 'Não informado');
});

test('compact percentages preserve precision without adding decimal zeros', () => {
  assert.equal(formatCompactPercent(53.1), '53,1%');
  assert.equal(formatCompactPercent(52), '52%');
});
