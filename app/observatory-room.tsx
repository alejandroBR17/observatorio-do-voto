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
} from 'lucide-react';
import { states, type Result } from '@/lib/elections';
import { candidates, years } from '@/lib/content';
import { CandidatePortrait } from './components/candidate-portrait';
import {
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
import { NewsVisual } from './news-visual';
import type { MediaResponse } from '@/lib/media-types';
import { VisitHighlights } from './visit-highlights';
import type { ImportantLive } from '@/lib/important-updates';
import { electionPalette } from '@/lib/election-palette';
import { overviewResults } from '@/lib/overview-results';
import { historySelection } from '@/lib/history-selection';
import { RegionalResults, electoralRegions } from './regional-results';

export function ObservatoryRoom({
  results,
  uf,
  region,
  onRegion,
  onState,
  onGo,
  liveStatus,
  live,
  liveResults,
}: {
  results: Result[];
  uf: string;
  region: string;
  onRegion: (region: string) => void;
  onState: (uf: string) => void;
  onGo: (tab: string) => void;
  liveStatus: string;
  live: ImportantLive;
  liveResults: Result[];
}) {
  const [year, setYear] = useState(2026);
  const [turn, setTurn] = useState(1);
  const [archive, setArchive] = useState<Result[]>([]);
  const [archiveState, setArchiveState] = useState<'ready' | 'loading' | 'error'>('ready');
  const [focus, setFocus] = useState('');
  const [pollId, setPollId] = useState('');
  const { data: polling, loading: pollsLoading } = useRemote<PollResponse>('/api/polls', 300000);
  const { data: media, loading: newsLoading } = useRemote<MediaResponse>('/api/media', 300000);
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
        if (controller.signal.aborted) return;
        setArchive(data);
        setArchiveState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setArchiveState('error');
      });
    return () => controller.abort();
  }, [year]);
  const secondTurn = year === 2026 && turn === 2;
  const data = overviewResults(year, turn, results, liveResults, archive);
  const current =
    uf === 'BR' && region !== 'Brasil'
      ? historySelection(data, turn, uf, region)
      : data.find((r) => r.uf === uf);
  const waiting = secondTurn && !current;
  const national = data.find((r) => r.uf === 'BR');
  const palette = electionPalette(national?.candidates || []);
  const resultColor = (number: string) =>
    palette.find((candidate) => candidate.number === number)?.color || '#87999b';
  const selection =
    uf === 'BR'
      ? region !== 'Brasil'
        ? region
        : year === 1994
          ? 'Brasil · votos no país'
          : 'Brasil'
      : states.find((s) => s[1] === uf)?.[2] || uf;
  const pair = current?.candidates.filter((c) => c.votes > 0).slice(0, 2) || [];
  const orderedPolls = [...(polling?.polls || [])]
    .filter((p) => pollNumbers(p, 'valid'))
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const latest = orderedPolls.at(-1);
  const poll = orderedPolls.find((p) => p.id === pollId) || latest;
  const numbers = poll && pollNumbers(poll, 'valid');
  const leading = data.filter(
    (r) =>
      states.some((s) => s[1] === r.uf && (region === 'Brasil' || s[3] === region)) &&
      (!focus || r.candidates[0]?.number === focus),
  );
  const leadingStates = leading.filter((r) => r.uf !== 'DF').length;
  const leadsFederalDistrict = leading.some((r) => r.uf === 'DF');
  const gap = pair.length === 2 ? pair[0].percent - pair[1].percent : null;
  const available = year === 2026 ? data.length > 0 : archiveState === 'ready' && data.length > 0;
  return (
    <div className="or-room">
      <div className="or-masthead">
        <div>
          <span className="or-overline">
            <span className="or-beacon" /> ELEIÇÕES PRESIDENCIAIS · 2026
          </span>
          <h1 tabIndex={-1} data-page-title>
            Acompanhe a disputa <span>pela Presidência.</span>
          </h1>
          <p>Veja os resultados por estado, compare pesquisas e explore eleições anteriores.</p>
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
        <span className="or-interface-key">
          <i aria-hidden="true" /> Âmbar: ações e seleção
        </span>
      </nav>
      <VisitHighlights polls={polling} live={live} onGo={onGo} />
      <div className="or-primary">
        <section className="or-atlas" id="territorio">
          <div className="or-section-head">
            <div>
              <span className="or-overline">01 / O VOTO NO TERRITÓRIO</span>
              <h2>{secondTurn ? 'O segundo turno pelo Brasil' : 'Como o Brasil votou'}</h2>
            </div>
            <span className="or-source">
              {waiting ? <Radio size={12} /> : <Check size={12} />}{' '}
              {waiting ? 'Aguardando o TSE' : secondTurn ? 'Apuração oficial' : 'Resultado oficial'}
            </span>
          </div>
          <div className="or-atlas-toolbar">
            <label className="or-year-picker">
              Ano
              <select
                aria-label="Ano da eleição"
                value={year}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setYear(next);
                  setFocus('');
                  if ([1994, 1998, 2026].includes(next)) setTurn(1);
                }}
              >
                {[2026, ...[...years].reverse()].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <div className="or-years" role="group" aria-label="Turno da eleição">
              <button
                aria-pressed={turn === 1}
                onClick={() => {
                  setTurn(1);
                  setFocus('');
                }}
              >
                1º turno
              </button>
              {![1994, 1998].includes(year) && (
                <button
                  aria-pressed={turn === 2}
                  onClick={() => {
                    setTurn(2);
                    setFocus('');
                  }}
                >
                  2º turno
                </button>
              )}
            </div>
            <label className="or-state-select">
              Região
              <select
                aria-label="Região dos resultados"
                value={region}
                onChange={(event) => onRegion(event.target.value)}
              >
                {electoralRegions.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="or-state-select">
              <MapPin size={14} />
              <select
                aria-label="Explorar estado"
                value={uf}
                onChange={(e) => onState(e.target.value)}
              >
                <option value="BR">
                  {region === 'Brasil' ? 'Brasil inteiro' : 'Toda a região'}
                </option>
                {states
                  .filter((s) => region === 'Brasil' || s[3] === region)
                  .map((s) => (
                    <option key={s[1]} value={s[1]}>
                      {s[2]}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {[1994, 1998].includes(year) && (
            <p className="or-single-turn">Esta eleição foi decidida no primeiro turno.</p>
          )}
          <div className="or-atlas-body">
            <div className={`or-map-stage${waiting && !available ? ' or-map-waiting' : ''}`}>
              <span className="or-map-coordinate">
                BR / {year} / {turn}º TURNO
              </span>
              {!available && !waiting ? (
                <div className="or-map-status" role="status">
                  {waiting
                    ? 'O mapa será preenchido à medida que o TSE divulgar os votos do segundo turno.'
                    : year === 2026
                      ? 'Carregando o resultado oficial…'
                      : archiveState !== 'error'
                        ? 'Abrindo o acervo eleitoral…'
                        : 'Não foi possível abrir este ano. Selecione outro período.'}
                </div>
              ) : (
                <Map
                  data={data.filter((r) => r.uf !== 'BR')}
                  region={region}
                  selected={uf}
                  onSelect={onState}
                  focusCandidate={focus}
                  candidateLegend={palette}
                />
              )}
              {waiting && (
                <p className="or-poll-caution" role="status">
                  Mapa em espera: selecione um estado para preparar seu recorte. As cores aparecerão
                  com os primeiros votos oficiais.
                </p>
              )}
            </div>
            <div className="or-inspector">
              <div className="or-scope">
                <span className="or-overline">SEU RECORTE</span>
                <h3>{selection}</h3>
                <span>
                  {year} · {turn}º turno
                </span>
              </div>
              <div
                className="or-contenders"
                key={`${year}-${turn}-${uf}`}
                aria-live="polite"
                aria-atomic="true"
              >
                {waiting && (
                  <div className="or-second-wait">
                    <span className="or-overline">25 OUT · A PARTIR DAS 17H · BRASÍLIA</span>
                    <h3>O segundo turno, neste painel.</h3>
                    <p>
                      Os votos de {selection === 'Brasil' ? 'todo o Brasil' : selection} aparecerão
                      aqui quando forem divulgados. Até lá, nenhum percentual é antecipado.
                    </p>
                    <div className="or-wait-pair">
                      {candidates.map((candidate) => (
                        <div key={candidate.number}>
                          <CandidatePortrait name={candidate.name} />
                          <strong>{candidate.name}</strong>
                          <small>{candidate.party} · aguardando votos</small>
                        </div>
                      ))}
                    </div>
                    <button className="or-link" onClick={() => onGo('alerts')}>
                      Escolher alertas <ArrowRight size={15} />
                    </button>
                    <button className="or-link" onClick={() => onGo('live')}>
                      Abrir acompanhamento completo <ArrowUpRight size={15} />
                    </button>
                  </div>
                )}
                {pair.map((c) => {
                  return (
                    <button
                      key={c.number}
                      className="or-contender"
                      aria-pressed={focus === c.number}
                      onClick={() => setFocus(focus === c.number ? '' : c.number)}
                      style={{ '--contender': resultColor(c.number) } as React.CSSProperties}
                    >
                      <div className="or-person">
                        <CandidatePortrait name={c.name} />
                        <div>
                          <strong>{candidateName(c.name)}</strong>
                          <small>
                            {c.party} ·{' '}
                            {focus === c.number ? 'Destaque no mapa' : 'Destacar no mapa'}
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
                        recebeu mais votos em{' '}
                        <strong>
                          {leadingStates} estados
                          {leadsFederalDistrict ? ' e no Distrito Federal' : ''}
                        </strong>{' '}
                        neste turno. Toque novamente para retirar o destaque.
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
              <Layers size={13} /> {turn}º turno · votos válidos ·{' '}
              {year === 2026
                ? waiting
                  ? 'aguardando divulgação oficial'
                  : current && 'counted' in current
                    ? `${pct(current.counted)} das seções`
                    : 'soma dos votos dos estados da região'
                : 'acervo do TSE'}
            </span>
            {current && (
              <a href={current.source} target="_blank" rel="noreferrer">
                Fonte: TSE <ArrowUpRight size={13} />
              </a>
            )}
          </div>
          {current && 'missingStates' in current && current.missingStates > 0 && (
            <p className="or-coverage-note">
              Faltam registros de {current.missingStates} estado(s) neste recorte.
            </p>
          )}
          {year === 1994 && uf === 'BR' && region === 'Brasil' && (
            <p className="or-coverage-note">
              O total de 1994 nesta base soma os votos no país; os votos no exterior não estão
              incluídos.
            </p>
          )}
          <RegionalResults data={data} turn={turn} region={region} onRegion={onRegion} />
          <details className="or-archive-sources">
            <summary>Fontes dos resultados e retratos</summary>
            <p>
              Resultados consolidados pelo TSE por município e zona eleitoral. Os retratos
              identificam os candidatos e podem ter sido feitos em outro ano.
            </p>
            {year === 1998 && (
              <p>
                1998 usa o campo de votos nominais válidos do arquivo gerado pelo TSE em 20/09/2023.
                Esses totais diferem ligeiramente de boletins históricos: preservamos os números
                desta base sem misturar versões.
              </p>
            )}
            <a href="/creditos#retratos-historicos" target="_blank" rel="noreferrer">
              Autoria e licenças das fotos <ArrowUpRight size={14} />
            </a>
          </details>
        </section>
        <aside className="or-moment">
          <div className="or-section-head">
            <div>
              <span className="or-overline">AGORA NO OBSERVATÓRIO</span>
              <h2>O próximo acontecimento.</h2>
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
                  {'turnout' in current &&
                  current.turnout > 0 &&
                  Number.isFinite(current.abstention)
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
              <h2>Como estão as pesquisas.</h2>
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
                Escolha uma data para ver a pesquisa publicada. Os institutos e as amostras são
                diferentes; estes números não são uma previsão do resultado.
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
              <p className="or-context-intro">
                Noticiário nacional, com veículo, data e acesso à origem.
              </p>
            </div>
            <button className="or-link" onClick={() => onGo('social')}>
              Ver cobertura <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="or-context-stories">
            {media?.articles?.length ? (
              media.articles.slice(0, 3).map((article, index) => (
                <a
                  className={index === 0 ? 'or-story or-story-lead' : 'or-story'}
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  key={article.url}
                >
                  <NewsVisual
                    url={article.url}
                    title={article.title}
                    source={article.source}
                    preview={article.image}
                  />
                  <div className="or-story-copy">
                    <span className="or-story-meta">
                      {article.source} · {formatDate(article.publishedAt)}
                    </span>
                    <h3>{article.title}</h3>
                    {index === 0 && (
                      <span className="or-story-action">
                        Ler na origem <ArrowUpRight size={15} />
                      </span>
                    )}
                  </div>
                  {index > 0 && <ArrowUpRight size={17} aria-hidden="true" />}
                </a>
              ))
            ) : (
              <p className="or-empty" role="status">
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
