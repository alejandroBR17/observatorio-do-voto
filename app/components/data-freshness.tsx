'use client';
import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';

export function DataFreshness({
  checkedAt,
  generated,
  archived = false,
  stale = false,
  unavailable = false,
}: {
  checkedAt?: string;
  generated?: string;
  archived?: boolean;
  stale?: boolean;
  unavailable?: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const stamp = checkedAt ? Date.parse(checkedAt) : NaN;
  const minutes =
    now !== null && Number.isFinite(stamp) ? Math.max(0, Math.floor((now - stamp) / 60000)) : null;
  const relative =
    minutes === null
      ? 'Consulta em andamento'
      : minutes < 1
        ? 'Verificado agora'
        : minutes < 60
          ? `Verificado há ${minutes} min`
          : minutes < 1440
            ? `Verificado há ${Math.floor(minutes / 60)} h`
            : `Verificado em ${new Date(stamp).toLocaleDateString('pt-BR')}`;
  const label = archived
    ? 'Resultado do acervo oficial'
    : unavailable
      ? 'Fonte temporariamente indisponível'
      : stale
        ? 'Exibindo a última consulta disponível'
        : relative;
  return (
    <details className={`data-freshness${stale || unavailable ? ' is-stale' : ''}`}>
      <summary>
        <Clock3 size={13} aria-hidden="true" />
        {label}
      </summary>
      <div>
        {generated && <p>Dados da fonte: {generated}</p>}
        {Number.isFinite(stamp) && (
          <p>
            {archived ? 'Importado' : 'Última consulta'} em{' '}
            {new Date(stamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília).
          </p>
        )}
        {!archived && (
          <p>A consulta verifica a fonte; a data de publicação dos dados pode ser anterior.</p>
        )}
      </div>
    </details>
  );
}
