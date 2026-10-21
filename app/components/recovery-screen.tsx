'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Compass, RotateCcw, TriangleAlert } from 'lucide-react';

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
  const Icon = missing ? Compass : TriangleAlert;
  return (
    <div className="recovery-page control-room">
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
          <Icon size={64} strokeWidth={1} />
          <span>{missing ? '404' : '!'}</span>
        </div>
        <div className="recovery-copy">
          <span className="eyebrow">
            {missing ? 'CAMINHO NÃO ENCONTRADO' : 'NÃO FOI POSSÍVEL CARREGAR'}
          </span>
          <h1>{missing ? 'Vamos encontrar outro caminho.' : 'Não conseguimos abrir esta tela.'}</h1>
          <p>
            {missing
              ? 'Esse endereço pode ter mudado ou não existir. O painel continua sendo seu ponto de partida para explorar a eleição.'
              : 'Pode ser uma falha temporária. Tente carregar novamente ou volte ao painel para continuar acompanhando.'}
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
              Explorar eleições anteriores
              <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      </main>
      <footer>Observar o voto. Entender o país.</footer>
    </div>
  );
}
