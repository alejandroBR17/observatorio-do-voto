'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, RotateCcw } from 'lucide-react';

export function RecoveryScreen({
  kind,
  onRetry,
  home = '/',
  simulation = false,
}: {
  kind: 'missing' | 'error';
  onRetry?: () => void;
  home?: string;
  simulation?: boolean;
}) {
  const missing = kind === 'missing';
  return (
    <div className={`recovery-page control-room recovery-${kind}`}>
      <header>
        <Link className="recovery-brand" href={home} aria-label="Observatório do Voto — início">
          <img src="/app-icon.svg" width="36" height="36" alt="" />
          <span>
            observatório<small>DO VOTO</small>
          </span>
        </Link>
      </header>
      <main>
        <div className="recovery-visual" aria-hidden="true">
          <svg viewBox="0 0 320 170" fill="none">
            <path
              className="recovery-terrain"
              d="M-10 110C50 45 75 170 140 90S230 10 340 65M-10 140C70 75 90 200 170 115S260 40 340 100M-10 60C45 0 90 100 150 45S245-20 340 25"
            />
            <path className="recovery-route-base" d="M32 126L95 96L149 110L209 51L286 42" />
            <path className="recovery-route" d="M32 126L95 96L149 110L209 51" />
            <circle className="recovery-point" cx="32" cy="126" r="5" />
            <circle className="recovery-point" cx="95" cy="96" r="5" />
            <circle className="recovery-point" cx="149" cy="110" r="5" />
            <circle className="recovery-destination" cx="209" cy="51" r="16" />
            <circle className="recovery-pulse" cx="209" cy="51" r="27" />
          </svg>
          <div className="recovery-map-caption">
            {missing ? <strong>404</strong> : <RotateCcw size={22} />}
            <span>{missing ? 'Vamos por outro caminho' : 'Pronto para tentar de novo'}</span>
          </div>
        </div>
        <div className="recovery-copy">
          <span className="eyebrow">
            {missing ? 'PÁGINA NÃO ENCONTRADA' : 'NÃO FOI POSSÍVEL CARREGAR'}
          </span>
          <h1>{missing ? 'Esse caminho saiu do mapa.' : 'Vamos retomar a leitura.'}</h1>
          <p>
            {missing
              ? 'Não encontramos esta página. Volte ao painel para continuar explorando a eleição.'
              : 'Esta tela não carregou. Tente novamente ou volte ao painel para continuar acompanhando.'}
          </p>
          <div className="recovery-actions">
            {!missing && onRetry && (
              <button className="button primary" onClick={onRetry}>
                <RotateCcw size={17} />
                {simulation ? 'Simular nova tentativa' : 'Tentar novamente'}
              </button>
            )}
            <Link href={home} className={`button ${missing ? 'primary' : 'secondary'}`}>
              <ArrowLeft size={17} />
              Voltar ao painel
            </Link>
          </div>
          {missing && (
            <Link className="recovery-secondary" href={`${home}?tab=history`}>
              Ver eleições anteriores
              <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      </main>
      <footer>Observar o voto. Entender o país.</footer>
    </div>
  );
}
