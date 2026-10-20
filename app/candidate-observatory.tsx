'use client';

import { ArrowUpRight, Heart, ShieldCheck, Users } from 'lucide-react';
import { bioSource, candidates } from '@/lib/content';
import type { Result } from '@/lib/elections';
import { formatCompactPercent, formatVotes } from '@/lib/presentation';
import { Source } from './components/source-link';

export function CandidateObservatory({
  result,
  favorite,
  onFavorite,
  onGo,
}: {
  result?: Result;
  favorite: string;
  onFavorite: (number: string) => void;
  onGo: (tab: string) => void;
}) {
  const firstTurn =
    result?.year === 2026 && result.turn === 1 && result.uf === 'BR' ? result : undefined;
  return (
    <div className="or-candidates">
      <nav className="or-candidate-nav" aria-label="Explorar os candidatos">
        {candidates.map((candidate) => (
          <a href={`#perfil-${candidate.number}`} key={candidate.number}>
            <span>{candidate.number}</span>
            {candidate.name}
            <ArrowUpRight size={15} />
          </a>
        ))}
      </nav>
      <div className="or-candidate-grid">
        {candidates.map((candidate) => {
          const votes = firstTurn?.candidates.find((entry) => entry.number === candidate.number);
          const preferred = favorite === candidate.number;
          return (
            <article
              className="or-candidate-card"
              id={`perfil-${candidate.number}`}
              key={candidate.number}
              aria-labelledby={`nome-${candidate.number}`}
              style={
                {
                  '--person-color':
                    candidate.number === '22' ? 'var(--data-flavio)' : 'var(--data-lula)',
                } as React.CSSProperties
              }
            >
              <header className="or-candidate-identity">
                <img src={candidate.photo} alt="" width="112" height="136" />
                <div>
                  <span className="or-overline">{candidate.party} · NO SEGUNDO TURNO</span>
                  <h2 id={`nome-${candidate.number}`}>{candidate.name}</h2>
                  <p>{candidate.full}</p>
                </div>
                <div className="or-ballot">
                  <strong>{candidate.number}</strong>
                  <span>NA URNA</span>
                </div>
              </header>
              <div className="or-candidate-body">
                <p className="or-candidate-bio">{candidate.bio}</p>
                <div className="or-candidate-vice">
                  <Users size={18} />
                  <span>
                    Vice na chapa<strong>{candidate.vice}</strong>
                  </span>
                </div>
                {votes && firstTurn && (
                  <div className="or-candidate-result">
                    <div>
                      <span className="or-overline">1º TURNO · BRASIL · 2026</span>
                      <strong>{formatCompactPercent(votes.percent)}</strong>
                      <span>{formatVotes(votes.votes)} votos válidos</span>
                    </div>
                    <Source href={firstTurn.source}>Resultado oficial · TSE</Source>
                  </div>
                )}
                <details className="or-candidate-history">
                  <summary>
                    Explorar trajetória <span aria-hidden="true">+</span>
                  </summary>
                  <ol>
                    {candidate.timeline.map(([year, description]) => (
                      <li key={year}>
                        <strong>{year}</strong>
                        <p>{description}</p>
                      </li>
                    ))}
                  </ol>
                  <Source href={bioSource}>Perfil e trajetória · Agência Senado</Source>
                </details>
                <button
                  className="or-candidate-favorite"
                  aria-pressed={preferred}
                  aria-label={
                    preferred
                      ? `Meu candidato preferido: ${candidate.name}. Remover preferência`
                      : `Escolher como preferido: ${candidate.name}`
                  }
                  onClick={() => onFavorite(candidate.number)}
                >
                  <Heart size={17} fill={preferred ? 'currentColor' : 'none'} />
                  {preferred ? 'Meu candidato preferido' : 'Escolher como preferido'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="or-candidate-privacy">
        <ShieldCheck size={18} />
        <p>
          Sua preferência fica apenas neste aparelho. Os dados e as comparações permanecem iguais
          para todos.
        </p>
      </div>
      <section className="or-candidate-next" aria-labelledby="candidate-next-title">
        <div>
          <span className="or-overline">CONTINUE OBSERVANDO</span>
          <h2 id="candidate-next-title">Dos perfis aos números.</h2>
          <p>Compare as pesquisas ou explore como o Brasil votou no primeiro turno.</p>
        </div>
        <div>
          <button onClick={() => onGo('polls')}>
            Comparar pesquisas <ArrowUpRight size={16} />
          </button>
          <button onClick={() => onGo('overview')}>
            Explorar os resultados <ArrowUpRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
