'use client';
import { useState } from 'react';
import { RecoveryScreen } from './components/recovery-screen';
export function RecoveryPreview() {
  const [kind, setKind] = useState<'missing' | 'error'>('missing');
  const [retried, setRetried] = useState(false);
  return (
    <>
      <div className="recovery-review">
        <p>Prévia visual dos estados do app · nenhum erro real é provocado.</p>
        <nav aria-label="Estados da prévia">
          <button
            aria-pressed={kind === 'missing'}
            onClick={() => {
              setKind('missing');
              setRetried(false);
            }}
          >
            Página não encontrada
          </button>
          <button
            aria-pressed={kind === 'error'}
            onClick={() => {
              setKind('error');
              setRetried(false);
            }}
          >
            Falha ao carregar
          </button>
          <a href="/offline.html?retorno=previa">Ver leitura offline ↗</a>
        </nav>
        {retried && (
          <p role="status">
            Tentativa simulada. Na tela real, o botão solicita o recarregamento do conteúdo.
          </p>
        )}
      </div>
      <RecoveryScreen kind={kind} home="/identidade" simulation onRetry={() => setRetried(true)} />
    </>
  );
}
