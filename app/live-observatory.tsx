'use client';
import { useState } from 'react';
import {
  ChartNoAxesCombined,
  Expand,
  List,
  Map as MapIcon,
  PanelsTopLeft,
  GitCompareArrows,
} from 'lucide-react';
import { candidates } from '@/lib/content';
import { states, type Result } from '@/lib/elections';
import { currentLiveResult } from '@/lib/live-summary';
import { LiveStateList } from './components/live-state-list';
import { LiveScoreboard } from './components/live-scoreboard';
import { CandidatePortrait } from './components/candidate-portrait';
import { DataFreshness } from './components/data-freshness';
import type { ProgressionPoint } from './components/vote-progression';
import { ElectionEvolution } from './components/election-evolution';
import { ElectionComparison } from './components/election-comparison';
import { LiveCountdown } from './live-countdown';
import { Map } from './geo-map';
import { RegionalResults } from './regional-results';

type LiveState = {
  status: string;
  result?: Result;
  lastGood?: Result;
  victory?: { kind?: string; message: string };
  message?: string;
  checkedAt?: string;
  stale?: boolean;
};
const views = [
  { id: 'compare', name: 'Comparar', icon: GitCompareArrows },
  { id: 'map', name: 'Mapa', icon: MapIcon },
  { id: 'states', name: 'Estados', icon: List },
  { id: 'regions', name: 'Regiões', icon: PanelsTopLeft },
  { id: 'progress', name: 'Evolução', icon: ChartNoAxesCombined },
] as const;

export function LiveObservatory({
  live,
  uf,
  region,
  notification,
  points,
  stateResults,
  canPreview,
  onState,
  onRegion,
  onAlerts,
  onNight,
  onHistory,
}: {
  live: LiveState;
  uf: string;
  region: string;
  notification: string;
  points: ProgressionPoint[];
  stateResults: Result[];
  canPreview: boolean;
  onState: (uf: string) => void;
  onRegion: (region: string) => void;
  onAlerts: () => void;
  onNight: () => void;
  onHistory: () => void;
}) {
  const [chosenView, setView] = useState<(typeof views)[number]['id'] | null>(null);
  const result = currentLiveResult(live, uf);
  const view = chosenView ?? (result?.final ? 'compare' : 'map');
  const unavailable = live.status === 'unavailable' || live.status === 'stale';
  const place = uf === 'BR' ? 'Brasil' : states.find((state) => state[1] === uf)?.[2] || uf;
  if (live.status === 'live' && live.result && live.result.uf !== uf)
    return (
      <div className="or-live">
        <section className="panel" role="status">
          <h2>Consultando {place}…</h2>
          <button className="button secondary" onClick={() => onState('BR')}>
            Voltar ao Brasil
          </button>
        </section>
      </div>
    );
  return (
    <div className="or-live">
      {result ? (
        <>
          <LiveScoreboard
            result={result}
            place={place}
            unavailable={unavailable}
            stale={live.stale}
            checkedAt={live.checkedAt}
            victory={live.victory}
            onState={onState}
            onNight={onNight}
            onAlerts={onAlerts}
          />
          <section className="panel or-live-explore" aria-label="Explorar a apuração">
            <div className="or-explore-heading">
              <div>
                <span className="eyebrow">ALÉM DO PLACAR</span>
                <h2>{result.final ? 'Entenda o resultado' : 'Explore a apuração'}</h2>
              </div>
              {view !== 'progress' && (
                <select
                  aria-label="Região da apuração"
                  value={region}
                  onChange={(event) => onRegion(event.target.value)}
                >
                  {['Brasil', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'].map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="or-explore-switch" role="group" aria-label="Visualização da apuração">
              {views.map(({ id, name, icon: Icon }) => (
                <button
                  key={id}
                  aria-pressed={view === id}
                  aria-controls="live-explore-content"
                  onClick={() => setView(id)}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{name}</span>
                </button>
              ))}
            </div>
            <div id="live-explore-content" className="or-explore-content">
              {view === 'map' && (
                <>
                  <Map data={stateResults} region={region} selected={uf} onSelect={onState} />
                  <p className="fine">
                    As cores mostram {result.final ? 'o candidato mais votado' : 'quem lidera'} em
                    cada estado.
                  </p>
                </>
              )}
              {view === 'states' && (
                <LiveStateList
                  data={stateResults}
                  region={region}
                  selected={uf}
                  onSelect={onState}
                />
              )}
              {view === 'regions' && (
                <RegionalResults data={stateResults} turn={2} region={region} onRegion={onRegion} />
              )}
              {view === 'progress' && (
                <ElectionEvolution result={result} points={points} place={place} />
              )}
              {view === 'compare' && (
                <ElectionComparison uf={uf} region={region} onState={onState} />
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="panel or-live-countdown">
            <LiveCountdown
              notification={notification}
              serviceReady={false}
              onEnable={async () => ({
                ok: false,
                message: 'Escolha os eventos na página de alertas.',
              })}
              onAlerts={onAlerts}
              onPrepare={onAlerts}
            />
            {unavailable && (
              <p role="status">
                Não foi possível consultar a fonte. Tentaremos novamente automaticamente.
              </p>
            )}
            <DataFreshness
              checkedAt={live.checkedAt}
              stale={live.stale}
              unavailable={unavailable}
            />
          </section>
          <section className="or-live-contenders" aria-label="Candidatos no segundo turno">
            {candidates.map((candidate) => (
              <article
                key={candidate.number}
                style={{ '--contender-color': candidate.color } as React.CSSProperties}
              >
                <CandidatePortrait name={candidate.full} />
                <div>
                  <span>
                    {candidate.party} · {candidate.number}
                  </span>
                  <h2>{candidate.name}</h2>
                  <p>Aguardando votos</p>
                </div>
              </article>
            ))}
          </section>
          <div className="or-live-actions">
            <button className="button secondary" disabled={!canPreview} onClick={onNight}>
              <Expand size={16} aria-hidden="true" />
              Prévia com o 1º turno
            </button>
            <button className="text-button" onClick={onHistory}>
              Rever apuração de 2022
            </button>
          </div>
        </>
      )}
      <details className="or-live-help">
        <summary>Como interpretar os resultados</summary>
        <div>
          <h3>Liderança parcial</h3>
          <p>
            Quem está à frente pode mudar à medida que novas seções são apuradas. A ordem de
            apuração não é uma amostra aleatória.
          </p>
          <h3>Vantagem numericamente irreversível</h3>
          <p>
            A diferença supera o máximo de votos dos eleitores em seções pendentes, conforme os
            dados atuais. Ainda depende da confirmação oficial.
          </p>
          <h3>Eleito pelo TSE</h3>
          <p>O arquivo oficial informa a situação de eleito.</p>
          <p>
            Os estados têm horários de atualização próprios. Alertas dependem das permissões e da
            conexão do aparelho.
          </p>
        </div>
      </details>
    </div>
  );
}
