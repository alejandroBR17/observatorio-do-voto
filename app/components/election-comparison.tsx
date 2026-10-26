'use client';
import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowRight } from 'lucide-react';
import { states, type Result } from '@/lib/elections';
import { comparisonSelection, stateSwings } from '@/lib/election-comparison';
import { candidateName, formatPercent, formatVotes } from '@/lib/presentation';
import { CandidatePortrait } from './candidate-portrait';

const years = [2022, 2018, 2014, 2010, 2006, 2002, 1989];
const signed = (value: number) =>
  `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ElectionComparison({
  uf,
  region,
  onState,
}: {
  uf: string;
  region: string;
  onState: (uf: string) => void;
}) {
  const [year, setYear] = useState(2022);
  const [mode, setMode] = useState<'years' | 'turns'>('years');
  const [current, setCurrent] = useState<Result[] | null>(null);
  const [archive, setArchive] = useState<{ year: number; rows: Result[] } | null>(null);
  const [error, setError] = useState(false);
  const [all, setAll] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/data/history-2026.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then(setCurrent)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (mode === 'turns') return;
    const controller = new AbortController();
    setError(false);
    fetch(`/data/history-${year}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then((rows: Result[]) => setArchive({ year, rows }))
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [year, mode]);
  const place = uf !== 'BR' ? states.find((state) => state[1] === uf)?.[2] || uf : region;
  const baselineRows = mode === 'turns' ? current : archive?.year === year ? archive.rows : null;
  const before = baselineRows
    ? comparisonSelection(
        baselineRows,
        mode === 'turns' ? 2026 : year,
        mode === 'turns' ? 1 : 2,
        uf,
        region,
      )
    : undefined;
  const now = current ? comparisonSelection(current, 2026, 2, uf, region) : undefined;
  const delta = before?.pt && now?.pt ? now.pt.percent - before.pt.percent : undefined;
  const swings =
    mode === 'years' && current && baselineRows
      ? stateSwings(current, baselineRows, year, region)
      : [];
  return (
    <section className="election-comparison" aria-label="Comparação de resultados oficiais">
      <div className="comparison-controls">
        <div className="comparison-mode" role="group" aria-label="Tipo de comparação">
          <button aria-pressed={mode === 'years'} onClick={() => setMode('years')}>
            Entre eleições
          </button>
          <button aria-pressed={mode === 'turns'} onClick={() => setMode('turns')}>
            Entre turnos
          </button>
        </div>
        {mode === 'years' && (
          <label>
            Ano de referência
            <select
              value={year}
              onChange={(event) => {
                setYear(Number(event.target.value));
                setAll(false);
              }}
            >
              {years.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="comparison-scope">
        {place} · {mode === 'years' ? '2º turno nos dois anos' : '1º e 2º turnos de 2026'}
      </p>
      {error ? (
        <div className="progression-empty" role="status">
          Não foi possível carregar a comparação. Reabra esta visualização para tentar novamente.
        </div>
      ) : !current || !baselineRows ? (
        <p role="status">Carregando resultados oficiais…</p>
      ) : !before || !now ? (
        <p role="status">Não há registros completos para comparar este recorte.</p>
      ) : (
        <>
          <div className="comparison-scorecards">
            {[before, now].map((selection, index) => (
              <article key={index} className="comparison-scorecard">
                <header>
                  <strong>{selection.year}</strong>
                  <span>{selection.turn}º turno</span>
                </header>
                {selection.candidates.slice(0, 2).map((candidate) => (
                  <div className="comparison-candidate" key={candidate.number}>
                    <CandidatePortrait name={candidate.name} />
                    <span>
                      {candidateName(candidate.name)}
                      <small>
                        {candidate.party} · {formatVotes(candidate.votes)} votos
                      </small>
                    </span>
                    <strong>{formatPercent(candidate.percent)}</strong>
                  </div>
                ))}
                <small>{formatVotes(selection.valid)} votos válidos</small>
              </article>
            ))}
          </div>
          <div className="comparison-insights">
            <div>
              {delta === undefined ? (
                <ArrowRight size={19} />
              ) : delta >= 0 ? (
                <ArrowUpRight size={19} />
              ) : (
                <ArrowDownRight size={19} />
              )}
              <span>
                Variação do PT
                <strong>
                  {delta === undefined ? 'Não comparável' : `${signed(delta)} pontos percentuais`}
                </strong>
              </span>
            </div>
            <div>
              <span>
                Diferença entre os finalistas
                <strong>
                  {before.margin === undefined
                    ? '—'
                    : `${before.margin.toFixed(2).replace('.', ',')} p.p.`}{' '}
                  <ArrowRight size={13} aria-hidden="true" />{' '}
                  {now.margin === undefined
                    ? '—'
                    : `${now.margin.toFixed(2).replace('.', ',')} p.p.`}
                </strong>
              </span>
            </div>
            <div>
              <span>
                Variação dos votos válidos
                <strong>{formatVotes(now.valid - before.valid)} votos</strong>
              </span>
            </div>
          </div>
          {mode === 'years' && (
            <div className="comparison-states">
              <h3>Onde o percentual do PT mais mudou</h3>
              <p className="fine">
                {year} → 2026 · {region} · escolha uma UF para comparar.
              </p>
              <div className="comparison-state-grid">
                {(all ? swings : swings.slice(0, 6)).map((row) => (
                  <button key={row.uf} aria-pressed={uf === row.uf} onClick={() => onState(row.uf)}>
                    <span>
                      <b>{row.uf}</b> {row.name}
                    </span>
                    <strong>
                      {row.delta === undefined ? 'Sem comparação' : `${signed(row.delta)} p.p.`}
                    </strong>
                    <small>
                      {row.before?.pt && row.now?.pt
                        ? `${formatPercent(row.before.pt.percent)} → ${formatPercent(row.now.pt.percent)}`
                        : 'Faltam dados completos'}
                    </small>
                  </button>
                ))}
              </div>
              {swings.length > 6 && (
                <button className="text-button" aria-expanded={all} onClick={() => setAll(!all)}>
                  {all ? 'Mostrar menos' : `Ver as ${swings.length} UFs`}
                </button>
              )}
            </div>
          )}
          <details className="comparison-method">
            <summary>Critérios, limites e fontes</summary>
            <p>
              Comparação descritiva de resultados oficiais. Nas regiões, os percentuais são
              calculados pela soma de votos válidos, sem média simples dos estados. Brasil inclui o
              exterior; regiões incluem apenas suas UFs.
            </p>
            <p>
              A série do PT identifica as candidaturas de cada eleição: Lula, Dilma Rousseff ou
              Fernando Haddad. Os adversários também mudam. Variações agregadas não demonstram
              transferência individual de votos, fraude ou efeito de uma decisão judicial.
            </p>
            <p>
              Brancos, nulos, participação e abstenção históricos não são estimados quando ausentes
              na base.
            </p>
            <p>
              Os cálculos usam percentuais sem arredondamento; os cartões mostram duas casas
              decimais. Os resultados de 2026 são uma coleta final, com horários e IDs documentados
              na fonte abaixo.
            </p>
            <div className="comparison-sources">
              <a href={before.source} target="_blank" rel="noreferrer">
                Fonte de {before.year} ↗
              </a>
              <a href={now.source} target="_blank" rel="noreferrer">
                Fonte de 2026 ↗
              </a>
              <a href="/data/final-2026-sources.json" target="_blank" rel="noreferrer">
                Coleta de 2026 ↗
              </a>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
