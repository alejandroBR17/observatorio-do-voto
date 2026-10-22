import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Onboarding, welcomeTermsStep } from '../app/onboarding';
import { hasCurrentTerms, termsVersion } from '../lib/terms';

test('missing, outdated or unreadable terms never authorize dismissal of a required welcome', () => {
  for (const saved of [null, '', '{broken', 'null', '[]', '{}', '{"version":"2026-10-09"}'])
    assert.equal(hasCurrentTerms(saved), false);
  assert.equal(hasCurrentTerms(JSON.stringify({ version: termsVersion })), true);
});

function renderWelcome(allowDismiss = false) {
  return renderToStaticMarkup(
    createElement(Onboarding, {
      nickname: '',
      favorite: '',
      initialStep: welcomeTermsStep,
      notification: 'Desativadas',
      serviceReady: false,
      serviceMessage: '',
      consentAccepted: false,
      allowDismiss,
      onConsent: () => {},
      onDismiss: () => {},
      onFinish: () => false,
      onEnable: async () => ({ ok: false, message: '' }),
    }),
  );
}

test('the required welcome retains its unchecked terms and provides no profile escape', () => {
  const html = renderWelcome();
  assert.ok(html.includes('Li e aceito os'));
  assert.ok(!html.includes('checked=""'));
  assert.ok(!html.includes('Voltar ao perfil'));
});

test('an optional profile review offers an exit without recording or preselecting consent', () => {
  const html = renderWelcome(true);
  assert.ok(html.includes('Voltar ao perfil'));
  assert.ok(html.includes('Li e aceito os'));
  assert.ok(!html.includes('checked=""'));
  assert.ok(!html.includes('Simular o aceite'));
});
