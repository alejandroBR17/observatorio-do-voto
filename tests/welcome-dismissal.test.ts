import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Onboarding, welcomePersonalizationStep, welcomeTermsStep } from '../app/onboarding';
import { hasCurrentTerms, termsVersion } from '../lib/terms';

test('missing, outdated or unreadable terms never authorize dismissal of a required welcome', () => {
  for (const saved of [null, '', '{broken', 'null', '[]', '{}', '{"version":"2026-10-09"}'])
    assert.equal(hasCurrentTerms(saved), false);
  assert.equal(hasCurrentTerms(JSON.stringify({ version: termsVersion })), true);
});

function renderWelcome(allowDismiss = false, initialStep = welcomeTermsStep) {
  return renderToStaticMarkup(
    createElement(Onboarding, {
      nickname: '',
      favorite: '',
      initialStep,
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

test('personalization has a visible dedicated step before terms and never preselects optional learning', () => {
  const html = renderWelcome(false, welcomePersonalizationStep);
  assert.ok(welcomePersonalizationStep < welcomeTermsStep);
  assert.ok(html.includes('Quer que o app aprenda com seu uso?'));
  assert.ok(html.includes('Personalizar minha experiência pelo uso'));
  assert.ok(html.includes('Organizar notícias e publicações para mim'));
  assert.ok(!html.includes('<details'));
  assert.ok(!html.includes('checked=""'));
  assert.ok(!html.includes('Li e aceito os'));
});

test('an optional profile review offers an exit without recording or preselecting consent', () => {
  const html = renderWelcome(true);
  assert.ok(html.includes('Voltar ao perfil'));
  assert.ok(html.includes('Li e aceito os'));
  assert.ok(!html.includes('checked=""'));
  assert.ok(!html.includes('Simular o aceite'));
});
