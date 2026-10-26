'use client';
import { useEffect, useState } from 'react';
import { Bell, Check, ArrowRight, Radio } from 'lucide-react';
import { POST_ELECTION_DAY } from '@/lib/election-night';
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
  onPrepare,
}: {
  notification: string;
  serviceReady: boolean;
  onEnable: () => Promise<{ ok: boolean; message: string }>;
  onAlerts: () => void;
  onPrepare?: () => void;
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
  const postElection = now !== null && now >= POST_ELECTION_DAY;
  return (
    <div className="live-wait">
      <span className="live-date">
        {postElection ? (
          '2º TURNO · VOTAÇÃO EM 25/10/2026'
        ) : now === null ? (
          'ELEIÇÕES 2026'
        ) : (
          <>
            25 OUT 2026 <i /> DOMINGO · 17H · BRASÍLIA
          </>
        )}
      </span>
      <h2>
        {now === null || postElection
          ? 'Consultando o resultado oficial.'
          : now >= resultsStart
            ? 'Aguardando os primeiros votos.'
            : onPrepare
              ? 'Contagem para a apuração.'
              : 'O próximo capítulo tem hora marcada.'}
      </h2>
      <p>
        {now === null || postElection
          ? 'Buscando o boletim do segundo turno no TSE. Se a fonte não responder, tente novamente.'
          : now >= resultsStart
            ? 'A votação terminou no horário previsto. Os resultados aparecerão quando o TSE começar a divulgá-los.'
            : 'A divulgação começa após o encerramento da votação. Acompanhe desde os primeiros resultados.'}
      </p>
      {now !== null && now < resultsStart ? (
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
        {notification === 'Ativadas' || onPrepare ? (
          <button className="button primary" onClick={onPrepare || onAlerts}>
            {notification === 'Ativadas' ? <Check size={17} /> : <Bell size={17} />}
            {onPrepare ? 'Escolher meus alertas' : 'Escolher alertas'}
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
        {message || 'Os avisos seguem as categorias que você escolher neste aparelho.'}
      </p>
      <a
        className="source"
        href={
          postElection
            ? 'https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6258'
            : 'https://www.tse.jus.br/comunicacao/noticias/2026/Agosto/resultados-das-eleicoes-2026-poderao-ser-acompanhados-em-tempo-real'
        }
        target="_blank"
        rel="noreferrer"
      >
        {postElection
          ? 'Consultar resultado oficial no TSE'
          : 'Horário previsto de divulgação · TSE'}
      </a>
    </div>
  );
}
