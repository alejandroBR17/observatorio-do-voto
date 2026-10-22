'use client';
import { BookOpen, MapPin, RotateCcw } from 'lucide-react';
import { years } from '@/lib/content';
import { states, type Candidate, type Result } from '@/lib/elections';
import { electionPalette, type CandidateLegend } from '@/lib/election-palette';
import { historySelection } from '@/lib/history-selection';
import {
  formatVotes as fmt,
  formatPercent as pct,
  candidateName as name,
} from '@/lib/presentation';
import type { NotebookEntry } from '@/lib/notebook';
import { CandidatePortrait } from './components/candidate-portrait';
import { DataFreshness } from './components/data-freshness';
import { Source } from './components/source-link';
import { Progression, type ProgressionPoint } from './components/vote-progression';
import { Disclosure } from './disclosure';
import { Map } from './geo-map';
import { RegionalResults } from './regional-results';

const regions = ['Brasil', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

function CandidateRow({
  candidate,
  rank,
  palette,
}: {
  candidate: Candidate;
  rank: number;
  palette: CandidateLegend[];
}) {
  const shade = palette.find((item) => item.number === candidate.number)?.color || '#87999b';
  return (
    <article className="or-history-candidate">
      <CandidatePortrait name={candidate.name} />
      <div className="or-history-person">
        <span>
          {rank}º no recorte · {candidate.party}
        </span>
        <h3>{name(candidate.name)}</h3>
        <small>{fmt(candidate.votes)} votos</small>
      </div>
      <strong style={{ color: shade }}>{pct(candidate.percent)}</strong>
      <div className="bar-track" aria-hidden="true">
        <div style={{ width: `${candidate.percent}%`, background: shade }} />
      </div>
    </article>
  );
}

export function HistoryObservatory({
  data,
  current,
  year,
  turn,
  region,
  uf,
  error,
  points,
  onYear,
  onTurn,
  onRegion,
  onState,
  onNote,
}: {
  data: Result[];
  current: Result[];
  year: number;
  turn: number;
  region: string;
  uf: string;
  error: string;
  points: ProgressionPoint[];
  onYear: (year: number) => void;
  onTurn: (turn: number) => void;
  onRegion: (region: string) => void;
  onState: (uf: string) => void;
  onNote: (entry: Pick<NotebookEntry, 'title' | 'body' | 'topic' | 'uf'>) => void;
}) {
  const historical = data.filter((row) => row.turn === turn);
  const result = historySelection(data, turn, uf, region);
  const palette = electionPalette(historical.find((row) => row.uf === 'BR')?.candidates || []);
  const place = uf === 'BR' ? region : states.find((state) => state[1] === uf)?.[2] || uf;
  const visibleStates = states.filter((state) =>
    uf !== 'BR' ? state[1] === uf : region === 'Brasil' || state[3] === region,
  );
  const singleTurn = year === 1994 || year === 1998;
  const first = result?.candidates[0];
  const second = result?.candidates[1];
  return (
    <div className="or-history">
      <section className="panel or-history-controls" aria-label="Escolha a eleição e o lugar">
        <div className="or-history-control-heading">
          <div>
            <span className="eyebrow">PERCORRA AS ELEIÇÕES</span>
            <h2>Um ano. Muitos retratos do Brasil.</h2>
          </div>
          <span>1989 — 2022</span>
        </div>
        <div className="or-history-years" role="group" aria-label="Ano da eleição">
          {years.map((value) => (
            <button key={value} aria-pressed={year === value} onClick={() => onYear(value)}>
              {value}
            </button>
          ))}
        </div>
        <div className="or-history-filters">
          <div className="or-history-turns" role="group" aria-label="Turno da eleição">
            {[1, 2].map((value) => (
              <button
                key={value}
                aria-pressed={turn === value}
                disabled={value === 2 && singleTurn}
                onClick={() => onTurn(value)}
              >
                {value}º turno
              </button>
            ))}
          </div>
          <label>
            Região
            <select value={region} onChange={(event) => onRegion(event.target.value)}>
              {regions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select value={uf} onChange={(event) => onState(event.target.value)}>
              <option value="BR">{region === 'Brasil' ? 'Brasil inteiro' : 'Toda a região'}</option>
              {states
                .filter((state) => region === 'Brasil' || state[3] === region)
                .map((state) => (
                  <option key={state[1]} value={state[1]}>
                    {state[2]}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {singleTurn && <p className="fine">A eleição de {year} foi decidida no 1º turno.</p>}
      </section>
      <div className="or-history-context" role="status">
        <div>
          <MapPin size={19} aria-hidden="true" />
          <span>
            <strong>{place}</strong>
            <small>
              {year} · {turn}º turno · votos válidos
            </small>
          </span>
        </div>
        {(uf !== 'BR' || region !== 'Brasil') && (
          <button className="button secondary" onClick={() => onRegion('Brasil')}>
            <RotateCcw size={16} aria-hidden="true" />
            Ver Brasil inteiro
          </button>
        )}
      </div>
      {error || !result ? (
        <section className="panel empty" role="status">
          <BookOpen size={30} aria-hidden="true" />
          <h2>
            {error
              ? 'Não foi possível consultar o acervo'
              : data.length
                ? 'Sem resultado neste recorte'
                : 'Consultando a eleição…'}
          </h2>
          <p>
            {error ||
              (data.length
                ? 'Escolha outro turno ou lugar para continuar explorando.'
                : 'Buscando os registros oficiais do TSE.')}
          </p>
          <Source href="https://www.tse.jus.br/eleicoes/resultados-eleicoes">
            Consultar acervo oficial
          </Source>
        </section>
      ) : (
        <>
          <DataFreshness archived generated={result.generated} />
          <RegionalResults data={data} turn={turn} region={region} onRegion={onRegion} />
          {(year === 1994 || year === 1998 || result.missingStates > 0) && (
            <p className="notice">
              {year <= 1998
                ? 'O acervo de 1994–1998 tem cobertura incompleta. Os números refletem apenas os registros importados.'
                : `Faltam registros de ${result.missingStates} estado(s) nesta região.`}
              {year === 1994 && uf === 'BR' && region === 'Brasil'
                ? ' O total nacional de 1994 não inclui os votos no exterior.'
                : ''}
            </p>
          )}
          <div className="or-history-indicators">
            <div>
              <span>Votos válidos no recorte</span>
              <strong>{fmt(result.valid)}</strong>
              <small>Somente votos em candidatos</small>
            </div>
            <div>
              <span>Distância entre os dois primeiros</span>
              <strong>
                {first && second
                  ? `${(first.percent - second.percent).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p.`
                  : '—'}
              </strong>
              <small>Diferença em pontos percentuais</small>
            </div>
          </div>
          <div className="or-history-grid">
            <section className="panel or-history-map">
              <span className="eyebrow">O VOTO NO TERRITÓRIO</span>
              <h2>Como os estados votaram</h2>
              <p>Selecione um estado para conectar o mapa aos resultados.</p>
              <Map
                data={historical}
                region={region}
                selected={uf}
                onSelect={onState}
                candidateLegend={palette}
              />
              <Source href={result.source}>Arquivo original do TSE</Source>
            </section>
            <section className="panel or-history-ranking">
              <span className="eyebrow">{place.toLocaleUpperCase('pt-BR')}</span>
              <h2>O resultado nas urnas</h2>
              <p>Participação de cada candidato nos votos válidos.</p>
              {result.candidates.slice(0, 2).map((candidate, index) => (
                <CandidateRow
                  key={candidate.number}
                  candidate={candidate}
                  rank={index + 1}
                  palette={palette}
                />
              ))}
              {result.candidates.length > 2 && (
                <Disclosure
                  title={`Ver os outros ${result.candidates.length - 2} candidatos`}
                  summary="Abra para consultar o resultado completo."
                >
                  {result.candidates.slice(2).map((candidate, index) => (
                    <CandidateRow
                      key={candidate.number}
                      candidate={candidate}
                      rank={index + 3}
                      palette={palette}
                    />
                  ))}
                </Disclosure>
              )}
              <button
                className="button secondary"
                onClick={() =>
                  onNote({
                    title: `${year} · ${turn}º turno · ${place}`,
                    body: `${result.candidates
                      .slice(0, 2)
                      .map((candidate) => `${name(candidate.name)}: ${pct(candidate.percent)}`)
                      .join('\n')}\nFonte: ${result.source}\n\nMinha observação:\n`,
                    topic: 'Histórico',
                    uf,
                  })
                }
              >
                <BookOpen size={17} aria-hidden="true" />
                Anotar sobre este resultado
              </button>
            </section>
          </div>
          {year === 2022 && points.length > 0 && (
            <Disclosure
              title="Rever a evolução da apuração de 2022"
              summary={`Brasil · ${turn}º turno · observe como os percentuais mudaram durante a contagem.`}
            >
              <p className="fine">
                Esta sequência é nacional, independentemente do estado selecionado acima. O app
                incorporou os arquivos de evolução publicados pelo TSE para 2022.
              </p>
              <Progression
                points={points}
                label={`Progressão nacional da apuração de 2022 · ${turn}º turno · Lula e Jair Bolsonaro`}
              />
              <div className="legend">
                <span>
                  <i style={{ background: '#c96856' }} />
                  Lula
                </span>
                <span>
                  <i style={{ background: '#24796d' }} />
                  Jair Bolsonaro
                </span>
              </div>
              <Source
                href={`https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/Historico_Totalizacao_Presidente_BR_${turn}T_2022.zip`}
              >
                Histórico de totalização do TSE
              </Source>
            </Disclosure>
          )}
          {year !== 2022 && (
            <Disclosure
              title="Evolução da apuração neste ano"
              summary="O resultado final está disponível; a sequência das atualizações não está incorporada ao app."
            >
              <p>
                O resultado final mostra como a eleição terminou. Para desenhar a evolução,
                precisamos dos registros de cada atualização durante a contagem. Um não permite
                reconstruir o outro.
              </p>
              <p>
                Atualmente, o app tem essa sequência apenas para 2022, nos dois turnos. Isso não
                significa que o acompanhamento da apuração tenha começado naquele ano.
              </p>
              <Source href="https://dadosabertos.tse.jus.br/dataset/resultados-2022">
                Históricos de totalização de 2022 no TSE
              </Source>
            </Disclosure>
          )}
          <Disclosure
            title="Comparar com a eleição de 2026"
            summary="Consulte a participação do PT por estado nos dois momentos."
          >
            <h3>Participação do PT nos votos válidos</h3>
            <p className="fine">
              {year} · {turn}º turno × 2026 · 1º turno. Candidatos e contextos distintos; esta
              variação não é uma previsão.
            </p>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Comparação por estado; deslize ou use as setas para ver as colunas"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Estado</th>
                    <th scope="col">PT em {year}</th>
                    <th scope="col">Lula em 2026</th>
                    <th scope="col">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStates.map((state) => {
                    const before = historical
                      .find((row) => row.uf === state[1])
                      ?.candidates.find((candidate) => candidate.party === 'PT');
                    const after = current
                      .find((row) => row.uf === state[1])
                      ?.candidates.find((candidate) => candidate.number === '13');
                    const delta = before && after ? after.percent - before.percent : undefined;
                    return (
                      <tr key={state[1]}>
                        <th scope="row">{state[2]}</th>
                        <td>{before ? pct(before.percent) : 'Sem dados'}</td>
                        <td>{after ? pct(after.percent) : 'Sem dados'}</td>
                        <td>
                          {delta === undefined
                            ? '—'
                            : `${delta > 0 ? '+' : ''}${delta.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p.`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Disclosure>
        </>
      )}
    </div>
  );
}
