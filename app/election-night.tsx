'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Expand, Minimize, X, MapPin, RotateCcw } from 'lucide-react';
import { states as stateCatalog, type Candidate, type Result } from '@/lib/elections';
import { candidateIdentity } from '@/lib/candidate-identity';
import { nightResult } from '@/lib/election-night';
import { candidateName, candidateColor, formatPercent, formatVotes } from '@/lib/presentation';
import { Map } from './geo-map';
import { DataFreshness } from './components/data-freshness';
import { ElectionStatusNotice } from './components/election-status-notice';
import { Progression, type ProgressionPoint } from './components/vote-progression';
import { Source } from './components/source-link';
import { ScreenAwakeButton } from './pwa';
import { RegionalResults } from './regional-results';

function CandidatePortrait({ candidate }: { candidate: Candidate }) {
  const [failedSource, setFailedSource] = useState('');
  const photo = candidateIdentity(candidate.name)?.photo || candidate.photo;
  return (
    <span className="night-portrait" aria-hidden="true">
      {photo && failedSource !== photo ? (
        <img src={photo} alt="" loading="lazy" onError={() => setFailedSource(photo)} />
      ) : (
        <span>
          {candidateName(candidate.name)
            .split(' ')
            .map((word) => word[0])
            .slice(0, 2)
            .join('')}
        </span>
      )}
    </span>
  );
}

export function ElectionNight({
  preview,
  result,
  states,
  points,
  checkedAt,
  unavailable,
  message,
  onClose,
  observatory = false,
}: {
  observatory?: boolean;
  preview: boolean;
  result: Result;
  states: Result[];
  points: ProgressionPoint[];
  checkedAt?: string;
  unavailable?: boolean;
  message?: string;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullError, setFullError] = useState('');
  const [selected, setSelected] = useState('BR');
  const [region, setRegion] = useState('Brasil');
  const [allCandidates, setAllCandidates] = useState(false);
  const shown = nightResult(result, states, selected);
  const place =
    selected === 'BR'
      ? 'Brasil'
      : stateCatalog.find((state) => state[1] === selected)?.[2] || selected;
  useEffect(() => {
    setMounted(true);
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        e.preventDefault();
        onClose();
      }
      if (e.key !== 'Tab') return;
      const controls = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button,a[href],select,summary,[tabindex="0"]',
        ) || [],
      ).filter((el) => el.getClientRects().length && !el.hasAttribute('disabled'));
      const first = controls[0],
        last = controls.at(-1);
      if (!panel.current?.contains(document.activeElement)) {
        e.preventDefault();
        first?.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    const onFullscreen = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreen);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      trigger?.focus({ preventScroll: true });
    };
  }, [onClose]);
  useEffect(() => {
    if (mounted) closeButton.current?.focus();
  }, [mounted]);
  useEffect(() => {
    if (!mounted || !observatory || typeof ResizeObserver === 'undefined') return;
    const header = panel.current?.querySelector('.night-header');
    if (!header) return;
    const observer = new ResizeObserver(() =>
      panel.current?.style.setProperty(
        '--night-header-height',
        `${header.getBoundingClientRect().height}px`,
      ),
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, [mounted, observatory]);
  async function toggleFullscreen() {
    setFullError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (panel.current?.requestFullscreen) await panel.current.requestFullscreen();
      else
        setFullError(
          'Tela cheia não está disponível neste navegador. O modo ampliado continua ativo.',
        );
    } catch {
      setFullError('Não foi possível abrir em tela cheia. O modo ampliado continua ativo.');
    }
  }
  if (!mounted) return null;
  return createPortal(
    <div
      className={`election-night${observatory ? ' or-night' : ''}`}
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="night-title"
      data-theme={observatory ? undefined : 'dark'}
    >
      <header className="night-header">
        <div>
          <span className="eyebrow">OBSERVATÓRIO DO VOTO</span>
          <h2 id="night-title">
            {preview
              ? 'Prévia da noite da apuração'
              : result.final
                ? 'O resultado da eleição'
                : 'A noite da apuração'}
          </h2>
        </div>
        <div className="night-controls">
          <ScreenAwakeButton />
          <button
            className="button secondary"
            onClick={() => void toggleFullscreen()}
            aria-label={fullscreen ? 'Sair da tela cheia' : 'Abrir em tela cheia'}
          >
            {fullscreen ? <Minimize size={19} /> : <Expand size={19} />}
          </button>
          <button className="button secondary" ref={closeButton} onClick={onClose}>
            <X size={18} aria-hidden="true" />
            Fechar
          </button>
        </div>
      </header>
      {!preview && <ElectionStatusNotice result={result} />}
      {observatory && (
        <div className="or-night-scope" role="status">
          <div>
            <MapPin size={18} aria-hidden="true" />
            <span>
              <strong>{place}</strong>
              <small>
                {preview
                  ? '2026 · 1º turno · resultado concluído'
                  : '2026 · 2º turno · consulta oficial'}
              </small>
            </span>
          </div>
          {(selected !== 'BR' || region !== 'Brasil') && (
            <button
              className="button secondary"
              onClick={() => {
                setSelected('BR');
                setRegion('Brasil');
              }}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Voltar ao Brasil
            </button>
          )}
        </div>
      )}
      <div className="night-content">
        {preview ? (
          <div className="night-preview-label">
            <strong>PRÉVIA · RESULTADO FINAL DO 1º TURNO DE 2026</strong>
            <p>
              Estes são dados reais do primeiro turno. Não é a apuração do segundo turno nem uma
              simulação da evolução dos votos.
            </p>
          </div>
        ) : (
          <p className="night-live-label">
            {result.final
              ? '2º turno · Apuração concluída · Resultado oficial do TSE'
              : '2º turno · Atualização automática enquanto esta tela estiver aberta'}
          </p>
        )}
        {fullError && (
          <p className="notice" role="status">
            {fullError}
          </p>
        )}
        <div className="night-grid">
          {shown ? (
            <section className="night-scoreboard" aria-labelledby="night-scope">
              <span className="eyebrow">
                PRESIDÊNCIA · {shown.uf === 'BR' ? 'BRASIL' : shown.uf}
              </span>
              <h3 id="night-scope">
                {shown.final ? 'Resultado divulgado' : 'Retrato da apuração'}
              </h3>
              <p className="night-total">
                <strong>{formatPercent(shown.counted)}</strong> das seções totalizadas
              </p>
              <progress value={shown.counted} max={100} aria-label="Seções totalizadas" />
              {(allCandidates ? shown.candidates : shown.candidates.slice(0, 3)).map((c, i) => (
                <div
                  key={c.number}
                  className="night-candidate"
                  style={
                    observatory
                      ? ({
                          '--night-candidate-color': candidateColor(c.number),
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  <span className="night-rank">{String(i + 1).padStart(2, '0')}</span>
                  <CandidatePortrait key={c.number} candidate={c} />
                  <div>
                    <h4>{candidateName(c.name)}</h4>
                    <small>{formatVotes(c.votes)} votos válidos</small>
                    {observatory && (
                      <div className="or-night-vote-track" aria-hidden="true">
                        <i style={{ width: `${c.percent}%` }} />
                      </div>
                    )}
                  </div>
                  <strong>{formatPercent(c.percent)}</strong>
                </div>
              ))}
              {shown.candidates.length > 3 && (
                <button
                  className="text-button"
                  aria-expanded={allCandidates}
                  onClick={() => setAllCandidates(!allCandidates)}
                >
                  {allCandidates ? 'Ver menos candidatos' : 'Ver todos os candidatos'}
                </button>
              )}
              {!preview && message && <p className="night-verdict">{message}</p>}
              <DataFreshness
                archived={preview}
                generated={shown.generated}
                checkedAt={checkedAt}
                unavailable={unavailable}
              />
              <Source href={shown.source}>Resultado oficial do TSE</Source>
            </section>
          ) : (
            <section className="night-scoreboard" role="status">
              <h3>Consultando {place}</h3>
              <p>
                O resultado deste estado ainda não está disponível. O resultado nacional continua
                acessível pelo botão “Voltar ao Brasil”.
              </p>
            </section>
          )}
          <section className="night-map">
            <h3>{region === 'Brasil' ? 'O país, estado por estado' : `Mapa · ${region}`}</h3>
            {observatory && (
              <label className="or-night-state">
                Consultar estado
                <select value={selected} onChange={(event) => setSelected(event.target.value)}>
                  <option value="BR">Brasil inteiro</option>
                  {stateCatalog
                    .filter((state) => region === 'Brasil' || state[3] === region)
                    .map((state) => (
                      <option key={state[1]} value={state[1]}>
                        {state[2]}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <Map data={states} region={region} selected={selected} onSelect={setSelected} />
            <RegionalResults
              data={states}
              turn={result.turn}
              region={region}
              onRegion={(next) => {
                setRegion(next);
                setSelected('BR');
              }}
            />
            {selected !== 'BR' && !observatory && (
              <button className="button secondary" onClick={() => setSelected('BR')}>
                Voltar ao Brasil
              </button>
            )}
          </section>
        </div>
        {!preview && (
          <section className="night-progression">
            <h3>Brasil · desde que você abriu esta tela</h3>
            {points.length > 1 ? (
              <Progression
                points={points}
                greenName="Flávio Bolsonaro"
                label="Progressão nacional do segundo turno durante esta sessão"
              />
            ) : (
              <p>O gráfico aparecerá após duas atualizações oficiais.</p>
            )}
          </section>
        )}
        {!preview && (
          <p className="sr-only" role="status" aria-live="polite">
            Brasil: {formatPercent(result.counted)} das seções totalizadas.{' '}
            {result.candidates[0]
              ? `${candidateName(result.candidates[0].name)} com ${formatPercent(result.candidates[0].percent)}.`
              : ''}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
