'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Expand, Minimize, X } from 'lucide-react';
import type { Candidate, Result } from '@/lib/elections';
import { candidateName, formatPercent, formatVotes } from '@/lib/presentation';
import { Map } from './geo-map';
import { DataFreshness } from './components/data-freshness';
import { Progression, type ProgressionPoint } from './components/vote-progression';
import { Source } from './components/source-link';

function CandidatePortrait({ candidate }: { candidate: Candidate }) {
  const [failed, setFailed] = useState(false);
  const photo =
    candidate.number === '13'
      ? '/assets/lula.jpeg'
      : candidate.number === '22'
        ? '/assets/flavio.jpeg'
        : candidate.photo;
  return (
    <span className="night-portrait" aria-hidden="true">
      {photo && !failed ? (
        <img src={photo} alt="" loading="lazy" onError={() => setFailed(true)} />
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
}: {
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
  const [allCandidates, setAllCandidates] = useState(false);
  const shown = states.find((s) => s.uf === selected) || result;
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
        panel.current?.querySelectorAll<HTMLElement>('button,a[href],summary,[tabindex="0"]') || [],
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
      className="election-night"
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="night-title"
      data-theme="dark"
    >
      <header className="night-header">
        <div>
          <span className="eyebrow">OBSERVATÓRIO DO VOTO</span>
          <h2 id="night-title">
            {preview ? 'Prévia da noite da apuração' : 'A noite da apuração'}
          </h2>
        </div>
        <div className="night-controls">
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
            2º turno · Atualização automática enquanto esta tela estiver aberta
          </p>
        )}
        {fullError && (
          <p className="notice" role="status">
            {fullError}
          </p>
        )}
        <div className="night-grid">
          <section className="night-scoreboard" aria-labelledby="night-scope">
            <span className="eyebrow">PRESIDÊNCIA · {shown.uf === 'BR' ? 'BRASIL' : shown.uf}</span>
            <h3 id="night-scope">{shown.final ? 'Resultado divulgado' : 'Retrato da apuração'}</h3>
            <p className="night-total">
              <strong>{formatPercent(shown.counted)}</strong> das seções totalizadas
            </p>
            <progress value={shown.counted} max={100} aria-label="Seções totalizadas" />
            {(allCandidates ? shown.candidates : shown.candidates.slice(0, 3)).map((c, i) => (
              <div key={c.number} className="night-candidate">
                <span className="night-rank">{String(i + 1).padStart(2, '0')}</span>
                <CandidatePortrait key={c.number} candidate={c} />
                <div>
                  <h4>{candidateName(c.name)}</h4>
                  <small>{formatVotes(c.votes)} votos válidos</small>
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
          <section className="night-map">
            <h3>O país, estado por estado</h3>
            <Map data={states} region="Brasil" selected={selected} onSelect={setSelected} />
            {selected !== 'BR' && (
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
