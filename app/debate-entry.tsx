'use client';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { candidates } from '@/lib/content';
import type { DebateContext } from '@/lib/debate-context';
import { useRemote } from './hooks/use-remote';
export function DebateEntry({ onOpen }: { onOpen: () => void }) {
  const [visible, setVisible] = useState(true);
  const { data } = useRemote<DebateContext>('/api/debate', 30000);
  const state = data?.editorial?.state || 'planned';
  useEffect(() => {
    const check = () => setVisible(Date.now() < Date.parse('2026-10-26T00:00:00-03:00'));
    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, []);
  if (!visible) return null;
  return (
    <section className="debate-entry debate-event-card" aria-labelledby="debate-entry-title">
      <div className="debate-event-card-portraits" aria-hidden="true">
        {candidates.map((candidate) => (
          <img key={candidate.number} src={candidate.photo} alt="" width="48" height="64" />
        ))}
      </div>
      <div className="debate-event-card-copy">
        <span className="or-overline">ESPECIAL / DEBATE NA GLOBO</span>
        <h2 id="debate-entry-title">
          {state === 'live'
            ? 'O debate está em andamento.'
            : state === 'ended'
              ? 'O encontro terminou. O contexto continua.'
              : 'O debate, com contexto.'}
        </h2>
        <p>
          Lula e Flávio: propostas lado a lado, publicações e fontes para acompanhar o encontro.
        </p>
        <span className="debate-event-card-time">
          {state === 'planned'
            ? '23 OUT · início previsto às 21h20 · Brasília'
            : state === 'live'
              ? 'Início confirmado pelo acompanhamento do Observatório'
              : 'Encerramento confirmado pelo acompanhamento do Observatório'}
        </span>
      </div>
      <button className="button primary" onClick={onOpen}>
        Abrir acompanhamento <ArrowRight size={17} />
      </button>
    </section>
  );
}
