'use client';
import { useEffect, useId, useState } from 'react';
import { ArrowUpRight, Newspaper, CircleCheck, Compass, ChartNoAxesCombined } from 'lucide-react';
import { updateItems, type UpdateItem } from '@/lib/recent-updates';
export function RecentUpdates({ onGo }: { onGo: (destination: string) => void }) {
  const [items, setItems] = useState<UpdateItem[]>([]),
    [returning, setReturning] = useState(false),
    [checked, setChecked] = useState(''),
    [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading'),
    [retry, setRetry] = useState(0);
  const titleId = useId();
  useEffect(() => {
    let canceled = false,
      timer: ReturnType<typeof setTimeout>,
      attempt = 0;
    let activeRequest: AbortController | undefined;
    let baseline: { ids: string[]; at: string } | null = null;
    try {
      const saved = JSON.parse(localStorage.getItem('observatorio.lastVisit') || 'null');
      if (Array.isArray(saved?.ids) && typeof saved.at === 'string') baseline = saved;
    } catch {
      // Without a readable baseline, show the latest items as a first visit.
    }
    setReturning(!!baseline);
    const run = async () => {
      if (canceled) return;
      const controller = new AbortController();
      activeRequest = controller;
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const responses = await Promise.all([
          fetch('/api/polls', { signal: controller.signal }),
          fetch('/api/media', { signal: controller.signal }),
        ]);
        if (responses.some((r) => !r.ok)) throw new Error('Source unavailable');
        const [polls, media] = await Promise.all(responses.map((r) => r.json()));
        if (canceled) return;
        if ([polls, media].some((d) => d.status === 'loading')) {
          if (attempt++ < 10) timer = setTimeout(run, 2000);
          else setStatus('unavailable');
          return;
        }
        if (
          [polls, media].some((d) => d.status === 'unavailable' || d.status === 'stale' || d.stale)
        )
          throw new Error('Source not current');
        const all = updateItems(polls, media);
        const fresh = baseline ? all.filter((x) => !baseline!.ids.includes(x.id)) : all;
        setReturning(!!baseline);
        setItems(fresh.slice(0, 3));
        setStatus('ready');
        setChecked(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        try {
          localStorage.setItem(
            'observatorio.lastVisit',
            JSON.stringify({
              at: new Date().toISOString(),
              ids: [...new Set([...all.map((x) => x.id), ...(baseline?.ids || [])])].slice(0, 500),
            }),
          );
        } catch {
          // Keep showing updates even when the visit baseline cannot be saved.
        }
      } catch {
        if (!canceled) setStatus('unavailable');
      } finally {
        clearTimeout(timeout);
        controller.abort();
      }
    };
    void run();
    return () => {
      canceled = true;
      activeRequest?.abort();
      clearTimeout(timer);
    };
  }, [retry]);
  return (
    <section
      className="recent-updates panel"
      aria-labelledby={titleId}
      aria-busy={status === 'loading'}
    >
      <div className="panel-head">
        <div>
          <span className="eyebrow">
            {returning ? 'DESDE SUA ÚLTIMA VISITA' : 'NO RADAR / ÚLTIMAS PUBLICAÇÕES'}
          </span>
          <h2 id={titleId}>O que entrou no radar.</h2>
        </div>
        <Newspaper size={22} />
      </div>
      <div className="recent-content">
        {status === 'loading' ? (
          <div className="recent-list recent-skeleton" aria-hidden="true">
            {[0, 1, 2].map((key) => (
              <div className="recent-placeholder" key={key}>
                <i />
                <i />
                <i />
              </div>
            ))}
          </div>
        ) : status === 'unavailable' ? (
          <div className="recent-state">
            <p>
              Não conseguimos consultar as novidades agora. Você pode continuar explorando o
              Observatório.
            </p>
            <button
              className="button secondary"
              onClick={() => {
                setStatus('loading');
                setRetry((n) => n + 1);
              }}
            >
              Tentar novamente
            </button>
          </div>
        ) : !items.length ? (
          <div className="recent-empty">
            <div className="recent-empty-copy">
              <div className="recent-empty-heading">
                <span className="recent-empty-icon" aria-hidden="true">
                  {returning ? <CircleCheck size={23} /> : <Compass size={23} />}
                </span>
                <h3>{returning ? 'Você está em dia.' : 'Explore a eleição.'}</h3>
              </div>
              <p>
                {returning
                  ? 'Nenhuma novidade identificada desde sua última visita. Enquanto isso, continue explorando.'
                  : 'Ainda não há destaques para mostrar. Conheça as pesquisas e acompanhe a cobertura.'}
              </p>
            </div>
            <div className="recent-empty-actions" role="group" aria-label="Explorar a eleição">
              <button className="button secondary" onClick={() => onGo('polls')}>
                <ChartNoAxesCombined size={19} aria-hidden="true" />
                <span>
                  <strong>Ver pesquisas</strong>
                  <small>Resultados e publicações</small>
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
              <button className="button secondary" onClick={() => onGo('social')}>
                <Newspaper size={19} aria-hidden="true" />
                <span>
                  <strong>Ler notícias</strong>
                  <small>Cobertura de diferentes veículos</small>
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="recent-list">
            {items.map((item) => (
              <button key={item.id} title={item.title} onClick={() => onGo(item.destination)}>
                <span className="eyebrow">
                  {item.kind} ·{' '}
                  {new Date(item.date).toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                  })}
                </span>
                <strong>{item.title}</strong>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        )}
      </div>
      <small role="status" aria-atomic="true">
        {status === 'loading'
          ? 'Consultando as fontes…'
          : status === 'unavailable'
            ? 'As demais seções continuam disponíveis.'
            : !items.length
              ? `Última consulta às ${checked}.`
              : `Fontes consultadas às ${checked}. Abra um destaque para conferir a origem.`}
      </small>
    </section>
  );
}
