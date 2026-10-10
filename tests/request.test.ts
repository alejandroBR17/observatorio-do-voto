import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSameOrigin } from '../lib/request';
test('origin checks support a custom domain behind Next and reject cross-site requests', () => {
  const request = (origin: string) =>
    new Request('http://localhost:3000/api/push', {
      headers: { host: 'voto.example.com', origin },
    });
  assert.equal(isSameOrigin(request('https://voto.example.com')), true);
  assert.equal(isSameOrigin(request('https://attacker.example.com')), false);
  assert.equal(isSameOrigin(request('http://voto.example.com')), false);
  assert.equal(isSameOrigin(request('null')), false);
  assert.equal(
    isSameOrigin(
      new Request('http://localhost:3000/api/push', {
        headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' },
      }),
    ),
    true,
  );
});
