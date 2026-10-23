'use client';

import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import type { AlertPreferences } from '@/lib/alerts';
import { debateAlertPreferences } from '@/lib/debate-alerts';
import { PushConsent } from './components/privacy-consent';

export function DebateAlerts({
  prefs,
  notification,
  consentAccepted,
  onConsent,
  onEnable,
  onPrefs,
  serviceReady,
  serviceMessage,
  onRetry,
  reminderExpired,
  onClose,
  reviewOnly,
  syncMessage,
}: {
  prefs: AlertPreferences;
  notification: string;
  consentAccepted: boolean;
  onConsent: (value: boolean) => void;
  onEnable: (prefs: AlertPreferences) => Promise<{ ok: boolean; message: string }>;
  onPrefs: (prefs: AlertPreferences) => Promise<void>;
  serviceReady: boolean;
  serviceMessage?: string;
  syncMessage?: string;
  onRetry: () => void;
  reminderExpired: boolean;
  onClose: () => void;
  reviewOnly: boolean;
}) {
  const subscribed = notification === 'Ativadas';
  const [reminder, setReminder] = useState(!reminderExpired && prefs.debate);
  const [live, setLive] = useState(prefs.debateLive);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const wantsAlerts = live || (!reminderExpired && reminder);
  async function save() {
    if (busy || reviewOnly) return;
    setBusy(true);
    setFeedback('');
    try {
      const next = debateAlertPreferences(prefs, subscribed, {
        debate: !reminderExpired && reminder,
        debateLive: live,
      });
      if (!wantsAlerts) {
        await onPrefs(next);
        setFeedback(
          'Escolhas salvas neste aparelho. Aguardando a sincronização para interromper os avisos do debate.',
        );
      } else {
        const result = await onEnable(next);
        setFeedback(
          result.ok
            ? 'Pronto! Você receberá somente os avisos que escolheu. Pode mudar aqui quando quiser.'
            : result.message,
        );
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="debate-reminder debate-alert-panel"
      id="debate-reminder"
      aria-labelledby="debate-alerts-title"
    >
      <header>
        <span className="or-overline">
          <Bell size={14} /> AVISOS DESTE DEBATE
        </span>
        <button
          className="button secondary"
          onClick={onClose}
          aria-label="Fechar escolhas de avisos"
        >
          <X size={16} /> Fechar
        </button>
      </header>
      <h2 id="debate-alerts-title" tabIndex={-1}>
        Acompanhe sem ficar esperando.
      </h2>
      <p>
        Escolha o que receber neste aparelho, mesmo com a página fechada. A entrega depende da
        conexão e da permissão do navegador.
      </p>
      <fieldset disabled={busy || reviewOnly}>
        <legend className="sr-only">Quais avisos do debate você quer receber?</legend>
        {!reminderExpired && (
          <label className="debate-alert-option">
            <input
              type="checkbox"
              checked={reminder}
              onChange={(e) => setReminder(e.target.checked)}
            />
            <span>
              <strong>Um lembrete antes</strong>
              <small>Hoje, próximo das 21h05. O debate está previsto para 21h20.</small>
            </span>
          </label>
        )}
        <label className="debate-alert-option">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          <span>
            <strong>Início, encerramento e avisos importantes</strong>
            <small>
              Confirmações do acompanhamento e atualizações selecionadas. Cada notícia não vira uma
              notificação.
            </small>
          </span>
        </label>
      </fieldset>
      {reviewOnly ? (
        <p>Prévia visual: nenhuma inscrição ou notificação será enviada.</p>
      ) : (
        <>
          {wantsAlerts && !consentAccepted && (
            <PushConsent checked={consentAccepted} onChange={onConsent} />
          )}
          <div className="debate-companion-actions">
            <button
              className="button primary"
              onClick={() => void save()}
              disabled={
                busy ||
                (!subscribed && !wantsAlerts) ||
                (wantsAlerts && (!serviceReady || !consentAccepted))
              }
            >
              {busy
                ? 'Salvando…'
                : subscribed
                  ? 'Salvar escolhas do debate'
                  : 'Ativar avisos escolhidos'}
            </button>
            {!serviceReady && wantsAlerts && (
              <button className="button secondary" onClick={onRetry}>
                Tentar conectar novamente
              </button>
            )}
          </div>
          {!serviceReady && wantsAlerts && (
            <p className="fine">
              {serviceMessage ||
                'Conectando ao serviço de notificações. No iPhone, os avisos exigem o app instalado na tela inicial.'}
            </p>
          )}
        </>
      )}
      {feedback && (
        <p className="debate-feedback" role="status">
          {feedback}
        </p>
      )}
      {feedback && syncMessage && (
        <p className="fine" role="status">
          {syncMessage}
        </p>
      )}
      <p className="fine">
        Estas escolhas valem apenas para o debate. Você não precisa conhecer ou configurar o
        restante do Observatório.
      </p>
    </section>
  );
}
