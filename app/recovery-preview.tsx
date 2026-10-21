'use client';
import { useState } from 'react';
import { RecoveryScreen } from './components/recovery-screen';
export function RecoveryPreview() {
  const [kind, setKind] = useState<'missing' | 'error'>('missing');
  const [retried, setRetried] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  return (
    <>
      <div className="recovery-review">
        <details
          open={controlsOpen}
          onToggle={(event) => setControlsOpen(event.currentTarget.open)}
        >
          <summary>
            Prévia · {kind === 'missing' ? 'Página não encontrada' : 'Falha ao carregar'}
            <span>Trocar tela</span>
          </summary>
          <p>Demonstração visual. Nenhum erro real é provocado.</p>
          <nav aria-label="Estados da prévia">
            <button
              aria-pressed={kind === 'missing'}
              onClick={() => {
                setKind('missing');
                setRetried(false);
                setControlsOpen(false);
              }}
            >
              Página não encontrada
            </button>
            <button
              aria-pressed={kind === 'error'}
              onClick={() => {
                setKind('error');
                setRetried(false);
                setControlsOpen(false);
              }}
            >
              Falha ao carregar
            </button>
            <a href="/offline.html?retorno=previa">Ver leitura offline ↗</a>
          </nav>
        </details>
        {retried && (
          <p role="status">
            Tentativa simulada. Na tela real, o botão solicita o recarregamento do conteúdo.
          </p>
        )}
      </div>
      <RecoveryScreen
        key={kind}
        kind={kind}
        home="/identidade"
        simulation
        onRetry={() => setRetried(true)}
      />
    </>
  );
}
