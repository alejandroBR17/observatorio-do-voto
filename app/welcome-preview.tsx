'use client';
import { useState } from 'react';
import { Onboarding } from './onboarding';
import { ReadingProvider } from './reading';
export function WelcomePreview() {
  const [open, setOpen] = useState(true);
  return (
    <ReadingProvider>
      <main className="welcome-preview-page">
        <span className="eyebrow">OBSERVATÓRIO DO VOTO · PRÉVIA</span>
        <h1>Boas-vindas ao observatório.</h1>
        <p>
          Revise as etapas de personalização. Esta demonstração não salva escolhas nem ativa
          serviços.
        </p>
        <button className="button primary" onClick={() => setOpen(true)}>
          Reabrir boas-vindas
        </button>
        <a className="button secondary" href="/identidade?tab=live">
          Voltar à Apuração
        </a>
      </main>
      {open && (
        <Onboarding
          observatory
          reviewOnly
          nickname=""
          favorite=""
          notification="Desativadas"
          serviceReady={false}
          serviceMessage="Ativação de notificações desativada nesta prévia visual."
          consentAccepted={false}
          onConsent={() => {}}
          onFinish={() => false}
          onEnable={async () => ({ ok: false, message: 'Prévia visual.' })}
          onDismiss={() => setOpen(false)}
        />
      )}
    </ReadingProvider>
  );
}
