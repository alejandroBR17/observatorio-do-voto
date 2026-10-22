'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ThumbsDown, ThumbsUp } from 'lucide-react';
import { buildDiscoveries, discoveryReason } from '@/lib/discoveries';
import {
  discoveryFeedbackKey,
  rankDiscoveries,
  type Discovery,
  type LearningState,
} from '@/lib/personalization';
import { PersonalizationChoices, usePersonalization } from './personalization';

export function SmartDiscoveries({
  onExplore,
  publishedAt,
}: {
  onExplore: (item: Discovery) => void;
  publishedAt?: string;
}) {
  const { state, ready } = usePersonalization();
  const [choosing, setChoosing] = useState(false);
  if (!ready)
    return (
      <aside className="learning-offer" aria-busy="true">
        <p>Preparando seu espaço de exploração…</p>
      </aside>
    );
  if (!state.enabled || choosing)
    return (
      <aside className="learning-offer">
        <div>
          <strong>Um observatório mais próximo dos seus interesses</strong>
          <p>
            Escolha se quer adaptar sugestões, notícias e detalhes ao seu uso. Você pode pausar e
            apagar no Perfil.
          </p>
        </div>
        <button
          className="button secondary"
          aria-expanded={choosing}
          onClick={() => setChoosing(!choosing)}
        >
          {choosing ? 'Concluir escolhas' : 'Adaptar ao meu uso'}
        </button>
        {choosing && <PersonalizationChoices />}
      </aside>
    );
  return (
    <section className="smart-discoveries" aria-label="Sugestões para explorar">
      <div className="panel-head">
        <div>
          <span className="eyebrow">SEU PRÓXIMO OLHAR</span>
          <h2>Para explorar agora</h2>
        </div>
        <button className="button secondary" onClick={() => setChoosing(true)}>
          Minhas escolhas
        </button>
      </div>
      <DiscoverySession initial={state} onExplore={onExplore} publishedAt={publishedAt} />
    </section>
  );
}
function DiscoverySession({
  initial,
  publishedAt,
  onExplore,
}: {
  initial: LearningState;
  publishedAt?: string;
  onExplore: (item: Discovery) => void;
}) {
  const { state, correct, seen, storageError } = usePersonalization();
  // Keep this set stable while reading and giving feedback; re-rank on the next visit.
  const [items, setItems] = useState(() =>
    rankDiscoveries(initial, buildDiscoveries(initial, publishedAt)),
  );
  const presented = useRef(false);
  useEffect(() => {
    if (!presented.current)
      setItems(rankDiscoveries(initial, buildDiscoveries(initial, publishedAt)));
  }, [initial, publishedAt]);
  const [feedback, setFeedback] = useState<Record<string, number>>({});
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node || !items.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (document.visibilityState !== 'visible') return;
        const shown = entries.filter((entry) => entry.isIntersecting);
        if (shown.length) presented.current = true;
        const ids = shown
          .map((entry) => entry.target.getAttribute('data-discovery-id'))
          .filter((id): id is string => !!id);
        if (ids.length) seen(ids);
        for (const entry of shown) observer.unobserve(entry.target);
      },
      { threshold: 0.3 },
    );
    for (const card of node.querySelectorAll('[data-discovery-id]')) observer.observe(card);
    return () => observer.disconnect();
  }, [items, seen]);
  function respond(item: Discovery, direction: -1 | 0 | 1) {
    presented.current = true;
    correct(discoveryFeedbackKey(item), direction);
    setFeedback((old) => ({ ...old, [item.id]: direction }));
  }
  return (
    <div ref={root}>
      <p className="fine">
        As sugestões aprendem com seu uso neste aparelho. “Mais disso” e “Menos disso” são ajustes
        opcionais. No Perfil, você escolhe se quer adaptar também notícias e alertas.
      </p>
      <div className="discovery-grid">
        {items.map((item) => {
          const choice = state.corrections[discoveryFeedbackKey(item)]?.value || 0;
          return (
            <article className="discovery-card" key={item.id} data-discovery-id={item.id}>
              <small>{discoveryReason(state, item)}</small>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <button className="button secondary" onClick={() => onExplore(item)}>
                Explorar <ArrowUpRight size={16} aria-hidden="true" />
              </button>
              <div
                className="discovery-feedback"
                role="group"
                aria-label={`Ajustar sugestões: ${item.title}`}
              >
                <button
                  aria-label={`Mais sugestões sobre: ${item.title}`}
                  aria-pressed={choice === 1}
                  onClick={() => respond(item, 1)}
                >
                  <ThumbsUp size={15} aria-hidden="true" />
                  Mais disso
                </button>
                <button
                  aria-label={`Menos sugestões sobre: ${item.title}`}
                  aria-pressed={choice === -1}
                  onClick={() => respond(item, -1)}
                >
                  <ThumbsDown size={15} aria-hidden="true" />
                  Menos disso
                </button>
              </div>
              {!!feedback[item.id] && !!choice && (
                <p role="status" className="fine">
                  {choice === 1
                    ? 'Vamos priorizar este assunto nas próximas sugestões.'
                    : 'Este assunto ficará fora das próximas sugestões.'}{' '}
                  <button className="text-button" onClick={() => respond(item, 0)}>
                    Desfazer
                  </button>
                </p>
              )}
            </article>
          );
        })}
      </div>
      {!items.length && (
        <p>
          As sugestões recentes já foram apresentadas ou reduzidas pelas suas escolhas. Você
          continua com acesso a todas as áreas pela navegação. No Perfil, pode apagar o aprendizado
          para recomeçar.
        </p>
      )}
      {storageError && (
        <p className="fine" role="status">
          Não foi possível salvar o ajuste. Ele vale apenas nesta visita.
        </p>
      )}
    </div>
  );
}
