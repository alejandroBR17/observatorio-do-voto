'use client';
import { useEffect, useState } from 'react';
import { Bell, Check, ArrowRight, Radio } from 'lucide-react';
export const resultsStart = Date.parse('2026-10-25T17:00:00-03:00');
export function countdownParts(now: number) {
  const total = Math.max(0, Math.floor((resultsStart - now) / 1000));
  return [
    Math.floor(total / 86400),
    Math.floor(total / 3600) % 24,
    Math.floor(total / 60) % 60,
    total % 60,
  ];
}
export function LiveCountdown({
  notification,
  serviceReady,
  onEnable,
  onAlerts,
}: {
  notification: string;
  serviceReady: boolean;
  onEnable: () => Promise<{ ok: boolean; message: string }>;
  onAlerts: () => void;
}) {
  const [now, setNow] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  async function enable() {
    setBusy(true);
    try {
      const result = await onEnable();
      setMessage(result.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="live-wait">
      <span className="live-date">
        25 OUT 2026 <i /> DOMINGO · 17H · BRASÍLIA
      </span>
      <h2>
        {now !== null && now >= resultsStart
          ? 'Aguardando os primeiros votos.'
          : 'O próximo capítulo tem hora marcada.'}
      </h2>
      <p>
        {now !== null && now >= resultsStart
          ? 'A votação terminou no horário previsto. Os resultados aparecerão quando o TSE começar a divulgá-los.'
          : 'A divulgação começa após o encerramento da votação. Acompanhe desde os primeiros resultados.'}
      </p>
      {now === null || now < resultsStart ? (
        <div
          className="countdown-clock"
          aria-label="Tempo até o horário previsto para divulgação dos resultados"
        >
          {(now === null ? [null, null, null, null] : countdownParts(now)).map((n, i) => (
            <div key={i}>
              <strong>{n === null ? '—' : String(n).padStart(2, '0')}</strong>
              <span>{['dias', 'horas', 'minutos', 'segundos'][i]}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="waiting-signal">
          <Radio size={22} />
          Consultando a fonte oficial a cada 30 segundos
        </div>
      )}
      {notification === 'Ativadas' && (
        <p className="activated-caption">
          <Check size={15} />
          Notificações ativadas neste aparelho
        </p>
      )}
      <div className="live-wait-actions">
        {notification === 'Ativadas' ? (
          <button className="button primary" onClick={onAlerts}>
            <Check size={17} />
            Escolher alertas
            <ArrowRight size={17} />
          </button>
        ) : (
          <button className="button primary" disabled={!serviceReady || busy} onClick={enable}>
            <Bell size={18} />
            {busy ? 'Ativando…' : 'Ativar notificações'}
          </button>
        )}
      </div>
      <p className="fine" role="status">
        {message ||
          'Você pode receber pesquisas agora e os principais acontecimentos da apuração depois.'}
      </p>
      <a
        className="source"
        href="https://www.tse.jus.br/comunicacao/noticias/2026/Agosto/resultados-das-eleicoes-2026-poderao-ser-acompanhados-em-tempo-real"
        target="_blank"
        rel="noreferrer"
      >
        Horário previsto de divulgação · TSE
      </a>
    </div>
  );
}
