'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Crosshair,
  Layers,
  MapPin,
  Radio,
  RotateCcw,
} from 'lucide-react';
import { states, type Result } from '@/lib/elections';
import { candidates } from '@/lib/content';
import {
  candidateColor,
  candidateName,
  formatCompactPercent as pct,
  formatDate,
  formatVotes,
} from '@/lib/presentation';
import { pollNumbers } from '@/lib/poll-view';
import type { PollResponse } from '@/lib/polls/types';
import { Map } from './geo-map';
import { useRemote } from './hooks/use-remote';
import { DataFreshness } from './components/data-freshness';
import { Disclosure } from './disclosure';

type News = {
  title: string;
  url: string;
  source?: string;
  publisher?: string;
  publishedAt?: string;
};

export function ObservatoryRoom({
  results,
  uf,
  onState,
  onGo,
  liveStatus,
}: {
  results: Result[];
  uf: string;
  onState: (uf: string) => void;
  onGo: (tab: string) => void;
  liveStatus: string;
}) {
  const [year, setYear] = useState(2026);
  const [archive, setArchive] = useState<Result[]>([]);
  const [archiveState, setArchiveState] = useState<'ready' | 'loading' | 'error'>('ready');
  const [focus, setFocus] = useState('');
  const [pollId, setPollId] = useState('');
  const { data: polling, loading: pollsLoading } = useRemote<PollResponse>('/api/polls', 300000);
  const { data: media, loading: newsLoading } = useRemote<{ articles: News[] }>(
    '/api/media',
    300000,
  );
  useEffect(() => {
    if (year === 2026) return;
    const controller = new AbortController();
    setArchiveState('loading');
    setArchive([]);
    fetch(`/data/history-${year}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then((data: Result[]) => {
        setArchive(data.filter((r) => r.turn === 1));
        setArchiveState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setArchiveState('error');
      });
    return () => controller.abort();
  }, [year]);
  const data = year === 2026 ? results : archive.filter((r) => r.year === year);
  const current = data.find((r) => r.uf === uf);
  const national = data.find((r) => r.uf === 'BR');
  const selection = uf === 'BR' ? 'Brasil' : states.find((s) => s[1] === uf)?.[2] || uf;
  const pair = current?.candidates.slice(0, 2) || [];
  const orderedPolls = [...(polling?.polls || [])]
    .filter((p) => pollNumbers(p, 'valid'))
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const latest = orderedPolls.at(-1);
  const poll = orderedPolls.find((p) => p.id === pollId) || latest;
  const numbers = poll && pollNumbers(poll, 'valid');
  const leadingStates = data.filter(
    (r) => states.some((s) => s[1] === r.uf) && (!focus || r.candidates[0]?.number === focus),
  ).length;
  const gap = pair.length === 2 ? pair[0].percent - pair[1].percent : null;
  const available =
    year === 2026 ? results.length > 0 : archiveState === 'ready' && data.length > 0;
  return (
    <div className="or-room">
      <div className="or-masthead">
        <div>
          <span className="or-overline">
            <span className="or-beacon" /> ELEIÇÕES PRESIDENCIAIS · 2026
          </span>
          <h1 tabIndex={-1} data-page-title>
            A eleição, <span>em perspectiva.</span>
          </h1>
          <p>Observe o território. Percorra as mudanças. Entenda o momento.</p>
        </div>
        <div className="or-phase">
          <Radio size={17} />
          <div>
            <strong>{liveStatus === 'live' ? 'Apuração em andamento' : 'Entre dois turnos'}</strong>
            <span>
              {liveStatus === 'live'
                ? 'Consulte os resultados oficiais'
                : 'O próximo capítulo · 25 de outubro'}
            </span>
          </div>
        </div>
      </div>
      <nav className="or-quicknav" aria-label="Explorar o panorama">
        <a href="#territorio">
          Território <ChevronRight size={13} />
        </a>
        <a href="#pulso">
          Pulso das pesquisas <ChevronRight size={13} />
        </a>
        <a href="#contexto">
          Em contexto <ChevronRight size={13} />
        </a>
        <span>PRÉVIA DE IDENTIDADE</span>
      </nav>
      <div className="or-primary">
        <section className="or-atlas" id="territorio">
          <div className="or-section-head">
            <div>
              <span className="or-overline">01 / O VOTO NO TERRITÓRIO</span>
              <h2>Um país. Muitos cenários.</h2>
            </div>
            <span className="or-source">
              <Check size={12} /> Resultado oficial
            </span>
          </div>
          <div className="or-atlas-toolbar">
            <div className="or-years" role="group" aria-label="Ano do resultado de primeiro turno">
              {[2018, 2022, 2026].map((value) => (
                <button
                  key={value}
                  aria-pressed={year === value}
                  onClick={() => {
                    setYear(value);
                    setFocus('');
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            <label className="or-state-select">
              <MapPin size={14} />
              <select
                aria-label="Explorar estado"
                value={uf}
                onChange={(e) => onState(e.target.value)}
              >
                <option value="BR">Brasil inteiro</option>
                {states.map((s) => (
                  <option key={s[1]} value={s[1]}>
                    {s[2]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="or-atlas-body">
            <div className="or-map-stage">
              <span className="or-map-coordinate">BR / {year} / 1º TURNO</span>
              {!available ? (
                <div className="or-map-status" role="status">
                  {year === 2026
                    ? 'Carregando o resultado oficial…'
                    : archiveState !== 'error'
                      ? 'Abrindo o acervo eleitoral…'
                      : 'Não foi possível abrir este ano. Selecione outro período.'}
                </div>
              ) : (
                <Map
                  data={data.filter((r) => r.uf !== 'BR')}
                  region="Brasil"
                  selected={uf}
                  onSelect={onState}
                  focusCandidate={focus}
                />
              )}
            </div>
            <div className="or-inspector">
              <div className="or-scope">
                <span className="or-overline">SEU RECORTE</span>
                <h3>{selection}</h3>
                <span>{year} · primeiro turno</span>
              </div>
              {uf !== 'BR' && (
                <button className="or-reset" onClick={() => onState('BR')}>
                  <RotateCcw size={12} /> Voltar ao Brasil
                </button>
              )}
              <div
                className="or-contenders"
                key={`${year}-${uf}`}
                aria-live="polite"
                aria-atomic="true"
              >
                {pair.map((c) => {
                  const person =
                    year === 2026 ? candidates.find((p) => p.number === c.number) : undefined;
                  return (
                    <button
                      key={c.number}
                      className="or-contender"
                      aria-pressed={focus === c.number}
                      onClick={() => setFocus(focus === c.number ? '' : c.number)}
                      style={{ '--contender': candidateColor(c.number) } as React.CSSProperties}
                    >
                      <div className="or-person">
                        {person ? (
                          <img src={person.photo} alt="" width="36" height="40" />
                        ) : (
                          <span className="or-party">{c.party}</span>
                        )}
                        <div>
                          <strong>{candidateName(c.name)}</strong>
                          <small>
                            {c.party} ·{' '}
                            {focus === c.number ? 'Destaque no mapa' : 'Toque para destacar'}
                          </small>
                        </div>
                        <Crosshair size={14} />
                      </div>
                      <div className="or-vote-number">
                        <strong>{pct(c.percent)}</strong>
                        <span>{formatVotes(c.votes)} votos</span>
                      </div>
                      <span className="or-vote-track">
                        <i style={{ width: `${c.percent}%` }} />
                      </span>
                    </button>
                  );
                })}
              </div>
              {current && (
                <div className="or-reading" role="status">
                  <span className="or-overline">O QUE ESTE RECORTE MOSTRA</span>
                  <p>
                    {focus ? (
                      <>
                        <strong>
                          {candidateName(
                            current.candidates.find((c) => c.number === focus)?.name || '',
                          )}
                        </strong>{' '}
                        recebeu mais votos em <strong>{leadingStates} unidades da federação</strong>{' '}
                        do país neste turno. Toque novamente para retirar o destaque.
                      </>
                    ) : gap !== null ? (
                      <>
                        Neste recorte, a diferença entre os dois mais votados foi de{' '}
                        <strong>{pct(gap).replace('%', '')} pontos percentuais</strong>.
                      </>
                    ) : (
                      'Selecione um estado para observar o resultado.'
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="or-atlas-foot">
            <span>
              <Layers size={13} /> Primeiro turno · votos válidos ·{' '}
              {current ? pct(current.counted) : '—'} das seções
            </span>
            {current && (
              <a href={current.source} target="_blank" rel="noreferrer">
                Fonte: TSE <ArrowUpRight size={13} />
              </a>
            )}
          </div>
        </section>
        <aside className="or-moment">
          <div className="or-section-head">
            <div>
              <span className="or-overline">AGORA NO OBSERVATÓRIO</span>
              <h2>A próxima decisão.</h2>
            </div>
            <CalendarDays size={19} />
          </div>
          <div className="or-date">
            <strong>
              25<span>OUT</span>
            </strong>
            <div>
              Domingo<small>Segundo turno presidencial</small>
            </div>
          </div>
          <div className="or-finalists">
            {candidates.map((c) => (
              <button key={c.number} onClick={() => onGo('candidates')}>
                <span className="or-candidate-dot" style={{ background: c.color }} />
                <strong>{c.name}</strong>
                <span>{c.party}</span>
                <ChevronRight size={13} />
              </button>
            ))}
          </div>
          <p className="or-caption">
            Votação das 8h às 17h, no horário de Brasília. A apuração aparece quando os dados
            oficiais forem divulgados.
          </p>
          <button className="or-action or-action-primary" onClick={() => onGo('live')}>
            {liveStatus === 'live' ? 'Abrir a apuração' : 'Preparar meu acompanhamento'}
            <ArrowRight size={16} />
          </button>
          <button className="or-action" onClick={() => onGo('alerts')}>
            Escolher meus alertas <ChevronRight size={15} />
          </button>
          <div className="or-local">
            <MapPin size={20} />
            <span className="or-overline">DO PAÍS À SUA SEÇÃO</span>
            <h3>O voto perto de você.</h3>
            <p>Veja como votaram sua cidade, seu colégio e sua seção.</p>
            <button className="or-link" onClick={() => onGo('municipality')}>
              Explorar meu município <ArrowUpRight size={15} />
            </button>
          </div>
          {current && (
            <div className="or-participation">
              <div>
                <span>Votos válidos</span>
                <strong>
                  {new Intl.NumberFormat('pt-BR', {
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(current.valid)}
                </strong>
              </div>
              <div>
                <span>Participação</span>
                <strong>
                  {current.turnout > 0 && Number.isFinite(current.abstention)
                    ? pct(100 - current.abstention)
                    : 'Não disponível'}
                </strong>
              </div>
            </div>
          )}
        </aside>
      </div>
      <div className="or-secondary">
        <section className="or-pulse" id="pulso">
          <div className="or-section-head">
            <div>
              <span className="or-overline">02 / O PULSO DAS PESQUISAS</span>
              <h2>Retratos de um momento.</h2>
            </div>
            <button className="or-link" onClick={() => onGo('polls')}>
              Comparar <ArrowUpRight size={15} />
            </button>
          </div>
          {poll && numbers ? (
            <>
              <div className="or-poll-meta">
                <strong>{poll.institute}</strong>
                <span>{formatDate(poll.publishedAt)} · Nacional · 2º turno</span>
              </div>
              <div className="or-poll-numbers">
                <div>
                  <span>Flávio Bolsonaro</span>
                  <strong>{pct(numbers.flavio)}</strong>
                </div>
                <span>
                  VOTOS
                  <br />
                  VÁLIDOS
                </span>
                <div>
                  <span>Lula</span>
                  <strong>{pct(numbers.lula)}</strong>
                </div>
              </div>
              <div
                className="or-poll-split"
                role="img"
                aria-label={`Flávio Bolsonaro ${pct(numbers.flavio)}, Lula ${pct(numbers.lula)}`}
              >
                <i style={{ flex: numbers.flavio }} />
                <i style={{ flex: numbers.lula }} />
              </div>
              <div
                className="or-poll-timeline"
                role="group"
                aria-label="Percorrer divulgações de pesquisas"
              >
                {orderedPolls.slice(-10).map((p) => (
                  <button
                    key={p.id}
                    aria-pressed={poll.id === p.id}
                    aria-label={`${p.institute}, ${formatDate(p.publishedAt)}`}
                    onClick={() => setPollId(p.id)}
                  >
                    <span />
                    <small>{formatDate(p.publishedAt).slice(0, 5)}</small>
                  </button>
                ))}
              </div>
              <p className="or-caption">
                Toque nos pontos para percorrer as divulgações. Institutos e amostras diferentes;
                estes retratos não formam uma projeção.
              </p>
              <Disclosure
                title="Como ler este levantamento"
                summary={`Margem ±${poll.margin.toLocaleString('pt-BR')} p.p. · ${formatVotes(poll.sample)} entrevistas`}
              >
                <p>
                  Coleta: {poll.fieldwork}. Confiança:{' '}
                  {poll.confidence === null ? 'não informada' : `${poll.confidence}%`}. Registro:{' '}
                  {poll.registration}.
                </p>
                <a href={poll.source} target="_blank" rel="noreferrer">
                  Consultar publicação original <ArrowUpRight size={13} />
                </a>
              </Disclosure>
            </>
          ) : (
            <p className="or-empty" role="status">
              {pollsLoading
                ? 'Consultando as pesquisas…'
                : 'As pesquisas estão temporariamente indisponíveis.'}
            </p>
          )}
          <DataFreshness
            checkedAt={polling?.checkedAt}
            stale={polling?.stale || polling?.status === 'stale'}
            unavailable={polling?.status === 'unavailable'}
          />
        </section>
        <section className="or-context" id="contexto">
          <div className="or-section-head">
            <div>
              <span className="or-overline">03 / EM CONTEXTO</span>
              <h2>O que está em discussão.</h2>
            </div>
            <button className="or-link" onClick={() => onGo('social')}>
              Cobertura <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="or-news">
            {media?.articles?.slice(0, 3).map((article, index) => (
              <a href={article.url} target="_blank" rel="noreferrer" key={article.url}>
                <span className="or-news-index">0{index + 1}</span>
                <div>
                  <span className="or-overline">
                    {article.publisher || article.source || 'IMPRENSA'}
                    {article.publishedAt ? ` · ${formatDate(article.publishedAt)}` : ''}
                  </span>
                  <h3>{article.title}</h3>
                </div>
                <ArrowUpRight size={16} />
              </a>
            )) || (
              <p className="or-empty">
                {newsLoading
                  ? 'Consultando a cobertura…'
                  : 'Cobertura temporariamente indisponível.'}
              </p>
            )}
          </div>
          <div className="or-evidence">
            <Check size={16} />
            <p>
              <strong>Contexto com origem identificada.</strong> Notícias são cobertura da imprensa.
              Resultados vêm do TSE; pesquisas trazem instituto e metodologia.
            </p>
          </div>
          <DataFreshness
            checkedAt={media?.checkedAt}
            stale={media?.stale || media?.status === 'stale'}
            unavailable={media?.status === 'unavailable'}
          />
        </section>
      </div>
      <div className="or-bottom">
        <span>OBSERVAR. COMPARAR. ENTENDER.</span>
        <button className="or-link" onClick={() => onGo('history')}>
          Continuar pelo histórico eleitoral <ArrowRight size={16} />
        </button>
      </div>
      {!national && available && (
        <p className="or-caption">
          Alguns recortes do acervo podem não estar disponíveis neste período.
        </p>
      )}
    </div>
  );
}
