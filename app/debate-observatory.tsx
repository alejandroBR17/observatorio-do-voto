'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  Clock3,
  CalendarDays,
  Eye,
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
import { scrollBehavior } from './motion';
import { DataFreshness } from './components/data-freshness';
import { ShareButton } from './components/share-button';
import { PushConsent } from './components/privacy-consent';
import { Source } from './components/source-link';
import { NewsVisual } from './news-visual';
import { DebateCompanion, DebatePlayer } from './debate-companion';
import type { DebateContext } from '@/lib/debate-context';
const DebatePollChart = dynamic(() => import('./debate-poll-chart'), {
  loading: () => <p>Preparando o gráfico…</p>,
});

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
  onNote: (note: Pick<NotebookEntry, 'title' | 'body' | 'topic' | 'uf'>, stay?: boolean) => void;
  syncMessage?: string;
  reviewOnly?: boolean;
}) {
  const now = useDebateClock();
  const phase = now === null ? 'before' : debatePhase(now);
  const { data: media, loading: mediaLoading } = useRemote<MediaResponse>('/api/media', 30000);
  const { data: polls, loading: pollsLoading } = useRemote<PollResponse>('/api/polls', 60000);
  const { data: context } = useRemote<DebateContext>('/api/debate', 30000);
  const [chartOpen, setChartOpen] = useState(false);
  const video = context?.video;
  const watchUrl = video?.watchUrl || debate.watchUrl;
  const [topic, setTopic] = useState<DebateTopic>('economia');
  const [morePolls, setMorePolls] = useState(false);
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
  function openReminder() {
    setReminderOpen(true);
    requestAnimationFrame(() =>
      document.getElementById('debate-reminder')?.scrollIntoView({
        behavior: scrollBehavior(),
        block: 'center',
      }),
    );
  }
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
    <div className={`debate-page debate-phase-${phase}`}>
      <section className="debate-showcase" aria-labelledby="debate-hero-title">
        <div className="debate-showcase-top">
          <span className="debate-signature">
            <img src="/favicon.svg" alt="" width="20" height="20" /> OBSERVATÓRIO DO VOTO
          </span>
          <span className="debate-top-label">DEBATE PRESIDENCIAL · GLOBO</span>
        </div>
        <div className="debate-showcase-main">
          <div className="debate-showcase-copy">
            <span className="debate-edition">ESPECIAL / SEGUNDO TURNO 2026</span>
            <h1 id="debate-hero-title" data-page-title tabIndex={-1}>
              {phase === 'before'
                ? 'O debate na Globo.'
                : phase === 'scheduled'
                  ? 'Assista. Compare.'
                  : 'Reveja o encontro.'}
              <br />
              <em>
                {phase === 'before'
                  ? 'Seu olhar vai além.'
                  : phase === 'scheduled'
                    ? 'O contexto está aqui.'
                    : 'Confira as fontes.'}
              </em>
            </h1>
            <p>
              <span className="debate-copy-full">
                {phase === 'before'
                  ? 'Compare o que Lula e Flávio propõem, confira as fontes e guarde suas dúvidas. O debate fica mais fácil de acompanhar quando o contexto está ao lado.'
                  : phase === 'scheduled'
                    ? 'Acompanhe as publicações, consulte as propostas e marque o que quer conferir. As novidades chegam sem recarregar a página.'
                    : 'Explore a cobertura publicada, as checagens identificadas e as suas anotações. As fontes e as datas continuam ao lado de cada informação.'}
              </span>
              <span className="debate-copy-short">
                {phase === 'before'
                  ? 'Compare propostas e acompanhe as fontes, sem anúncios.'
                  : phase === 'scheduled'
                    ? 'Publicações, propostas e suas marcações, sem recarregar.'
                    : 'Cobertura, checagens e contexto para rever o encontro.'}
              </span>
            </p>
            <div className="debate-event-time">
              <CalendarDays size={21} />
              <div>
                <strong>Sexta-feira, 23 de outubro</strong>
                <span>
                  Início previsto às <b>21h20</b> · horário de Brasília
                </span>
              </div>
            </div>
            <div className="debate-actions">
              {!reminderExpired && (
                <button className="button primary" onClick={openReminder}>
                  <Bell size={17} />
                  {reminderActive ? 'Ver meu lembrete' : 'Lembrar 15 minutos antes'}
                </button>
              )}
              <a className="debate-showcase-link" href="#debate-propostas">
                Começar pelas propostas <ArrowRight size={17} />
              </a>
            </div>
            <p className="debate-reminder-caption">
              Debate: <strong>21h20</strong> <span aria-hidden="true">/</span> Lembrete opcional:{' '}
              <strong>21h05</strong>
            </p>
          </div>
          <div className="debate-stage">
            <div className="debate-stage-label">
              <span aria-hidden="true" />
              23 OUT · 21H20 · BRASÍLIA
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
            <div className="debate-stage-clock">
              {phase === 'before' ? (
                <>
                  <span>ATÉ O HORÁRIO PREVISTO</span>
                  <DebateClock now={now} />
                </>
              ) : (
                <span>
                  <Clock3 size={16} />
                  {phase === 'scheduled'
                    ? 'Horário previsto do encontro chegou'
                    : 'Explore o que ficou do encontro'}
                </span>
              )}
            </div>
          </div>
        </div>
        <section className="debate-broadcast" aria-labelledby="debate-broadcast-title">
          <div className="debate-broadcast-screen">
            {video ? (
              <DebatePlayer key={video.watchUrl} video={video} />
            ) : (
              <>
                <span className="debate-broadcast-kicker">TRANSMISSÃO OFICIAL</span>
                <Tv size={42} strokeWidth={1.25} aria-hidden="true" />
                <strong>
                  23 OUT <span>21h20</span>
                </strong>
                <span>Sexta-feira · horário de Brasília</span>
              </>
            )}
          </div>
          <div className="debate-broadcast-info">
            <span className="debate-pending">
              {watchUrl ? 'Vídeo identificado na fonte oficial' : 'Aguardando link oficial'}
            </span>
            <h2 id="debate-broadcast-title">
              {watchUrl
                ? 'Acesse o vídeo oficial'
                : phase === 'after'
                  ? 'Íntegra oficial a confirmar'
                  : 'Transmissão em breve'}
            </h2>
            <p>
              {watchUrl
                ? 'Abra a transmissão na fonte oficial e volte para comparar as propostas e conferir o contexto.'
                : 'Este será o seu ponto de partida para assistir. O link direto do debate aparecerá aqui quando estiver confirmado.'}
            </p>
            {watchUrl && !video ? (
              <a className="button secondary" href={watchUrl} target="_blank" rel="noreferrer">
                Assistir ao debate <ArrowUpRight size={16} />
              </a>
            ) : !watchUrl && !reminderExpired ? (
              <button className="button secondary" onClick={openReminder}>
                <Bell size={16} /> {reminderActive ? 'Ver meu lembrete' : 'Quero ser lembrado'}
              </button>
            ) : null}
          </div>
        </section>
        <div className="debate-program-source">
          <Source href={debate.scheduleSource}>Data e horário divulgados · UOL</Source>
        </div>
      </section>
      <section className="debate-welcome" aria-label="Conheça o Observatório do Voto">
        <div className="debate-welcome-intro">
          <span className="or-overline">CHEGOU AGORA? ESTE É O SEU OBSERVATÓRIO.</span>
          <h2>Entender a eleição pode ser mais simples.</h2>
          <p>
            Uma central independente para explorar o voto. Você escolhe o assunto e até onde quer se
            aprofundar.
          </p>
        </div>
        <details className="debate-welcome-details">
          <summary>
            Conheça o Observatório <ArrowRight size={16} />
          </summary>
          <div className="debate-welcome-values">
            <div className="debate-value">
              <Eye size={22} />
              <strong>Visual para entender.</strong>
              <p>Compare propostas lado a lado e abra os detalhes quando quiser.</p>
            </div>
            <div className="debate-value">
              <ShieldCheck size={22} />
              <strong>Fontes para conferir.</strong>
              <p>Veja de onde vem cada informação. A sua conclusão continua sendo sua.</p>
            </div>
          </div>
        </details>
      </section>
      <div className="debate-tools">
        <nav aria-label="Nesta área">
          <a href="#debate-acompanhar">Acompanhar novidades</a>
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
      <DebateCompanion
        articles={media?.articles}
        context={context}
        phase={phase}
        loading={mediaLoading}
        checkedAt={media?.checkedAt}
        stale={media?.status === 'stale' || media?.status === 'unavailable'}
        onMark={() =>
          onNote(
            {
              title: `Conferir · Debate da Globo · ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}`,
              body: `Momento marcado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília).\nAssunto selecionado: ${current.name}.\n\nO horário é do aparelho, não uma posição sincronizada do vídeo. A transmissão pode ter atraso.\n\nO que quero conferir:`,
              topic: 'Debate',
              uf: 'BR',
            },
            true,
          )
        }
      />
      {reminderOpen && !reminderExpired && (
        <section className="debate-reminder" id="debate-reminder" aria-labelledby="reminder-title">
          <div>
            <span className="or-overline">UM AVISO / SUA ESCOLHA</span>
            <h2 id="reminder-title">Lembre de acompanhar.</h2>
            <p>
              O debate tem início previsto às 21h20 de 23/10. O lembrete sai próximo das 21h05,
              quinze minutos antes. Você não precisa deixar o app aberto; a entrega depende da
              conexão e da permissão do aparelho.
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
              Links de veículos identificados, consultados automaticamente. Não é uma transcrição
              nem uma confirmação de cada fala.
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
              {coverage.slice(0, more ? 24 : 2).map((article) => (
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
            {coverage.length > 2 && (
              <button
                className="button secondary"
                onClick={() => {
                  setMore(!more);
                  if (more)
                    requestAnimationFrame(() =>
                      document
                        .getElementById('debate-cobertura')
                        ?.scrollIntoView({ block: 'start', behavior: scrollBehavior() }),
                    );
                }}
                aria-expanded={more}
              >
                {more ? 'Ver menos' : `Ver mais publicações (${coverage.length - 2})`}
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
      <section
        className="debate-panel debate-research"
        id="debate-pesquisas"
        aria-labelledby="debate-polls-title"
      >
        <header>
          <div>
            <span className="or-overline">03 / ANTES OU DEPOIS DO ENCONTRO?</span>
            <h2 id="debate-polls-title">Quando as pessoas foram ouvidas?</h2>
            <p>
              Uma pesquisa divulgada depois do debate pode ter entrevistado as pessoas antes dele.
              Por isso, olhe primeiro para o período das entrevistas.
            </p>
          </div>
          <button className="button secondary" onClick={() => onGo('polls')}>
            Explorar todas as pesquisas <ArrowRight size={16} />
          </button>
        </header>
        <ol className="debate-research-timeline" aria-label="Como situar as pesquisas no tempo">
          <li>
            <span className="debate-timeline-dot" />
            <strong>Antes do debate</strong>
            <p>Entrevistas encerradas até 22/10.</p>
          </li>
          <li className="debate-timeline-event">
            <span className="debate-timeline-dot" />
            <strong>O encontro na Globo</strong>
            <p>23/10 · início previsto às 21h20.</p>
          </li>
          <li>
            <span className="debate-timeline-dot" />
            <strong>Depois do debate</strong>
            <p>Entrevistas iniciadas a partir de 24/10.</p>
          </li>
        </ol>
        {pollsLoading ? (
          <p role="status">Consultando pesquisas verificadas…</p>
        ) : eligiblePolls.length ? (
          <>
            <div className="debate-research-explainer">
              <Clock3 size={20} />
              <p>
                {eligiblePolls.some((poll) => debatePollPeriod(poll) === 'after')
                  ? 'Já existem levantamentos com entrevistas posteriores ao encontro. A identificação abaixo ajuda a separar os períodos.'
                  : 'Ainda não há, entre os levantamentos conferidos, uma pesquisa feita inteiramente após esse debate. As pesquisas anteriores mostram como a disputa estava antes do encontro.'}
              </p>
            </div>
            <div className={`debate-poll-list${morePolls ? ' is-expanded' : ''}`}>
              {eligiblePolls.slice(0, morePolls ? 3 : 1).map((poll) => {
                const period = debatePollPeriod(poll);
                return (
                  <article className={`debate-research-card period-${period}`} key={poll.id}>
                    <div className="debate-research-card-title">
                      <h3>{poll.institute}</h3>
                      <span className="debate-period">
                        {
                          {
                            before: 'Antes do debate',
                            mixed: 'Inclui o dia do debate',
                            after: 'Depois do debate',
                            unknown: 'Período a conferir',
                          }[period]
                        }
                      </span>
                    </div>
                    <p className="debate-poll-basis">
                      {poll.basis === 'valid'
                        ? 'Votos válidos · somente os candidatos'
                        : 'Votos totais · todas as respostas'}
                    </p>
                    <div className="debate-poll-results" aria-label="Intenção de voto">
                      {candidates.map((candidate) => {
                        const value = candidate.number === '22' ? poll.flavio : poll.lula;
                        return (
                          <div
                            className={`debate-poll-result person-${candidate.number}`}
                            key={candidate.number}
                          >
                            <img src={candidate.photo} alt="" width="40" height="48" />
                            <div>
                              <div className="debate-poll-value">
                                <span>{candidate.name}</span>
                                <strong>{value.toLocaleString('pt-BR')}%</strong>
                              </div>
                              <div className="debate-poll-track" aria-hidden="true">
                                <span style={{ width: `${value}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {poll.basis === 'total' && (
                      <p className="debate-poll-other">
                        Os demais percentuais incluem outras respostas, como branco, nulo ou
                        indecisão. Não foram convertidos em votos válidos.
                      </p>
                    )}
                    <dl>
                      <div>
                        <dt>Pessoas entrevistadas entre</dt>
                        <dd>{poll.fieldwork.split(' · ')[0]}</dd>
                      </div>
                      <div>
                        <dt>Resultado divulgado em</dt>
                        <dd>
                          {new Date(poll.publishedAt).toLocaleDateString('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                          })}
                        </dd>
                      </div>
                    </dl>
                    <p className="debate-research-card-note">
                      {
                        {
                          before: 'Estas entrevistas não mostram a reação a esse debate.',
                          mixed:
                            'Parte das entrevistas pode ter ocorrido antes do encontro. Não é uma pesquisa inteiramente posterior.',
                          after:
                            'As entrevistas aconteceram após o dia do encontro. Isso não prova que o debate causou uma mudança.',
                          unknown: 'Consulte a metodologia antes de comparar com o debate.',
                        }[period]
                      }
                    </p>
                    <details className="debate-poll-method">
                      <summary>Detalhes da pesquisa</summary>
                      <dl>
                        <div>
                          <dt>Amostra</dt>
                          <dd>{poll.sample.toLocaleString('pt-BR')} pessoas</dd>
                        </div>
                        <div>
                          <dt>Margem de erro</dt>
                          <dd>±{poll.margin.toLocaleString('pt-BR')} pontos percentuais</dd>
                        </div>
                        <div>
                          <dt>Confiança</dt>
                          <dd>
                            {poll.confidence === null
                              ? 'Não informada'
                              : `${poll.confidence.toLocaleString('pt-BR')}%`}
                          </dd>
                        </div>
                        <div>
                          <dt>Registro</dt>
                          <dd>{poll.registration}</dd>
                        </div>
                        {poll.contractor && (
                          <div>
                            <dt>Contratante</dt>
                            <dd>{poll.contractor}</dd>
                          </div>
                        )}
                      </dl>
                      {poll.note && <p>{poll.note}</p>}
                      <Source href={poll.source}>Conferir publicação original</Source>
                    </details>
                  </article>
                );
              })}
            </div>
            {eligiblePolls.length > 1 && (
              <button
                className="button secondary debate-more-polls"
                aria-expanded={morePolls}
                onClick={() => {
                  setMorePolls(!morePolls);
                  if (morePolls)
                    requestAnimationFrame(() =>
                      document
                        .getElementById('debate-pesquisas')
                        ?.scrollIntoView({ block: 'start', behavior: scrollBehavior() }),
                    );
                }}
              >
                {morePolls
                  ? 'Ver menos pesquisas'
                  : `Ver mais pesquisas (${Math.min(eligiblePolls.length, 3) - 1})`}
              </button>
            )}
          </>
        ) : (
          <p>As pesquisas aparecem após a conferência dos números e da metodologia.</p>
        )}
        <details className="debate-disclosure">
          <summary>
            Por que o dia 23 pede cuidado?<span aria-hidden="true">+</span>
          </summary>
          <div>
            <p className="fine">
              O encontro está previsto para a noite. Uma entrevista feita durante o dia 23 ainda
              pode refletir uma opinião anterior ao debate. Sem o horário de cada entrevista, não
              classificamos todo esse dia como “depois”. Mesmo entre pesquisas posteriores,
              diferenças de amostra, método e outros acontecimentos também importam.
            </p>
          </div>
        </details>
        <details
          className="debate-disclosure"
          onToggle={(event) => setChartOpen(event.currentTarget.open)}
        >
          <summary>
            Comparar a evolução de um instituto<span aria-hidden="true">+</span>
          </summary>
          <div>{chartOpen && <DebatePollChart polls={polls?.polls || []} />}</div>
        </details>
      </section>
      <section className="debate-next">
        <div>
          <span className="or-overline">DO DEBATE À DECISÃO</span>
          <h2>O debate é só o começo.</h2>
          <p>
            Explore mapas, resultados do seu município, pesquisas e a história do voto. Sem anúncios
            e com as fontes sempre por perto.
          </p>
        </div>
        <button className="button primary" onClick={() => onGo('overview')}>
          Conhecer o Panorama <ArrowRight size={17} />
        </button>
      </section>
    </div>
  );
}
