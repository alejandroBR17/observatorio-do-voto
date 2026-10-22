'use client';
import { useEffect, useRef, useState } from 'react';
import { useDetailLearning } from '../personalization';
import { ArrowUpRight, Bookmark, Newspaper, ShieldCheck, X } from 'lucide-react';

import { candidates } from '@/lib/content';
import { Disclosure, ExpandList } from '../disclosure';
import { useReading } from '../reading';
import { NewsVisual } from '../news-visual';
import { DataFreshness } from '../components/data-freshness';
import { CandidatePortrait } from '../components/candidate-portrait';

import { pollNumbers, type PollBasis } from '@/lib/poll-view';
import { type NotebookEntry } from '@/lib/notebook';
import { useRemote } from '../hooks/use-remote';
import { Source as Link } from '../components/source-link';
import {
  formatDate as date,
  formatDateTime as time,
  formatCompactPercent,
} from '@/lib/presentation';
import type { PollSnapshot, PollResponse } from '@/lib/polls/types';
const instituteFamily = (name: string) =>
  name.startsWith('AtlasIntel') ? 'AtlasIntel' : name.startsWith('PoderData') ? 'PoderData' : name;
const percent = (n: number) => formatCompactPercent(n);
function PollCard({
  poll: original,
  compact = false,
  basis,
  onNote,
  observatory = false,
}: {
  poll: PollSnapshot;
  compact?: boolean;
  observatory?: boolean;
  basis?: PollBasis;
  onNote?: (note: Pick<NotebookEntry, 'title' | 'body' | 'topic' | 'uf'>) => void;
}) {
  const { reading } = useReading();
  const [detailsOpen, setDetailsOpen] = useState(reading === 'detailed');
  const detailsTouched = useRef(false);
  const detailLearning = useDetailLearning();
  useEffect(() => {
    if (!detailsTouched.current) setDetailsOpen(reading === 'detailed');
  }, [reading]);
  const requested = basis || original.basis,
    numbers = pollNumbers(original, requested),
    poll = { ...original, ...(numbers || {}), basis: requested };
  return (
    <section className={compact ? 'poll-summary' : 'panel poll-card'}>
      <div className="panel-head">
        <div>
          <span className="eyebrow">
            {poll.basis === 'valid' ? 'VOTOS VÁLIDOS' : 'VOTOS TOTAIS'} · 2º TURNO
          </span>
          <h2>{poll.institute}</h2>
        </div>
        <span className="subtle-tag">
          Publicada
          <br />
          {date(poll.publishedAt)}
        </span>
      </div>
      {numbers ? (
        <>
          <div className="poll-numbers">
            {candidates.map((c) => (
              <div key={c.number}>
                <div className="portrait small">
                  <img src={c.photo} alt="" />
                </div>
                <span>{c.name}</span>
                <strong
                  style={{ color: c.number === '22' ? 'var(--candidate-a)' : 'var(--candidate-b)' }}
                >
                  {percent(c.number === '22' ? poll.flavio : poll.lula)}
                </strong>
              </div>
            ))}
          </div>
          <div className="split-bar">
            <div style={{ width: poll.flavio + '%', background: '#24796d' }} />
            <div style={{ width: poll.lula + '%', background: '#c96856' }} />
          </div>
        </>
      ) : (
        <p className="poll-basis-unavailable">
          Este instituto não publicou números nesta base para este levantamento. Troque a
          visualização para consultar a base disponível.
        </p>
      )}
      <p className="basis-caption">
        {requested === 'valid'
          ? 'Percentuais entre quem escolheu um candidato.'
          : 'Percentuais de todas as respostas, incluindo brancos, nulos e indecisos.'}
      </p>
      <div className="poll-caption">
        <span>
          {poll.margin != null
            ? 'Margem ±' +
              poll.margin.toLocaleString('pt-BR') +
              (reading === 'essential' ? ' pontos percentuais' : ' p.p.')
            : 'Margem não identificada'}
        </span>
        <span>
          {poll.sample?.toLocaleString('pt-BR') || 'Amostra não identificada'}{' '}
          {poll.sample ? 'entrevistas' : ''}
        </span>
      </div>
      {!observatory && <PollMethodology poll={poll} />}
      <details className="inline-details" open={detailsOpen}>
        <summary
          onClick={(event) => {
            event.preventDefault();
            detailsTouched.current = true;
            detailLearning(!detailsOpen);
            setDetailsOpen(!detailsOpen);
          }}
        >
          Detalhes da pesquisa
        </summary>
        {observatory && <PollMethodology poll={poll} />}
        <p className="fine">
          Base:{' '}
          {poll.basis === 'valid'
            ? 'votos válidos, excluindo brancos, nulos e indecisos'
            : 'votos totais, incluindo brancos, nulos e indecisos'}
          .
        </p>
        {poll.basis === 'total' && poll.totalVotes && (
          <p className="fine">
            {poll.totalVotes.other != null ? (
              <>
                {poll.totalVotes.otherLabel ||
                  'Brancos, nulos e indecisos (grupo divulgado pela fonte)'}
                : {percent(poll.totalVotes.other)}.
                {poll.totalVotes.undecided != null && (
                  <> Indecisos: {percent(poll.totalVotes.undecided)}.</>
                )}
              </>
            ) : (
              <>
                Brancos e nulos:{' '}
                {poll.totalVotes.blankNull != null
                  ? percent(poll.totalVotes.blankNull)
                  : 'Não separados'}{' '}
                · Indecisos:{' '}
                {poll.totalVotes.undecided != null
                  ? percent(poll.totalVotes.undecided)
                  : 'Não separados'}
                .
              </>
            )}
          </p>
        )}
        {numbers && (
          <p className="fine">
            Diferença entre os candidatos:{' '}
            {Math.abs(poll.flavio - poll.lula).toLocaleString('pt-BR', {
              maximumFractionDigits: 1,
            })}{' '}
            pontos percentuais.
          </p>
        )}
        {poll.mode === 'snapshot' && poll.note && <p className="fine">{poll.note}</p>}
        <Link iconSize={13} href={poll.source}>
          Publicação e metodologia
        </Link>
        {poll.metadataSource && poll.metadataSource !== poll.source && (
          <Link iconSize={13} href={poll.metadataSource}>
            {poll.registryCheckedAt ? 'Registro consultado no TSE' : 'Fonte da ficha da pesquisa'}
          </Link>
        )}
      </details>
      {onNote && (
        <button
          className="text-button context-note"
          onClick={() =>
            onNote({
              title: `${original.institute} · pesquisa de ${date(original.publishedAt)}`,
              body: `Pesquisa de ${original.institute} · publicada em ${date(original.publishedAt)}\nEntrevistas: ${original.fieldwork || 'não informado'}\n${numbers ? `Flávio: ${percent(numbers.flavio)} · Lula: ${percent(numbers.lula)}\nBase: ${requested === 'valid' ? 'entre quem escolheu candidato' : 'todas as respostas'}\n` : 'Base selecionada não publicada.\n'}Fonte: ${original.source}\n\nMinha observação:\n`,
              topic: 'Pesquisas',
              uf: 'BR',
            })
          }
        >
          Anotar sobre esta pesquisa
          <Bookmark size={14} />
        </button>
      )}
    </section>
  );
}
function PollMethodology({ poll }: { poll: PollSnapshot }) {
  return (
    <>
      <p className="fine">Entrevistas: {poll.fieldwork || 'período não informado'}</p>
      <p className="fine">
        Contratante: {poll.contractor || 'Ainda não confirmado na fonte original'}.
      </p>
      <p className="fine">
        Confiança: {poll.confidence != null ? poll.confidence + '%' : 'Não informada'} · Registro:{' '}
        {poll.registration || 'Não identificado'}.
      </p>
    </>
  );
}
export function PollOverview({ onExplore }: { onExplore: () => void }) {
  const { data, loading } = useRemote<PollResponse>('/api/polls', 300000);
  const p = data?.polls?.find((p: PollSnapshot) => p.basis === 'valid');
  return (
    <section className="panel poll-panel">
      <span className="eyebrow">SINAIS / ÚLTIMO LEVANTAMENTO</span>
      {p ? (
        <PollCard poll={p} compact />
      ) : (
        <>
          <h2>O que dizem as pesquisas</h2>
          <p>
            {loading
              ? 'Consultando publicações…'
              : data?.message || 'Nenhum resultado confirmado disponível.'}
          </p>
        </>
      )}
      <DataFreshness
        checkedAt={data?.checkedAt}
        stale={data?.stale || data?.status === 'stale'}
        unavailable={data?.status === 'unavailable'}
      />
      <button className="text-button" onClick={onExplore}>
        Comparar pesquisas
        <ArrowUpRight size={15} />
      </button>
    </section>
  );
}
export function PollExplorer({
  onNote,
  observatory = false,
}: {
  onNote?: (note: Pick<NotebookEntry, 'title' | 'body' | 'topic' | 'uf'>) => void;
  observatory?: boolean;
}) {
  const { data, loading } = useRemote<PollResponse>('/api/polls', 300000),
    [institute, setInstitute] = useState('Todos'),
    [basis, setBasis] = useState<PollBasis>('valid');
  const polls: PollSnapshot[] = data?.polls || [],
    filtered = polls.filter(
      (p) => institute === 'Todos' || instituteFamily(p.institute) === institute,
    );
  const institutes = Array.from(
    new Set<string>([
      ...polls.map((p) => instituteFamily(p.institute)),
      ...(data?.publications || []).map((p) => instituteFamily(p.institute)),
    ]),
  );
  const publications = (data?.publications || []).filter(
    (p) => institute === 'Todos' || instituteFamily(p.institute) === institute,
  );
  return (
    <div
      className={observatory ? 'or-poll-explorer' : undefined}
      style={observatory ? undefined : { display: 'contents' }}
    >
      <section className="panel discovery-head">
        <div>
          <span className="eyebrow">
            {observatory ? '01 / OBSERVAR E COMPARAR' : 'SINAIS / DIFERENTES INSTITUTOS'}
          </span>
          {!observatory && (
            <>
              <h2>O retrato de cada pesquisa.</h2>
              <p>Compare os institutos e o período das entrevistas.</p>
            </>
          )}
        </div>
        <DataFreshness
          checkedAt={data?.checkedAt}
          stale={data?.stale || data?.status === 'stale'}
          unavailable={data?.status === 'unavailable'}
        />
      </section>
      {data?.stale || data?.status === 'stale' || data?.status === 'unavailable' ? (
        <div className="notice">
          {data?.message ||
            'A consulta está indisponível ou em atualização. Os registros anteriores continuam identificados por data.'}
        </div>
      ) : null}
      <div className="filters">
        <div className="filter-selects">
          <label>
            Instituto{' '}
            <select
              aria-label="Instituto de pesquisa"
              value={institute}
              onChange={(e) => setInstitute(e.target.value)}
            >
              <option>Todos</option>
              {institutes.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="basis-switch" role="group" aria-label="Visualização dos percentuais">
        <button aria-pressed={basis === 'valid'} onClick={() => setBasis('valid')}>
          {observatory ? 'Votos válidos' : 'Entre quem escolheu um candidato'}
        </button>
        <button aria-pressed={basis === 'total'} onClick={() => setBasis('total')}>
          {observatory ? 'Todas as respostas' : 'Incluindo brancos, nulos e indecisos'}
        </button>
      </div>
      <p className="basis-explanation">
        {observatory
          ? basis === 'valid'
            ? 'Somente escolhas por candidatos. Brancos, nulos e indecisos ficam de fora.'
            : 'Inclui candidatos, brancos, nulos e indecisos.'
          : basis === 'valid'
            ? 'Quem não escolheu um candidato fica fora desta conta. As escolhas por candidatos passam a representar 100%.'
            : 'Todas as respostas entram na conta. Por isso, os percentuais dos candidatos podem somar menos de 100%.'}{' '}
        {!observatory && 'Os números continuam sendo os publicados pelo instituto.'}
      </p>
      {!observatory && (
        <details className="inline-details basis-example">
          <summary>Por que os percentuais mudam?</summary>
          <p>
            Exemplo fictício: em 100 entrevistas, A recebe 45 escolhas, B recebe 40 e outras
            respostas somam 15. Contando todas as respostas, A tem 45%. Entre as 85 escolhas por
            candidatos, A tem 52,9%. É o mesmo levantamento, com uma base diferente.
          </p>
        </details>
      )}
      <div className="active-filters">
        {!observatory && (
          <>
            <span>{institute === 'Todos' ? 'Todos os institutos' : institute}</span>
            <span>{basis === 'valid' ? 'Escolhas por candidatos' : 'Todas as respostas'}</span>
          </>
        )}
        {(institute !== 'Todos' || basis !== 'valid') && (
          <button
            className="text-button"
            onClick={() => {
              setInstitute('Todos');
              setBasis('valid');
            }}
          >
            Limpar filtros
            <X size={13} />
          </button>
        )}
      </div>
      {observatory && !loading && <PollTimeline key={institute} polls={filtered} basis={basis} />}
      {loading ? (
        <div className="loading">Consultando institutos…</div>
      ) : (
        <ExpandList
          key={`${institute}:${basis}`}
          items={filtered}
          initial={observatory ? 2 : 4}
          className="poll-grid"
          moreLabel="Ver mais pesquisas"
          lessLabel="Ver menos pesquisas"
          render={(p) => (
            <PollCard key={p.id} poll={p} basis={basis} onNote={onNote} observatory={observatory} />
          )}
        />
      )}
      {!loading && !filtered.length && (
        <div className="notice">Nenhum resultado numérico confirmado para este filtro.</div>
      )}
      {filtered.length > 0 && (
        <Disclosure
          title="Comparação lado a lado"
          learnDetails
          summary={`${filtered.length} resultados · tabela detalhada por instituto`}
        >
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Tabela de dados; deslize ou use as setas para ver mais colunas"
          >
            <table>
              <thead>
                <tr>
                  <th>Instituto / publicação</th>
                  <th>Base</th>
                  <th>Flávio Bolsonaro</th>
                  <th>Lula</th>
                  <th>Margem (p.p.)</th>
                  <th>Amostra</th>
                  <th>Confiança</th>
                  <th>Registro</th>
                  <th>Contratante</th>
                  <th>Origem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.institute}
                      <small className="block">{date(p.publishedAt)}</small>
                    </td>
                    <td>{basis === 'valid' ? 'Escolhas por candidatos' : 'Todas as respostas'}</td>
                    <td style={{ color: 'var(--candidate-a)' }}>
                      {pollNumbers(p, basis)
                        ? percent(pollNumbers(p, basis)!.flavio)
                        : 'Não publicada'}
                    </td>
                    <td style={{ color: 'var(--candidate-b)' }}>
                      {pollNumbers(p, basis)
                        ? percent(pollNumbers(p, basis)!.lula)
                        : 'Não publicada'}
                    </td>
                    <td>
                      {p.margin != null
                        ? '±' + p.margin.toLocaleString('pt-BR') + ' p.p.'
                        : 'Não informada'}
                    </td>
                    <td>{p.sample?.toLocaleString('pt-BR') || 'Não informada'}</td>
                    <td>{p.confidence != null ? p.confidence + '%' : 'Não informado'}</td>
                    <td>{p.registration || 'Não identificado'}</td>
                    <td>{p.contractor || 'Não confirmado'}</td>
                    <td>
                      <Link iconSize={13} href={p.source}>
                        Consultar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine">
            Coletas e métodos diferentes. Não calculamos uma média automática nem probabilidade de
            vitória.
          </p>
        </Disclosure>
      )}
      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">DESCOBERTA AUTOMÁTICA</span>
            <h2>Publicações mais recentes</h2>
          </div>
          <Newspaper size={22} />
        </div>
        <p className="fine">
          Consulte a publicação original para conhecer o cenário e a metodologia.
        </p>
        <ExpandList
          className="news-grid"
          items={publications}
          initial={4}
          moreLabel="Ver mais publicações"
          lessLabel="Ver menos publicações"
          render={(p) => (
            <a className="news-card" key={p.url} href={p.url} target="_blank" rel="noreferrer">
              <NewsVisual url={p.url} title={p.title} source={p.publisher || p.institute} />
              <div className="news-copy">
                <span className="eyebrow">
                  {p.institute}
                  {p.publisher ? ' · ' + p.publisher : ''} ·{' '}
                  {p.dateOnly ? date(p.publishedAt) : time(p.publishedAt)}
                </span>
                <h3>{p.title}</h3>
                <span className="text-button">
                  Ler na origem
                  <ArrowUpRight size={14} />
                </span>
              </div>
            </a>
          )}
        />
        {!publications.length && !loading && <p>Nenhuma publicação disponível para este filtro.</p>}
      </section>
      <Disclosure
        title="Fontes e metodologia"
        learnDetails
        summary="Disponibilidade dos institutos e critérios de atualização"
      >
        <div className="source-health">
          {(data?.sources || []).map((s) => (
            <div key={s.name}>
              <span className={'status-dot ' + (['ok', 'empty'].includes(s.status) ? 'ok' : '')} />
              <div>
                <strong>{s.name}</strong>
                <small>
                  {s.status === 'ok'
                    ? 'Conectada'
                    : s.status === 'empty'
                      ? 'Conectada · nenhuma publicação identificada'
                      : 'Indisponível nesta consulta'}
                </small>
              </div>
              <Link iconSize={13} href={s.url}>
                Fonte
              </Link>
            </div>
          ))}
        </div>
        <div className="notice">
          <ShieldCheck size={18} />
          Os resultados mantêm a base e a data de cada instituto. Novas publicações aparecem quando
          identificadas nos canais consultados; os percentuais só entram após conferência. A data da
          consulta não é a data de uma nova pesquisa.
        </div>
        <Link
          iconSize={13}
          href="https://pesqele-divulgacao.tse.jus.br/app/pesquisa/listar30dias.xhtml"
        >
          Verificar registro no PesqEle · TSE
        </Link>
      </Disclosure>
    </div>
  );
}

function PollTimeline({ polls, basis }: { polls: PollSnapshot[]; basis: PollBasis }) {
  const [selectedId, setSelectedId] = useState('');
  const ordered = [...polls].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const selected = ordered.find((poll) => poll.id === selectedId) || ordered[0];
  if (!selected) return null;
  const numbers = pollNumbers(selected, basis);
  return (
    <section className="or-poll-observation" aria-label="Explorar pesquisas no tempo">
      <div className="or-section-head">
        <div>
          <span className="or-overline">PERCORRA AS DIVULGAÇÕES</span>
          <h2>Intenções de voto</h2>
        </div>
        <span className="or-source">2º turno · Nacional</span>
      </div>
      <label className="or-research-picker">
        Divulgação
        <select
          aria-label="Divulgação da pesquisa"
          value={selected.id}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {ordered.map((poll) => (
            <option key={poll.id} value={poll.id}>
              {date(poll.publishedAt)} · {poll.institute}
            </option>
          ))}
        </select>
      </label>
      <div className="or-research-timeline" role="group" aria-label="Escolher divulgação">
        {ordered.map((poll) => (
          <button
            key={poll.id}
            aria-pressed={selected.id === poll.id}
            onClick={() => setSelectedId(poll.id)}
          >
            <span>{date(poll.publishedAt)}</span>
            <strong>{poll.institute}</strong>
          </button>
        ))}
      </div>
      <div className="or-poll-reading" aria-live="polite" aria-atomic="true">
        <div className="or-poll-selected">
          <h3>{selected.institute}</h3>
          <p>
            Divulgado em {date(selected.publishedAt)} ·{' '}
            {basis === 'valid' ? 'Votos válidos' : 'Todas as respostas'}
          </p>
        </div>
        <>
          <div className="or-poll-bars">
            {candidates.map((candidate) => {
              const value = numbers
                ? candidate.number === '22'
                  ? numbers.flavio
                  : numbers.lula
                : null;
              return (
                <div
                  key={candidate.number}
                  style={
                    {
                      '--poll-color':
                        candidate.number === '22' ? 'var(--data-flavio)' : 'var(--data-lula)',
                    } as React.CSSProperties
                  }
                >
                  <div className="or-poll-person">
                    <CandidatePortrait name={candidate.name} />
                    <div>
                      <span>{candidate.name}</span>
                      <small>{candidate.party}</small>
                    </div>
                    <strong>{value === null ? '—' : percent(value)}</strong>
                  </div>
                  {value !== null && (
                    <div className="or-poll-track">
                      <i style={{ width: `${value}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
        {!numbers && (
          <p className="notice">
            Esta base não foi publicada neste levantamento. Selecione a outra visualização para
            consultar os números disponíveis.
          </p>
        )}
        <div className="or-poll-facts">
          <span>
            <strong>
              {selected.margin != null
                ? `±${selected.margin.toLocaleString('pt-BR')} p.p.`
                : 'Não informada'}
            </strong>
            Margem de erro
          </span>
          <span>
            <strong>{selected.sample?.toLocaleString('pt-BR') || 'Não informada'}</strong>
            Entrevistas
          </span>
          <Link href={selected.source}>Consultar a origem</Link>
        </div>
        <details className="inline-details or-selected-methodology">
          <summary>Coleta, registro e metodologia</summary>
          <PollMethodology poll={selected} />
          {selected.note && <p className="fine">{selected.note}</p>}
          {selected.metadataSource && selected.metadataSource !== selected.source && (
            <Link href={selected.metadataSource}>Consultar ficha da pesquisa</Link>
          )}
          <p className="fine">
            Usamos a base publicada pelo instituto, sem estimar percentuais ausentes. Votos válidos
            excluem brancos, nulos e indecisos; todas as respostas os incluem.
          </p>
        </details>
      </div>
      <p className="or-poll-caution">
        Pesquisas podem ter métodos e períodos de coleta diferentes. Compare também a metodologia;
        os números não são uma previsão do resultado.
      </p>
    </section>
  );
}
