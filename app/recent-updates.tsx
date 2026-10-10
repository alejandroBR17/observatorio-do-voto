'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Newspaper } from 'lucide-react';
import { updateItems, type UpdateItem } from '@/lib/recent-updates';
export function RecentUpdates({ onGo }: { onGo: (destination: string) => void }) {
  const [items, setItems] = useState<UpdateItem[]>([]),
    [returning, setReturning] = useState(false),
    [checked, setChecked] = useState(''),
    [empty, setEmpty] = useState(false);
  useEffect(() => {
    let canceled = false,
      timer: ReturnType<typeof setTimeout>,
      attempt = 0;
    let baseline: { ids: string[]; at: string } | null = null;
    try {
      const saved = JSON.parse(localStorage.getItem('observatorio.lastVisit') || 'null');
      if (Array.isArray(saved?.ids) && typeof saved.at === 'string') baseline = saved;
    } catch {}
    const run = async () => {
      try {
        const responses = await Promise.all([fetch('/api/polls'), fetch('/api/media')]);
        if (responses.some((r) => !r.ok)) return;
        const [polls, media] = await Promise.all(responses.map((r) => r.json()));
        if (canceled) return;
        if ([polls, media].some((d) => d.status === 'loading')) {
          if (attempt++ < 10) timer = setTimeout(run, 2000);
          return;
        }
        if (
          [polls, media].some((d) => d.status === 'unavailable' || d.status === 'stale' || d.stale)
        )
          return;
        const all = updateItems(polls, media);
        if (!all.length) return;
        const fresh = baseline ? all.filter((x) => !baseline!.ids.includes(x.id)) : all;
        setReturning(!!baseline);
        setItems(fresh.slice(0, 3));
        setEmpty(!!baseline && !fresh.length);
        setChecked(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        try {
          localStorage.setItem(
            'observatorio.lastVisit',
            JSON.stringify({
              at: new Date().toISOString(),
              ids: [...new Set([...all.map((x) => x.id), ...(baseline?.ids || [])])].slice(0, 500),
            }),
          );
        } catch {}
      } catch {}
    };
    void run();
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, []);
  if (!items.length && !empty) return null;
  return (
    <section className="recent-updates panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">{returning ? 'DESDE SUA ÚLTIMA VISITA' : 'PARA COMEÇAR'}</span>
          <h2>{returning ? 'O que mudou por aqui?' : 'As últimas publicações.'}</h2>
        </div>
        <Newspaper size={22} />
      </div>
      {empty ? (
        <p>Nenhuma publicação nova identificada desde sua última visita neste navegador.</p>
      ) : (
        <div className="recent-list">
          {items.map((item) => (
            <button key={item.id} onClick={() => onGo(item.destination)}>
              <span className="eyebrow">
                {item.kind} ·{' '}
                {new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
              </span>
              <strong>{item.title}</strong>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
      )}
      <small>
        Fontes consultadas nesta visita às {checked}. Abra a seção para conferir a publicação
        original.
      </small>
    </section>
  );
}
