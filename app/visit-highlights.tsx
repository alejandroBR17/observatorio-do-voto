'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, BellDot } from 'lucide-react';
import { importantUpdates, type ImportantLive } from '@/lib/important-updates';
import { formatDate } from '@/lib/presentation';
import type { PollResponse } from '@/lib/polls/types';
import type { RemoteData } from './hooks/use-remote';
import type { UpdateItem } from '@/lib/recent-updates';

export function VisitHighlights({
  polls,
  live,
  onGo,
}: {
  polls: RemoteData<PollResponse> | null;
  live: ImportantLive;
  onGo: (tab: string) => void;
}) {
  const baseline = useRef<string[] | null | undefined>(undefined);
  const [state, setState] = useState<{
    ready: boolean;
    returning: boolean;
    unavailable: boolean;
    items: UpdateItem[];
  }>({ ready: false, returning: false, unavailable: false, items: [] });
  useEffect(() => {
    if (baseline.current === undefined) {
      try {
        const saved = JSON.parse(
          localStorage.getItem('observatorio.importantVisit.v1') ||
            localStorage.getItem('observatorio.lastVisit') ||
            'null',
        );
        baseline.current = Array.isArray(saved?.ids)
          ? saved.ids.filter((id: unknown): id is string => typeof id === 'string').slice(0, 500)
          : null;
      } catch {
        baseline.current = null;
      }
    }
    if (!polls || polls.status === 'loading') return;
    if (polls.status === 'unavailable' || polls.status === 'stale' || polls.stale) {
      setState({ ready: true, returning: !!baseline.current, unavailable: true, items: [] });
      return;
    }
    const all = importantUpdates(polls, live);
    const unseen = baseline.current
      ? all.filter((item) => !baseline.current!.includes(item.id))
      : all;
    setState({ ready: true, returning: !!baseline.current, unavailable: false, items: unseen });
    try {
      localStorage.setItem(
        'observatorio.importantVisit.v1',
        JSON.stringify({
          at: new Date().toISOString(),
          ids: [...new Set([...all.map((item) => item.id), ...(baseline.current || [])])].slice(
            0,
            500,
          ),
        }),
      );
    } catch {
      /* The summary remains available without storage. */
    }
  }, [polls, live]);
  const phase = state.items.find((item) => item.kind === 'Apuração');
  const pollsNew = state.items.filter((item) => item.kind === 'Pesquisa');
  return (
    <section className="or-visit" aria-label="Principais novidades" aria-busy={!state.ready}>
      <div className="or-visit-label">
        <BellDot size={18} />
        <span>{state.returning ? 'Desde sua última visita' : 'Principal agora'}</span>
      </div>
      {!state.ready ? (
        <p className="or-visit-loading" role="status">
          Verificando novas pesquisas e marcos da apuração…
        </p>
      ) : state.unavailable ? (
        <p role="status">
          Não foi possível verificar as novidades agora.{' '}
          <button className="or-link" onClick={() => onGo('polls')}>
            Consultar pesquisas <ArrowRight size={15} />
          </button>
        </p>
      ) : (
        <div className="or-visit-items">
          {phase && (
            <button className="or-visit-item" onClick={() => onGo('live')}>
              <strong>{phase.title}</strong>
              <ArrowRight size={17} />
            </button>
          )}
          {pollsNew.length > 0 && (
            <button className="or-visit-item" onClick={() => onGo('polls')}>
              <div>
                <strong>
                  {state.returning
                    ? `${pollsNew.length} ${pollsNew.length === 1 ? 'nova pesquisa confirmada' : 'novas pesquisas confirmadas'}`
                    : 'Pesquisa mais recente'}
                </strong>
                <span>
                  {pollsNew[0].title} · {formatDate(pollsNew[0].date)}
                  {state.returning && pollsNew.length > 1 ? ' e outros levantamentos' : ''}
                </span>
              </div>
              <ArrowRight size={17} />
            </button>
          )}
          {!phase && !pollsNew.length && (
            <p className="or-visit-current">
              <Check size={17} />
              {state.returning
                ? 'Você está em dia. Nenhuma nova pesquisa ou mudança importante na apuração.'
                : 'Novas pesquisas confirmadas e marcos da apuração aparecerão aqui.'}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
