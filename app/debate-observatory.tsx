'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  Clock3,
  MessagesSquare,
  PenLine,
  ShieldCheck,
  Tv,
} from 'lucide-react';
import {
  debate,
  debatePhase,
  debateTopics,
  debatePlans,
  debateCoverage,
  debatePublicationTime,
  debateChecks,
  debateTopic,
  debatePollPeriod,
  type DebateTopic,
} from '@/lib/debate';
import { candidates } from '@/lib/content';
import type { MediaResponse } from '@/lib/media-types';
import type { PollResponse } from '@/lib/polls/types';
import type { NotebookEntry } from '@/lib/notebook';
import type { AlertPreferences } from '@/lib/alerts';
import { useRemote } from './hooks/use-remote';
import { DataFreshness } from './components/data-freshness';
import { ShareButton } from './components/share-button';
import { PushConsent } from './components/privacy-consent';
import { Source } from './components/source-link';
import { NewsVisual } from './news-visual';

function useDebateClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
function DebateClock({ now }: { now: number | null }) {
  const remaining =
    now === null ? null : Math.max(0, Math.floor((Date.parse(debate.startsAt) - now) / 1000));
  const parts =
    remaining === null
      ? [null, null, null]
      : [Math.floor(remaining / 3600), Math.floor(remaining / 60) % 60, remaining % 60];
  return (
    <div
      className="debate-clock"
      role="group"
      aria-label="Contagem até o início previsto do debate"
    >
      {parts.map((part, i) => (
        <div key={i}>
          <strong>{part === null ? '—' : String(part).padStart(2, '0')}</strong>
          <span>{['horas', 'minutos', 'segundos'][i]}</span>
        </div>
      ))}
    </div>
  );
}
export function DebateObservatory({
  prefs,
  notification,
  serviceReady,
  consentAccepted,
  onConsent,
  onEnable,
  onRemoveReminder,
  onAlerts,
  onGo,
  onNote,
  syncMessage,
  reviewOnly = false,
}: {
  prefs: AlertPreferences;
  notification: string;
  serviceReady: boolean;
  consentAccepted: boolean;
  onConsent: (value: boolean) => void;
  onEnable: () => Promise<{ ok: boolean; message: string }>;
  onRemoveReminder: () => void;
  onAlerts: () => void;
  onGo: (tab: string) => void;
  onNote: (note: Pick<NotebookEntry, 'title' | 'body' | 'topic' | 'uf'>) => void;
  syncMessage?: string;
  reviewOnly?: boolean;
}) {
  const now = useDebateClock();
  const phase = now === null ? 'before' : debatePhase(now);
  const { data: media, loading: mediaLoading } = useRemote<MediaResponse>('/api/media', 300000);
  const { data: polls, loading: pollsLoading } = useRemote<PollResponse>('/api/polls', 300000);
  const [topic, setTopic] = useState<DebateTopic>('economia');
  const [more, setMore] = useState(false),
    [reminderOpen, setReminderOpen] = useState(false);
  const [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(''),
    [notes, setNotes] = useState<Partial<Record<DebateTopic, string>>>({});
  const note = notes[topic] || '';
  const current = debateTopics.find((item) => item.id === topic)!;
  const coverage = debateCoverage(media?.articles || [], now || Date.now()).filter(
    (article) =>
      phase !== 'after' ||
      debatePublicationTime(article.publishedAt) >= Date.parse(debate.startsAt),
  );
  const checks = debateChecks(media?.articles || [], now || Date.now());
  const topicCoverage = coverage.filter((article) => debateTopic(article.title) === topic);
  const reminderActive = notification === 'Ativadas' && prefs.debate;
  const reminderExpired = now !== null && now >= Date.parse(debate.reminderExpiresAt);
  const eligiblePolls = (polls?.polls || [])
    .filter((poll) => poll.scope === 'Brasil' && poll.turn === 2)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  async function enableReminder() {
    if (busy || reviewOnly) return;
    setBusy(true);
    try {
      const result = await onEnable();
      setFeedback(
        result.ok
          ? 'Lembrete confirmado neste aparelho. Você pode desativá-lo aqui ou em Alertas.'
          : result.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="debate-page">
      <section className="debate-hero" aria-labelledby="debate-hero-title">
        <div className="debate-hero-copy">
          <span className="or-overline">23 OUT / SEXTA-FEIRA / 21H20 · BRASÍLIA</span>
          <h2 id="debate-hero-title">
            Duas candidaturas.
            <br />
            Mais contexto para a sua escolha.
          </h2>
          <p>
            Compare propostas, entenda os assuntos e acompanhe o que as fontes publicam sobre o
            último debate na Globo antes do segundo turno.
          </p>
          <span className="debate-phase">
            <Clock3 size={16} aria-hidden="true" />
            {phase === 'before'
              ? 'Prepare-se para o encontro'
              : phase === 'scheduled'
                ? 'Horário previsto do debate chegou'
                : 'Reveja o encontro e suas repercussões'}
          </span>
          {phase === 'before' && <DebateClock now={now} />}
          <div className="debate-actions">
            <a className="button primary" href={debate.watchUrl} target="_blank" rel="noreferrer">
              <Tv size={18} />
              {phase === 'after' ? 'Cobertura oficial no g1' : 'Assistir pela fonte oficial'}
              <ArrowUpRight size={16} />
            </a>
            {!reminderExpired && (
              <button
                className="button secondary"
                onClick={() => {
                  setReminderOpen(true);
                  requestAnimationFrame(() =>
                    document.getElementById('debate-reminder')?.scrollIntoView({
                      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                        ? 'auto'
                        : 'smooth',
                      block: 'center',
                    }),
                  );
                }}
              >
                <Bell size={17} />
                {reminderActive ? 'Meu lembrete' : 'Quero ser lembrado'}
              </button>
            )}
          </div>
          <p className="debate-small">
            O link abre o g1. A transmissão e seu horário são definidos pela emissora.
          </p>
          <Source href={debate.scheduleSource}>Data e horário divulgados · UOL</Source>
        </div>
        <div className="debate-contenders" aria-label="Candidatos ao debate">
          {candidates.map((candidate) => (
            <div className={`debate-person person-${candidate.number}`} key={candidate.number}>
              <img src={candidate.photo} alt={candidate.name} width="240" height="300" />
              <div>
                <span>
                  {candidate.party} · {candidate.number}
                </span>
                <strong>{candidate.name}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="debate-tools">
        <nav aria-label="Nesta área">
          <a href="#debate-propostas">Comparar propostas</a>
          <a href="#debate-cobertura">Cobertura e checagens</a>
          <a href="#debate-pesquisas">Pesquisas no tempo</a>
        </nav>
        <ShareButton
          title="Observatório do Debate · Globo, 23/10"
          text="Compare propostas, acompanhe as fontes e prepare seu olhar para o debate."
          url={() => new URL('/debate', location.origin).href}
          label="Compartilhar o debate"
        />
      </div>
      {reminderOpen && !reminderExpired && (
        <section className="debate-reminder" id="debate-reminder" aria-labelledby="reminder-title">
          <div>
            <span className="or-overline">UM AVISO / SUA ESCOLHA</span>
            <h2 id="reminder-title">Lembre de acompanhar.</h2>
            <p>
              Um único lembrete próximo das 21h05 de 23/10. Não depende de deixar o app aberto; a
              entrega depende da conexão e da permissão do aparelho.
            </p>
          </div>
          {reviewOnly ? (
            <p>Prévia: o envio real não está disponível neste modo.</p>
          ) : reminderActive ? (
            <div>
              <p className="debate-confirmed">
                <Check size={18} />
                Lembrete ativado neste aparelho.
              </p>
              <button
                className="button secondary"
                onClick={() => {
                  onRemoveReminder();
                  setFeedback(
                    'Lembrete desmarcado. As outras escolhas de alertas continuam iguais.',
                  );
                }}
              >
                Desativar este lembrete
              </button>
            </div>
          ) : (
            <div>
              {!consentAccepted && <PushConsent checked={consentAccepted} onChange={onConsent} />}
              <button
                className="button primary"
                onClick={() => void enableReminder()}
                disabled={busy || !serviceReady || !consentAccepted}
              >
                <Bell size={17} />
                {busy ? 'Confirmando…' : 'Ativar lembrete neste aparelho'}
              </button>
              {!serviceReady && (
                <p className="fine">
                  Serviço de notificações ainda indisponível.{' '}
                  <button className="text-button" onClick={onAlerts}>
                    Verificar em Alertas
                  </button>
                </p>
              )}
            </div>
          )}
          {(feedback || syncMessage) && (
            <p className="debate-feedback" role="status">
              {feedback || syncMessage}
            </p>
          )}
        </section>
      )}
      <section className="debate-panel" id="debate-propostas" aria-labelledby="proposals-title">
        <header>
          <div>
            <span className="or-overline">01 / ANTES DE OUVIR, COMPARE</span>
            <h2 id="proposals-title">O que cada um propõe?</h2>
            <p>
              Um recorte dos planos registrados no TSE, para consultar antes, durante e depois do
              encontro.
            </p>
          </div>
          <button className="button secondary" onClick={() => onGo('candidates')}>
            <BookOpen size={16} />
            Ver trajetórias
          </button>
        </header>
        <div className="debate-topics" role="group" aria-label="Assunto para comparar">
          {debateTopics.map((item) => (
            <button
              key={item.id}
              aria-pressed={topic === item.id}
              onClick={() => setTopic(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="debate-topic-content" key={topic}>
          <div className="debate-question">
            <MessagesSquare size={23} aria-hidden="true" />
            <div>
              <span>PARA PRESTAR ATENÇÃO</span>
              <h3>{current.question}</h3>
              <p>{current.meaning}</p>
            </div>
          </div>
          <div className="debate-proposals">
            {candidates.map((candidate) => {
              const number = candidate.number as '22' | '13';
              return (
                <article className={`debate-proposal person-${number}`} key={number}>
                  <div className="debate-proposal-identity">
                    <img src={candidate.photo} alt="" width="48" height="58" />
                    <h3>
                      {candidate.name}
                      <small>{candidate.party} · Plano registrado</small>
                    </h3>
                  </div>
                  <p>{current.proposals[number]}</p>
                  <Source href={debatePlans[number]}>
                    Índice do TSE · páginas {current.pages[number]}
                  </Source>
                </article>
              );
            })}
          </div>
          <p className="debate-small">
            Síntese do índice temático do TSE, conferido em 22/10/2026. São propostas de campanha;
            sua presença no plano não significa execução ou resultado comprovado.
          </p>
          <details className="debate-disclosure">
            <summary>
              <PenLine size={17} />
              Guardar uma dúvida sobre {current.name.toLowerCase()}
              <span aria-hidden="true">+</span>
            </summary>
            <div>
              <label htmlFor="debate-note">O que você quer conferir depois?</label>
              <textarea
                id="debate-note"
                rows={3}
                maxLength={8000}
                value={note}
                onChange={(event) =>
                  setNotes((previous) => ({ ...previous, [topic]: event.target.value }))
                }
                placeholder="Ex.: qual é o prazo e de onde viria o dinheiro para essa proposta?"
              />
              <p className="fine">
                Seu texto fica apenas neste aparelho. Ao guardar, você abre a anotação no seu
                caderno.
              </p>
              <button
                className="button secondary"
                disabled={!note.trim()}
                onClick={() =>
                  onNote({
                    title: `${current.name} · Debate da Globo`,
                    body: `Debate da Globo · 23/10/2026\nAssunto: ${current.name}\n\n${note.trim()}`,
                    topic: 'Debate',
                    uf: 'BR',
                  })
                }
              >
                <PenLine size={16} />
                Guardar no meu caderno
              </button>
            </div>
          </details>
          {topicCoverage.length > 0 && (
            <div className="debate-topic-links">
              <h3>Este assunto na cobertura</h3>
              {topicCoverage.slice(0, 2).map((article) => (
                <Source href={article.url} key={article.url}>
                  {article.source} · {article.title}
                </Source>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="debate-panel" id="debate-cobertura" aria-labelledby="coverage-title">
        <header>
          <div>
            <span className="or-overline">02 / O QUE AS FONTES PUBLICAM</span>
            <h2 id="coverage-title">
              {phase === 'after'
                ? 'O essencial publicado sobre o encontro.'
                : 'Acompanhe com a fonte ao lado.'}
            </h2>
            <p>
              Links de veículos identificados, atualizados a cada cinco minutos. Não é uma
              transcrição nem uma confirmação de cada fala.
            </p>
          </div>
          <DataFreshness
            checkedAt={media?.checkedAt}
            stale={media?.status === 'stale'}
            unavailable={media?.status === 'unavailable'}
          />
        </header>
        {mediaLoading ? (
          <p role="status">Consultando a cobertura…</p>
        ) : coverage.length ? (
          <>
            <div className="debate-articles">
              {coverage.slice(0, more ? 24 : 4).map((article) => (
                <a
                  className="debate-article"
                  href={article.url}
                  key={article.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <NewsVisual
                    url={article.url}
                    title={article.title}
                    source={article.source}
                    preview={article.image}
                  />
                  <div>
                    <span>
                      {article.source} ·{' '}
                      {new Date(debatePublicationTime(article.publishedAt)).toLocaleString(
                        'pt-BR',
                        {
                          timeZone: 'America/Sao_Paulo',
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        },
                      )}
                    </span>
                    <h3>{article.title}</h3>
                    <span className="debate-read">
                      Ler na origem <ArrowUpRight size={15} />
                    </span>
                  </div>
                </a>
              ))}
            </div>
            {coverage.length > 4 && (
              <button
                className="button secondary"
                onClick={() => setMore(!more)}
                aria-expanded={more}
              >
                {more ? 'Ver menos' : `Ver mais publicações (${coverage.length - 4})`}
              </button>
            )}
          </>
        ) : (
          <div className="debate-empty">
            <MessagesSquare size={25} />
            <p>
              {media?.status === 'unavailable'
                ? 'Não foi possível consultar a cobertura agora. Os planos e os links oficiais continuam disponíveis.'
                : 'Nenhuma publicação correspondente ao debate foi encontrada nesta consulta. Você já pode explorar os planos e preparar suas perguntas.'}
            </p>
          </div>
        )}
        <div className="debate-checks">
          <div>
            <ShieldCheck size={25} />
            <h3>Checagens, com autoria.</h3>
            <p>
              Uma reportagem sobre checagem não é um veredito do Observatório. Abra a fonte para
              conhecer a afirmação, a evidência e a conclusão.
            </p>
          </div>
          <div>
            {checks.length ? (
              checks.slice(0, 4).map((article) => (
                <Source href={article.url} key={article.url}>
                  {article.source} · {article.title}
                </Source>
              ))
            ) : (
              <p>
                {phase === 'before'
                  ? 'As checagens do encontro entram quando forem publicadas e identificadas nas fontes acompanhadas.'
                  : 'Ainda não identificamos checagens específicas deste encontro nas fontes consultadas.'}
              </p>
            )}
            <Source href="https://g1.globo.com/fato-ou-fake/">Consultar Fato ou Fake · g1</Source>
          </div>
        </div>
      </section>
      <section className="debate-panel" id="debate-pesquisas" aria-labelledby="debate-polls-title">
        <header>
          <div>
            <span className="or-overline">03 / A COLETA IMPORTA</span>
            <h2 id="debate-polls-title">Essa pesquisa ouviu as pessoas quando?</h2>
            <p>
              Uma publicação depois do encontro pode ter entrevistas feitas antes dele. A data da
              coleta ajuda a comparar.
            </p>
          </div>
          <button className="button secondary" onClick={() => onGo('polls')}>
            Explorar pesquisas <ArrowRight size={16} />
          </button>
        </header>
        {pollsLoading ? (
          <p role="status">Consultando pesquisas verificadas…</p>
        ) : eligiblePolls.length ? (
          <div className="debate-poll-list">
            {eligiblePolls.slice(0, 3).map((poll) => (
              <article key={poll.id}>
                <div>
                  <h3>{poll.institute}</h3>
                  <p>{poll.fieldwork}</p>
                </div>
                <span className="debate-period">
                  {
                    {
                      before: 'Coleta anterior ao debate',
                      mixed: 'Coleta inclui o dia do debate',
                      after: 'Coleta posterior ao debate',
                      unknown: 'Confira o período na fonte',
                    }[debatePollPeriod(poll)]
                  }
                </span>
                <Source href={poll.source}>Ver levantamento</Source>
              </article>
            ))}
          </div>
        ) : (
          <p>Os levantamentos aparecem após a conferência dos dados e da metodologia.</p>
        )}
        <p className="debate-small">
          Entrevistas no dia 23 podem ter ocorrido antes da transmissão. Mudanças entre pesquisas
          não demonstram, por si só, efeito do debate.
        </p>
      </section>
      <section className="debate-next">
        <div>
          <span className="or-overline">DO DEBATE À DECISÃO</span>
          <h2>Continue olhando além do placar.</h2>
          <p>Explore o território, o histórico e as pesquisas do Observatório do Voto.</p>
        </div>
        <button className="button primary" onClick={() => onGo('overview')}>
          Conhecer o Panorama <ArrowRight size={17} />
        </button>
      </section>
    </div>
  );
}
