'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { ArrowUpRight, BookmarkPlus, Check, Radio, ShieldCheck } from 'lucide-react';
import { debateCoverage, debatePublicationTime, type DebatePhase } from '@/lib/debate';
import type { MediaArticle } from '@/lib/media-types';
import type { DebateContext, DebateVideo } from '@/lib/debate-context';
import { Source } from './components/source-link';
import { DataFreshness } from './components/data-freshness';

const EMPTY: MediaArticle[] = [];
const time = (value: string | number) =>
  new Date(value).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
export function DebatePlayer({ video }: { video: DebateVideo }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="debate-official-player">
      {loaded && video.embedUrl ? (
        <>
          <iframe
            src={video.embedUrl}
            title={video.title}
            allow="fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <button className="text-button" onClick={() => setLoaded(false)}>
            Fechar o vídeo
          </button>
        </>
      ) : video.embedUrl ? (
        <button className="button primary" onClick={() => setLoaded(true)}>
          Carregar player oficial
        </button>
      ) : null}
      <a className="button secondary" href={video.watchUrl} target="_blank" rel="noreferrer">
        Abrir vídeo na Globo <ArrowUpRight size={16} />
      </a>
      <p>
        Ao carregar, você se conecta à Globo. O vídeo segue as condições da emissora. Se não
        carregar aqui, abra na fonte.
      </p>
    </div>
  );
}

export function DebateCompanion({
  articles = EMPTY,
  context,
  phase,
  loading,
  checkedAt,
  stale,
  onMark,
}: {
  articles?: MediaArticle[];
  context?: Partial<DebateContext> | null;
  phase: DebatePhase;
  loading: boolean;
  checkedAt?: string | null;
  stale?: boolean;
  onMark: () => void;
}) {
  const items = useMemo(() => debateCoverage(articles), [articles]);
  const [feed, setFeed] = useState<MediaArticle[] | null>(null);
  const [previousVisit, setPreviousVisit] = useState(0);
  const [recap, setRecap] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);
  const known = useRef(new Set<string>());
  const initialized = useRef(false);
  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem('observatorio.debate.lastVisit'));
      if (Number.isFinite(stored) && stored > 0 && stored <= Date.now()) setPreviousVisit(stored);
    } catch {
      /* Storage is optional. */
    }
    setReady(true);
    const remember = () => {
      try {
        localStorage.setItem('observatorio.debate.lastVisit', String(Date.now()));
      } catch {
        /* Optional. */
      }
    };
    window.addEventListener('pagehide', remember);
    return () => {
      remember();
      window.removeEventListener('pagehide', remember);
    };
  }, []);
  useEffect(() => {
    if (loading || initialized.current) return;
    initialized.current = true;
    known.current = new Set(items.map((a) => a.url));
    setFeed(items);
  }, [items, loading]);
  const pending = initialized.current ? items.filter((a) => !known.current.has(a.url)) : [];
  const returning = previousVisit > Date.parse('2026-10-19T00:00:00-03:00');
  const recapItems = (
    returning ? items.filter((a) => debatePublicationTime(a.publishedAt) > previousVisit) : items
  ).slice(0, 4);
  // Refresh publisher corrections in place without inserting new rows during reading.
  const latestByUrl = new Map(articles.map((article) => [article.url, article]));
  const visible = (recap ? recapItems : feed || [])
    .map((article) => latestByUrl.get(article.url) || article)
    .slice(0, expanded ? 12 : 3);
  return (
    <MotionConfig reducedMotion="user">
      <section
        className="debate-companion debate-panel"
        id="debate-acompanhar"
        aria-labelledby="debate-companion-title"
      >
        <header>
          <div>
            <span className="or-overline">
              <Radio size={14} /> SEU ACOMPANHAMENTO
            </span>
            <h2 id="debate-companion-title">
              {phase === 'before'
                ? 'Prepare seu olhar.'
                : phase === 'after'
                  ? 'Reveja o que foi publicado.'
                  : 'O contexto acompanha você.'}
            </h2>
            <p>
              {phase === 'before'
                ? 'Conheça as propostas e acompanhe as publicações que preparam o encontro.'
                : 'Publicações com fonte e horário. A cobertura chega quando os veículos publicam; não é uma transcrição do vídeo.'}
            </p>
          </div>
          <DataFreshness checkedAt={checkedAt} stale={stale} />
        </header>
        <div className="debate-phase-path" aria-label="Momento da página">
          {(['before', 'scheduled', 'after'] as const).map((p) => (
            <span key={p} aria-current={phase === p ? 'step' : undefined}>
              {phase === p && <Check size={14} />}
              {
                {
                  before: 'Antes · preparar',
                  scheduled: 'Durante · acompanhar',
                  after: 'Depois · rever',
                }[p]
              }
            </span>
          ))}
        </div>
        <p className="debate-small">
          {phase === 'scheduled'
            ? 'A página está no modo de acompanhamento pelo horário previsto. Isso não confirma que o vídeo já começou.'
            : phase === 'after'
              ? 'Este é o modo de retrospectiva da programação. Os horários e as conclusões continuam atribuídos às fontes.'
              : 'A página muda de apresentação automaticamente no horário previsto; o início do vídeo depende da emissora.'}
        </p>
        <div className="debate-companion-actions">
          <button
            className="button secondary"
            aria-pressed={recap}
            onClick={() => {
              setRecap(!recap);
              setExpanded(false);
            }}
          >
            {recap
              ? 'Voltar às publicações'
              : ready && returning
                ? 'O que mudou desde que saí?'
                : 'Cheguei agora · por onde começar?'}
          </button>
          {phase !== 'before' && (
            <button className="button secondary" onClick={onMark}>
              <BookmarkPlus size={16} />
              Marcar este momento no caderno
            </button>
          )}
        </div>
        {recap && (
          <p className="debate-small">
            {returning
              ? 'Publicações recebidas desde a sua última passagem por esta página.'
              : 'Um ponto de partida com as publicações mais recentes.'}{' '}
            São manchetes dos veículos, com acesso ao texto completo.
          </p>
        )}
        {pending.length > 0 && (
          <div className="debate-pending-updates" role="status">
            <span>
              {pending.length}{' '}
              {pending.length === 1
                ? 'nova publicação disponível'
                : 'novas publicações disponíveis'}
            </span>
            <button
              className="button primary"
              onClick={() => {
                known.current = new Set(items.map((a) => a.url));
                setFeed(items);
                setRecap(false);
              }}
            >
              Mostrar novidades
            </button>
          </div>
        )}
        {loading ? (
          <p role="status">Consultando as fontes…</p>
        ) : visible.length ? (
          <motion.ol className="debate-update-list" layout="position">
            {visible.map((article) => (
              <motion.li
                key={article.url}
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <span className="debate-update-time">
                  {time(debatePublicationTime(article.publishedAt))}
                  <small>
                    {new Date(debatePublicationTime(article.publishedAt)).toLocaleDateString(
                      'pt-BR',
                      { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' },
                    )}
                  </small>
                </span>
                <div>
                  <span>{article.source}</span>
                  <a href={article.url} target="_blank" rel="noreferrer">
                    {article.title}
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        ) : (
          <p className="debate-small">
            {recap && returning
              ? 'Nenhuma nova publicação encontrada desde a sua última visita.'
              : 'As publicações do encontro aparecerão aqui quando forem identificadas nas fontes.'}
          </p>
        )}
        {!recap && (feed?.length || 0) > 3 && (
          <button
            className="button secondary"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Ver menos atualizações' : 'Ver mais atualizações'}
          </button>
        )}
        <p className="debate-small">
          Atualização automática nesta página a cada 30 segundos. A coleta compartilhada consulta as
          fontes a cada minuto durante a faixa do debate e a cada cinco minutos fora dela. O veículo
          pode publicar com atraso. Horários de Brasília.
        </p>
        <details className="debate-disclosure debate-verified-claims">
          <summary>
            <ShieldCheck size={18} />
            Checagens publicadas pelas fontes<span aria-hidden="true">+</span>
          </summary>
          <div>
            {context?.checks?.length ? (
              context.checks.map((check) => (
                <article className="debate-claim" key={check.url + check.claim}>
                  <span>
                    {check.source} · {time(debatePublicationTime(check.publishedAt))}
                  </span>
                  <h3>{check.claim}</h3>
                  <p>
                    <strong>Conclusão da fonte: {check.verdict}</strong>
                  </p>
                  <Source href={check.url}>Ler evidências e conclusão original</Source>
                </article>
              ))
            ) : (
              <p>
                Ainda não há checagens estruturadas deste encontro identificadas nesta consulta. Uma
                fala sem checagem não é automaticamente verdadeira nem falsa.
              </p>
            )}
            <p>
              O Observatório mostra a conclusão do veículo quando ela vem identificada na
              publicação. Não produz vereditos automáticos sobre as falas.
            </p>
            <Source href="https://g1.globo.com/fato-ou-fake/">Fato ou Fake · g1</Source>
            <Source href="https://noticias.uol.com.br/confere/">UOL Confere</Source>
            {context?.status !== 'ready' && (
              <p className="fine">
                A consulta de checagens está temporariamente limitada. Os links das fontes continuam
                disponíveis.
              </p>
            )}
          </div>
        </details>
      </section>
    </MotionConfig>
  );
}
