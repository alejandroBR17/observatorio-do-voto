'use client';
import { states, type Result } from '@/lib/elections';
import { historySelection } from '@/lib/history-selection';
import { candidateName, formatPercent, formatVotes } from '@/lib/presentation';
import { CandidatePortrait } from './components/candidate-portrait';

export const electoralRegions = ['Brasil', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

export function RegionalResults({
  data,
  turn,
  region,
  onRegion,
}: {
  data: Result[];
  turn: number;
  region: string;
  onRegion: (region: string) => void;
}) {
  return (
    <section className="regional-results" aria-label="Quem recebeu mais votos em cada região">
      <h3>Quem recebeu mais votos em cada região</h3>
      <p>Compare os votos válidos. Escolha uma região para explorar o mapa.</p>
      <div className="regional-results-grid">
        {electoralRegions.slice(1).map((name) => {
          const result = historySelection(data, turn, 'BR', name);
          const rows = data.filter(
            (row) =>
              row.turn === turn && states.some((state) => state[1] === row.uf && state[3] === name),
          );
          const final = rows.length > 0 && rows.every((row) => row.final);
          const first = result?.candidates[0];
          const tied = first && result?.candidates[1]?.votes === first.votes;
          return (
            <button
              key={name}
              className="regional-result"
              aria-pressed={region === name}
              onClick={() => onRegion(name)}
            >
              <strong>{name}</strong>
              {first && result.valid > 0 ? (
                <>
                  <span className="regional-result-status">
                    {tied
                      ? 'Empate em votos'
                      : result.missingStates > 0
                        ? 'Lidera nos registros disponíveis'
                        : final
                          ? 'Mais votado'
                          : 'Lidera a contagem parcial'}
                  </span>
                  {result.candidates.slice(0, 2).map((candidate) => (
                    <span className="regional-result-candidate" key={candidate.number}>
                      <CandidatePortrait name={candidate.name} />
                      <span>
                        {candidateName(candidate.name)}
                        <small>{formatVotes(candidate.votes)} votos</small>
                      </span>
                      <b>{formatPercent(candidate.percent)}</b>
                    </span>
                  ))}
                  {result.missingStates > 0 && (
                    <small>Faltam registros de {result.missingStates} estado(s).</small>
                  )}
                </>
              ) : (
                <span>Aguardando dados deste recorte</span>
              )}
              <span className="regional-result-action">
                {region === name ? 'Região selecionada' : 'Explorar região →'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
