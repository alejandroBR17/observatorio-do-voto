'use client';
import { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  RefreshCw,
  Share2,
  Bell,
  MapPin,
  Check,
  Bookmark,
  Newspaper,
  ShieldCheck,
  Plus,
  X,
} from 'lucide-react';
import { states, Result } from '@/lib/elections';
import { candidates } from '@/lib/content';
import { Disclosure, ExpandList } from './disclosure';
import { useReading } from './reading';
import { NewsVisual } from './news-visual';
import { Map } from './geo-map';
import { Notebook } from './notebook';
import { pollNumbers, type PollBasis } from '@/lib/poll-view';
import { readWatch, type NotebookEntry } from '@/lib/notebook';
type Poll = {
  confidence?: number | null;
  note?: string;
  totalVotes?: {
    flavio: number;
    lula: number;
    blankNull?: number;
    undecided?: number;
    other?: number;
  };
  id: string;
  institute: string;
  publishedAt: string;
  fieldwork: string;
  flavio: number;
  lula: number;
  basis: string;
  margin: number | null;
  sample: number | null;
  registration: string;
  source: string;
  mode: string;
};
const date = (v: string) => {
  if (!v) return 'Data não informada';
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T12:00:00Z' : v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};
const time = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? 'Não informado'
    : d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};
const instituteFamily = (name: string) =>
  name.startsWith('AtlasIntel') ? 'AtlasIntel' : name.startsWith('PoderData') ? 'PoderData' : name;
const percent = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="source" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={13} />
    </a>
  );
}
function useRemote(url: string, interval: number) {
  const [data, setData] = useState<any>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let canceled = false,
      attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error();
        const j: any = await r.json();
        if (canceled) return;
        setData(j);
        if (j.status === 'loading' && attempt++ < 12) {
          retry = setTimeout(run, 2000);
          return;
        }
        setLoading(false);
        attempt = 0;
      } catch {
        if (!canceled) {
          setLoading(false);
          setData((d: any) =>
            d
              ? { ...d, status: 'stale' }
              : { status: 'unavailable', message: 'Sem conexão com a fonte. Tente novamente.' },
          );
        }
      }
    };
    const resume = () => {
      if (document.visibilityState === 'visible') run();
    };
    run();
    const id = setInterval(run, interval);
    document.addEventListener('visibilitychange', resume);
    return () => {
      canceled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', resume);
      if (retry) clearTimeout(retry);
    };
  }, [url, interval]);
  return { data, loading };
}
function PollCard({
  poll: original,
  compact = false,
  basis,
  onNote,
}: {
  poll: Poll;
  compact?: boolean;
  basis?: PollBasis;
  onNote?: (note: Pick<NotebookEntry, 'title' | 'body' | 'topic' | 'uf'>) => void;
}) {
  const { reading } = useReading();
  const requested = basis || (original.basis as PollBasis),
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
      <p className="fine">Entrevistas: {poll.fieldwork || 'período não informado'}</p>
      <details className="inline-details" key={reading} open={reading === 'detailed'}>
        <summary>Detalhes da pesquisa</summary>
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
                Brancos, nulos e indecisos (grupo divulgado pela fonte):{' '}
                {percent(poll.totalVotes.other)}.
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
        <p className="fine">
          Registro: {poll.registration || 'Não identificado'}. Nível de confiança:{' '}
          {poll.confidence != null ? poll.confidence + '%' : 'Não informado'}.{' '}
          {numbers && (
            <>
              Diferença entre os candidatos:{' '}
              {Math.abs(poll.flavio - poll.lula).toLocaleString('pt-BR', {
                maximumFractionDigits: 1,
              })}{' '}
              pontos percentuais.
            </>
          )}
        </p>
        {poll.mode === 'snapshot' && poll.note && <p className="fine">{poll.note}</p>}
        <Link href={poll.source}>Publicação e metodologia</Link>
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
export function PollOverview({ onExplore }: { onExplore: () => void }) {
  const { data, loading } = useRemote('/api/polls', 300000);
  const p = data?.polls?.find((p: Poll) => p.basis === 'valid');
  return (
    <section className="panel poll-panel">
      <span className="eyebrow">PAINEL DE PESQUISAS</span>
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
      <div className="update-note">
        <RefreshCw size={12} />
        {data?.checkedAt
          ? 'Fontes consultadas: ' + time(data.checkedAt)
          : 'Atualização automática a cada 5 minutos'}
      </div>
      <button className="text-button" onClick={onExplore}>
        Comparar pesquisas
        <ArrowUpRight size={15} />
      </button>
    </section>
  );
}
export function PollExplorer({
  onNote,
}: {
  onNote?: (note: Pick<NotebookEntry, 'title' | 'body' | 'topic' | 'uf'>) => void;
}) {
  const { data, loading } = useRemote('/api/polls', 300000),
    [institute, setInstitute] = useState('Todos'),
    [basis, setBasis] = useState<PollBasis>('valid');
  const polls: Poll[] = data?.polls || [],
    filtered = polls.filter(
      (p) => institute === 'Todos' || instituteFamily(p.institute) === institute,
    );
  const institutes = Array.from(
    new Set<string>([
      ...polls.map((p) => instituteFamily(p.institute)),
      ...(data?.publications || []).map((p: any) => instituteFamily(p.institute)),
    ]),
  );
  const publications = (data?.publications || []).filter(
    (p: any) => institute === 'Todos' || instituteFamily(p.institute) === institute,
  );
  return (
    <>
      <section className="panel discovery-head">
        <div>
          <span className="eyebrow">VÁRIOS INSTITUTOS · UMA VISÃO MAIS AMPLA</span>
          <h2>Intenções de voto.</h2>
          <p>Compare os institutos e o período das entrevistas.</p>
        </div>
        <div className="update-note">
          <RefreshCw size={15} />
          <span>
            Consulta a cada 5 min
            <br />
            {data?.checkedAt ? time(data.checkedAt) : 'Consultando fontes'}
          </span>
        </div>
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
          Entre quem escolheu um candidato
        </button>
        <button aria-pressed={basis === 'total'} onClick={() => setBasis('total')}>
          Incluindo brancos, nulos e indecisos
        </button>
      </div>
      <p className="basis-explanation">
        {basis === 'valid'
          ? 'Quem não escolheu um candidato fica fora desta conta. As escolhas por candidatos passam a representar 100%.'
          : 'Todas as respostas entram na conta. Por isso, os percentuais dos candidatos podem somar menos de 100%.'}{' '}
        Os números continuam sendo os publicados pelo instituto.
      </p>
      <details className="inline-details basis-example">
        <summary>Por que os percentuais mudam?</summary>
        <p>
          Exemplo fictício: em 100 entrevistas, A recebe 45 escolhas, B recebe 40 e outras respostas
          somam 15. Contando todas as respostas, A tem 45%. Entre as 85 escolhas por candidatos, A
          tem 52,9%. É o mesmo levantamento, com uma base diferente.
        </p>
      </details>
      <div className="active-filters">
        <span>{institute === 'Todos' ? 'Todos os institutos' : institute}</span>
        <span>{basis === 'valid' ? 'Escolhas por candidatos' : 'Todas as respostas'}</span>
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
      {loading ? (
        <div className="loading">Consultando institutos…</div>
      ) : (
        <div className="poll-grid">
          {filtered.map((p) => (
            <PollCard key={p.id} poll={p} basis={basis} onNote={onNote} />
          ))}
        </div>
      )}
      {!loading && !filtered.length && (
        <div className="notice">Nenhum resultado numérico confirmado para este filtro.</div>
      )}
      {filtered.length > 0 && (
        <Disclosure
          title="Comparação lado a lado"
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
                    <td>
                      <Link href={p.source}>Consultar</Link>
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
          render={(p: any) => (
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
        summary="Disponibilidade dos institutos e critérios de atualização"
      >
        <div className="source-health">
          {(data?.sources || []).map((s: any) => (
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
              <Link href={s.url}>Fonte</Link>
            </div>
          ))}
        </div>
        <div className="notice">
          <ShieldCheck size={18} />
          Os resultados mantêm a base e a data de cada instituto. Novas publicações aparecem quando
          identificadas nos canais consultados; os percentuais só entram após conferência. A data da
          consulta não é a data de uma nova pesquisa.
        </div>
        <Link href="https://pesqele-divulgacao.tse.jus.br/app/pesquisa/listar30dias.xhtml">
          Verificar registro no PesqEle · TSE
        </Link>
      </Disclosure>
    </>
  );
}

function ClockLabel({ value }: { value: string }) {
  const zoned = /Z$|[+-]\d{2}:\d{2}$/.test(value) ? value : value + '-03:00';
  return <strong>Última coleta da fonte: {time(zoned)}.</strong>;
}
export function MediaExplorer() {
  const { data, loading } = useRemote('/api/media', 300000);
  return (
    <>
      <section className="panel discovery-head">
        <div>
          <span className="eyebrow">INFORMAÇÃO PÚBLICA · SEM PERFILAR ELEITORES</span>
          <h2>O debate também acontece fora da urna.</h2>
          <p>Cobertura da imprensa por candidato, com links para as publicações originais.</p>
        </div>
        <div className="update-note">
          <RefreshCw size={15} />
          <span>
            Consulta do app
            <br />
            {data?.checkedAt ? time(data.checkedAt) : 'Consultando…'}
          </span>
        </div>
      </section>
      {data?.stats && (
        <div className="notice">
          <ClockLabel value={data.stats.updated} />
          <span>
            A fonte coleta às 7h, 10h, 13h, 16h e 21h (Brasília). Esse horário vale para o acervo de
            estatísticas. Os links da Folha e do G1 são consultados também a cada 5 minutos.
          </span>
        </div>
      )}
      {loading ? (
        <div className="loading">Consultando a cobertura…</div>
      ) : (
        <>
          {data?.message && <div className="notice">{data.message}</div>}
          {data?.stats && (
            <>
              <div className="stats-grid media-stats">
                {[
                  ['MATÉRIAS DE IMPRENSA', data.stats.articles],
                  ['FONTES DE IMPRENSA', data.stats.sources],
                  ['PUBLICADAS HOJE', data.stats.today],
                ].map(([l, v]) => (
                  <div className="stat" key={l}>
                    <span className="eyebrow">{l}</span>
                    <strong>{Number(v).toLocaleString('pt-BR')}</strong>
                    <small>Acervo monitorado pela fonte</small>
                  </div>
                ))}
              </div>
              <section className="panel">
                <h2>Menções aos candidatos</h2>
                <div className="regional-bars">
                  {data.candidates.map((c: any) => (
                    <div className="mention-row" key={c.slug}>
                      <div>
                        <strong>{c.name}</strong>
                        <span>{c.articles.toLocaleString('pt-BR')} matérias</span>
                      </div>
                      <div className="bar-track">
                        <div
                          style={{
                            width:
                              (100 * c.articles) /
                                Math.max(...data.candidates.map((x: any) => x.articles), 1) +
                              '%',
                            background: c.slug === 'lula-silva' ? '#c96856' : '#24796d',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="fine">
                  Uma matéria pode citar ambos. Volume de cobertura não equivale a apoio, alcance
                  nas redes ou intenção de voto. Recorte desde {date(data.stats.cutoff)}. Coleta
                  informada pela fonte: {data.stats.updated}.
                </p>
              </section>
            </>
          )}
        </>
      )}
      {data?.articles?.length > 0 && (
        <section className="panel">
          <h2>No noticiário</h2>
          <ExpandList
            className="news-grid"
            items={data.articles || []}
            initial={4}
            moreLabel="Ver mais notícias"
            lessLabel="Ver menos notícias"
            render={(a: any) => (
              <a className="news-card" href={a.url} target="_blank" rel="noreferrer" key={a.id}>
                <NewsVisual url={a.url} title={a.title} source={a.source} />
                <div className="news-copy">
                  <span className="eyebrow">
                    {a.source} · {time(a.publishedAt)}
                  </span>
                  <h3>{a.title}</h3>
                  <span className="text-button">
                    Ler na origem
                    <ArrowUpRight size={14} />
                  </span>
                </div>
              </a>
            )}
          />
        </section>
      )}
      <Disclosure title="Fontes e critérios" summary="Origem dos dados e limites da cobertura">
        <div className="source-grid">
          <div>
            <strong>TSE · resultados</strong>
            <p>
              Apuração oficial e acervo presidencial. Registros históricos de 1994–1998 têm
              cobertura incompleta.
            </p>
            <Link href="https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados">
              Fonte dos resultados
            </Link>
          </div>
          <div>
            <strong>IBGE · território</strong>
            <p>Malha por unidade da federação e classificação por região.</p>
            <Link href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3">
              Malha por estado
            </Link>
          </div>
          <div>
            <strong>SapiensLabs · imprensa</strong>
            <p>
              Cobertura pública de imprensa, coletada cinco vezes ao dia. O app consulta o acervo a
              cada 5 minutos. A coleta dos dados ocorre nos horários informados pela fonte.
            </p>
            <Link href="https://eleicoes2026.sapienslabs.com.br/api">
              SapiensLabs — Eleições 2026 · CC BY 4.0
            </Link>
          </div>
        </div>
        <div className="source-health">
          {(data?.feedSources || []).map((s: any) => (
            <div key={s.name}>
              <span className={'status-dot ' + (s.status === 'ok' ? 'ok' : '')} />
              <div>
                <strong>{s.name} · notícias</strong>
                <small>
                  {s.status === 'ok' ? 'Canal consultado' : 'Indisponível nesta consulta'} ·{' '}
                  {time(s.checkedAt)}
                </small>
              </div>
              <Link href={s.url}>Fonte</Link>
            </div>
          ))}
        </div>
        <div className="notice">
          A cobertura usa publicações públicas e não identifica o voto de uma pessoa a partir de
          suas redes.
        </div>
      </Disclosure>
    </>
  );
}
export function Watchboard({
  selectedNote,
  favorite,
  onAlerts,
  onState,
  data,
  region,
  uf,
  year,
  turn,
}: {
  selectedNote?: string;
  favorite: string;
  onAlerts: () => void;
  onState: (code: string, destination: string) => void;
  data: Result[];
  region: string;
  uf: string;
  year: number;
  turn: number;
}) {
  const [follow, setFollow] = useState<string[]>([]),
    [entries, setEntries] = useState<NotebookEntry[]>([]),
    [message, setMessage] = useState(''),
    [ready, setReady] = useState(false),
    [saved, setSaved] = useState<'saving' | 'saved' | 'error'>('saved'),
    [savedAt, setSavedAt] = useState<string | null>(null),
    [focus, setFocus] = useState(''),
    [area, setArea] = useState('Todas'),
    [query, setQuery] = useState('');
  useEffect(() => {
    try {
      const v = readWatch(JSON.parse(localStorage.getItem('observatorio.watch') || '{}'));
      setFollow(v.states);
      setEntries(v.entries);
      setFocus(v.states[0] || '');
    } catch {
      // Start with an empty notebook if local storage cannot be read.
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout>;
    try {
      localStorage.setItem(
        'observatorio.watch',
        JSON.stringify({ version: 2, states: follow, entries }),
      );
      timer = setTimeout(() => {
        setSaved('saved');
        setSavedAt(new Date().toISOString());
      }, 300);
    } catch {
      setSaved('error');
      setMessage('Não foi possível salvar neste aparelho. Verifique o armazenamento do navegador.');
    }
    return () => clearTimeout(timer);
  }, [ready, follow, entries]);
  useEffect(() => {
    if (!ready || !selectedNote) return;
    const timer = setTimeout(() => {
      document.querySelector('.notebook')?.scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
      document
        .querySelector<HTMLTextAreaElement>('.notebook textarea')
        ?.focus({ preventScroll: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [ready, selectedNote]);
  function changeEntries(next: NotebookEntry[]) {
    setSaved('saving');
    setEntries(next);
  }
  function toggle(code: string) {
    setFollow((f) => (f.includes(code) ? f.filter((x) => x !== code) : [...f, code]));
    setFocus(code);
  }
  async function share() {
    const url = new URL(location.origin);
    url.search = new URLSearchParams({
      tab: 'overview',
      uf,
      region,
      year: String(year),
      turn: String(turn),
    }).toString();
    try {
      if (navigator.share)
        await navigator.share({ title: 'Observatório do Voto', url: url.toString() });
      else {
        await navigator.clipboard.writeText(url.toString());
        setMessage('Link da visualização copiado.');
      }
    } catch {
      setMessage('Compartilhamento não concluído.');
    }
  }
  const selected = states.find((s) => s[1] === focus),
    visible = states.filter(
      (s) =>
        (area === 'Todas' || s[3] === area) &&
        s[2].toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')),
    );
  const result = data.find((d) => d.uf === focus);
  return (
    <>
      <section className="panel discovery-head">
        <div>
          <span className="eyebrow">O SEU JEITO DE ACOMPANHAR</span>
          <h2>O país, pelos lugares que importam para você.</h2>
          <p>Monte uma comparação entre estados e guarde suas observações no caderno.</p>
        </div>
        <Bookmark size={40} />
      </section>
      <section className="panel follow-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">SEUS ESTADOS</span>
            <h2>Escolha no mapa. Compare abaixo.</h2>
          </div>
          <span className="subtle-tag">{follow.length} seguindo</span>
        </div>
        <div className="follow-explorer">
          <div>
            <Map
              data={data.filter((d) => states.some((s) => s[1] === d.uf))}
              region={area === 'Todas' ? 'Brasil' : area}
              selected={focus}
              onSelect={setFocus}
            />
            <p className="fine">
              As cores mostram a liderança no 1º turno de 2026. Selecionar no mapa não altera os
              filtros de outras telas.
            </p>
            {selected ? (
              <div className="selected-state">
                <div>
                  <span className="eyebrow">{selected[3]}</span>
                  <h3>{selected[2]}</h3>
                  <small>{result ? '1º turno · ' + result.year : 'Resultado indisponível'}</small>
                </div>
                <button
                  className={'button ' + (follow.includes(focus) ? 'secondary' : 'primary')}
                  onClick={() => toggle(focus)}
                >
                  {follow.includes(focus) ? <Check size={16} /> : <Plus size={16} />}{' '}
                  {follow.includes(focus) ? 'Deixar de seguir' : 'Seguir estado'}
                </button>
              </div>
            ) : (
              <p className="fine">Clique em um estado no mapa ou escolha pelo nome ao lado.</p>
            )}
          </div>
          <div className="state-picker">
            <div className="state-picker-tools">
              <label className="form-label">
                Região
                <select value={area} onChange={(e) => setArea(e.target.value)}>
                  {['Todas', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="form-label">
                Buscar estado
                <input
                  placeholder="Nome do estado"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="active-filters state-filters">
              <span>{area === 'Todas' ? 'Todas as regiões' : area}</span>
              {query && <span>Busca: {query}</span>}
              {(area !== 'Todas' || query) && (
                <button
                  className="text-button"
                  onClick={() => {
                    setArea('Todas');
                    setQuery('');
                  }}
                >
                  Limpar filtros
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="state-picker-list">
              {visible.map((s) => (
                <div key={s[1]} className={focus === s[1] ? 'focused' : ''}>
                  <button className="state-name" onClick={() => setFocus(s[1])}>
                    <span>{s[2]}</span>
                    <small>{s[3]}</small>
                  </button>
                  <button
                    className="follow-toggle"
                    aria-label={(follow.includes(s[1]) ? 'Deixar de seguir ' : 'Seguir ') + s[2]}
                    aria-pressed={follow.includes(s[1])}
                    onClick={() => toggle(s[1])}
                  >
                    {follow.includes(s[1]) ? <Check size={17} /> : <Plus size={17} />}
                  </button>
                </div>
              ))}
            </div>
            {!visible.length && <p className="fine">Nenhum estado encontrado.</p>}
          </div>
        </div>
      </section>
      <section className="panel followed-results">
        <div className="panel-head">
          <div>
            <span className="eyebrow">COMPARAÇÃO PESSOAL</span>
            <h2>
              {follow.length
                ? 'Seus estados, lado a lado.'
                : 'Sua comparação começa com um estado.'}
            </h2>
          </div>
          <MapPin size={22} />
        </div>
        <p className="fine">
          Os estados seguidos ficam reunidos aqui, com atalhos para a apuração e o histórico. Essa
          seleção não restringe os alertas nacionais.
        </p>
        {follow.length > 0 && (
          <ExpandList
            className="followed-grid"
            items={follow}
            initial={4}
            moreLabel="Ver todos os estados seguidos"
            lessLabel="Ver menos estados"
            render={(code: string) => {
              const d = data.find((d) => d.uf === code);
              const a = d?.candidates.find((c) => c.number === '22'),
                b = d?.candidates.find((c) => c.number === '13');
              return (
                <article className="followed-card" key={code}>
                  <header>
                    <div>
                      <span className="eyebrow">{states.find((s) => s[1] === code)?.[3]}</span>
                      <h3>{states.find((s) => s[1] === code)?.[2]}</h3>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={'Deixar de seguir ' + states.find((s) => s[1] === code)?.[2]}
                      onClick={() => toggle(code)}
                    >
                      <X size={15} />
                    </button>
                  </header>
                  {d && a && b ? (
                    <>
                      <span className="fine">1º turno · {d.year} · votos válidos</span>
                      <div className="followed-votes">
                        <span>
                          Flávio <strong>{percent(a.percent)}</strong>
                        </span>
                        <span>
                          Lula <strong>{percent(b.percent)}</strong>
                        </span>
                      </div>
                      <div className="split-bar">
                        <div style={{ width: a.percent + '%', background: '#24796d' }} />
                        <div style={{ width: b.percent + '%', background: '#c96856' }} />
                      </div>
                      <small>Abstenção: {percent(d.abstention)}</small>
                    </>
                  ) : (
                    <p>Sem dados disponíveis.</p>
                  )}
                  <div className="quick-actions">
                    <button className="text-button" onClick={() => onState(code, 'live')}>
                      Apuração
                      <ArrowUpRight size={13} />
                    </button>
                    <button className="text-button" onClick={() => onState(code, 'history')}>
                      Histórico
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </article>
              );
            }}
          />
        )}
      </section>
      {ready && (
        <Notebook
          entries={entries}
          onChange={changeEntries}
          saved={saved}
          savedAt={savedAt}
          selectedNote={selectedNote}
        />
      )}
      <section className="watch-shortcuts">
        <div>
          <span className="eyebrow">SEU ACOMPANHAMENTO</span>
          <strong>
            {candidates.find((c) => c.number === favorite)?.name || 'Os dois candidatos'}
          </strong>
        </div>
        <button className="button secondary" onClick={onAlerts}>
          <Bell size={16} />
          Escolher alertas
        </button>
        <button className="button secondary" onClick={share}>
          <Share2 size={16} />
          Compartilhar visualização
        </button>
      </section>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <p className="fine privacy-label">
        <ShieldCheck size={15} />
        Seu caderno e sua seleção ficam no aparelho. O link compartilhado contém apenas os filtros
        públicos da visualização.
      </p>
    </>
  );
}
