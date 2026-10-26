'use client';
import { ArrowUpRight, Bell, ChevronDown, Expand, Radio } from 'lucide-react';
import { candidates } from '@/lib/content';
import { states, type Result } from '@/lib/elections';
import { candidateColor, candidateName, formatPercent, formatVotes } from '@/lib/presentation';
import { liveMargin } from '@/lib/live-summary';
import { CandidatePortrait } from './candidate-portrait';
import { DataFreshness } from './data-freshness';
import { Source } from './source-link';

export function LiveScoreboard({
  result,
  place,
  unavailable,
  stale,
  checkedAt,
  victory,
  onState,
  onNight,
  onAlerts,
}: {
  result: Result;
  place: string;
  unavailable: boolean;
  stale?: boolean;
  checkedAt?: string;
  victory?: { kind?: string; message: string };
  onState: (uf: string) => void;
  onNight: () => void;
  onAlerts: () => void;
}) {
  const margin = liveMargin(result);
  const stamp = result.generated.match(/\d{2}:\d{2}:\d{2}/)?.[0] || result.generated;
  const decisive = victory?.kind === 'official' || victory?.kind === 'mathematical';
  const count = (value: number) => (Number.isFinite(value) ? formatVotes(value) : 'Não informado');
  return (
    <section className="vote-board" aria-label={`Placar presidencial de ${place}`}>
      <header className="vote-board-header">
        <div className={`vote-board-status${unavailable ? ' is-unavailable' : ''}`} role="status">
          <Radio size={15} aria-hidden="true" />
          {unavailable
            ? 'Última parcial disponível'
            : result.final
              ? 'Contagem concluída'
              : 'Apuração ao vivo'}
        </div>
        <label className="vote-board-scope">
          <span className="sr-only">Apuração por estado</span>
          <select
            aria-label="Apuração por estado"
            value={result.uf}
            onChange={(event) => onState(event.target.value)}
          >
            <option value="BR">Brasil</option>
            {states.map((state) => (
              <option key={state[1]} value={state[1]}>
                {state[2]}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="vote-board-caption">
        <span>Presidência · 2º turno</span>
        <span>Votos válidos apurados</span>
      </div>
      <div className="vote-board-candidates">
        {candidates.map((candidate) => {
          const tally = result.candidates.find((row) => row.number === candidate.number);
          return (
            <article
              className="vote-contender"
              key={candidate.number}
              style={{ '--vote-color': candidateColor(candidate.number) } as React.CSSProperties}
            >
              <div className="vote-contender-identity">
                <div className="vote-portrait">
                  <CandidatePortrait name={candidate.full} />
                  <span>{candidate.number}</span>
                </div>
                <div>
                  <span className="vote-party">{candidate.party}</span>
                  <h2>{candidate.name}</h2>
                </div>
              </div>
              <strong className="vote-percent">{tally ? formatPercent(tally.percent) : '—'}</strong>
              <span className="sr-only">dos votos válidos apurados</span>
              <span className="vote-absolute">
                {tally ? `${formatVotes(tally.votes)} votos` : 'Sem votos disponíveis'}
              </span>
            </article>
          );
        })}
      </div>
      <div className="vote-comparison" aria-hidden="true">
        {candidates.map((candidate) => (
          <span
            key={candidate.number}
            style={{
              width: `${result.candidates.find((row) => row.number === candidate.number)?.percent || 0}%`,
              background: candidateColor(candidate.number),
            }}
          />
        ))}
      </div>
      <div className="vote-lead" aria-label={`Diferença entre os candidatos em ${place}`}>
        <ArrowUpRight size={17} aria-hidden="true" />
        <p>
          {margin ? (
            margin.votes === 0 ? (
              'Empate em votos'
            ) : (
              <>
                <strong>{candidateName(margin.leader.name)}</strong> ·{' '}
                <strong>{formatVotes(margin.votes)}</strong> votos à frente
              </>
            )
          ) : (
            'Aguardando os primeiros votos'
          )}
        </p>
        <span>{result.final ? 'Resultado final' : 'Parcial'}</span>
      </div>
      {unavailable && (
        <p className="vote-board-warning" role="status">
          A consulta falhou. Mantemos o último boletim e tentaremos novamente.
        </p>
      )}
      {decisive && !unavailable && (
        <p className="vote-board-warning" role="status">
          {victory.message}
        </p>
      )}
      <div className="vote-counting">
        <div className="vote-counting-label">
          <span>Andamento da contagem</span>
          <strong>
            {formatPercent(result.counted)} <span>das seções apuradas</span>
          </strong>
        </div>
        <div
          className="vote-counting-track"
          role="progressbar"
          aria-label={`Seções de votação apuradas em ${place}`}
          aria-valuenow={result.counted}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${result.counted}%` }} />
        </div>
        <div className="vote-counting-meta">
          <span title={result.generated}>Boletim TSE · {stamp}</span>
          <span>Atualização automática</span>
        </div>
      </div>
      <footer className="vote-board-footer">
        <details className="vote-details">
          <summary>
            Detalhes e fonte <ChevronDown size={15} aria-hidden="true" />
          </summary>
          <div className="vote-details-body">
            <h3>Sobre esta parcial</h3>
            <p>
              Boletim do TSE: <strong>{result.generated}</strong>. Consulta a cada 30 segundos.
            </p>
            {margin && (
              <p>
                Diferença entre os candidatos:{' '}
                {margin.points.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                pontos percentuais.
              </p>
            )}
            <p>
              O percentual de seções apuradas indica o avanço da contagem. Cada seção reúne um grupo
              de eleitores; os votos válidos excluem brancos e nulos.
            </p>
            <dl className="or-live-metrics">
              <div>
                <dt>Votos válidos</dt>
                <dd>{count(result.valid)}</dd>
              </div>
              <div>
                <dt>Brancos</dt>
                <dd>{count(result.blank)}</dd>
              </div>
              <div>
                <dt>Nulos</dt>
                <dd>{count(result.nullVotes)}</dd>
              </div>
              <div>
                <dt>Eleitores em seções pendentes</dt>
                <dd>{count(result.remaining)}</dd>
              </div>
            </dl>
            <p>
              Eleitores em seções pendentes não equivalem a votos válidos restantes. A liderança
              parcial pode mudar.
            </p>
            {victory?.message && <p>{victory.message}</p>}
            <DataFreshness
              generated={result.generated}
              checkedAt={checkedAt}
              stale={stale}
              unavailable={unavailable}
            />
            <Source href={result.source}>Consultar resultado no TSE</Source>
          </div>
        </details>
        <div className="vote-board-actions">
          <button
            className="text-button"
            aria-label="Escolher alertas"
            title="Escolher alertas"
            onClick={onAlerts}
          >
            <Bell size={16} aria-hidden="true" />
            <span>Alertas</span>
          </button>
          <button
            className="text-button"
            aria-label="Ampliar apuração"
            title="Ampliar apuração"
            onClick={onNight}
            disabled={unavailable}
          >
            <Expand size={16} aria-hidden="true" />
            <span>Ampliar</span>
          </button>
        </div>
      </footer>
    </section>
  );
}
