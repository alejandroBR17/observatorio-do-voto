'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { learningLabel } from '@/lib/discoveries';
import {
  correctInterest,
  emptyLearning,
  learnDetail,
  learnInterest,
  learningKey,
  noteDiscoveries,
  readLearning,
  suggestedReading,
  type LearningState,
} from '@/lib/personalization';

const LearningContext = createContext({
  state: emptyLearning(),
  ready: false,
  storageError: false,
  readingSuggestion: null as 'essential' | 'detailed' | null,
  visit: (_key: string) => {},
  detail: (_direction: 1 | -1) => {},
  correct: (_key: string, _value: -1 | 0 | 1) => {},
  seen: (_ids: string[]) => {},
  configure: (_enabled: boolean, _autoDetails?: boolean) => {},
  clear: () => {},
  baseline: (_reading: 'essential' | 'detailed') => {},
});
export function PersonalizationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(emptyLearning);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [readingSuggestion, setReadingSuggestion] = useState<'essential' | 'detailed' | null>(null);
  const current = useRef(state);
  useEffect(() => {
    const load = (initial = false) => {
      let next = emptyLearning();
      try {
        const stored = localStorage.getItem(learningKey);
        next = readLearning(JSON.parse(stored || 'null'));
        if (stored && stored !== JSON.stringify(next))
          localStorage.setItem(learningKey, JSON.stringify(next));
      } catch {
        setStorageError(true);
        /* Unreadable storage never opts a visitor in. */
      }
      current.current = next;
      setState(next);
      if (initial || !next.enabled || !next.autoDetails)
        setReadingSuggestion(suggestedReading(next));
      setReady(true);
    };
    load(true);
    const sync = (event: StorageEvent) => {
      if (event.key === learningKey || event.key === null) load();
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const update = useCallback((transform: (value: LearningState) => LearningState) => {
    const next = transform(current.current);
    if (next === current.current) return;
    current.current = next;
    setState(next);
    try {
      localStorage.setItem(learningKey, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, []);
  const visit = useCallback(
    (key: string) => {
      // Adopt a learned reading style at navigation boundaries, never while someone is reading.
      if (key.startsWith('topic:')) setReadingSuggestion(suggestedReading(current.current));
      update((value) => learnInterest(value, key));
    },
    [update],
  );
  const detail = useCallback(
    (direction: 1 | -1) => update((value) => learnDetail(value, direction)),
    [update],
  );
  const correct = useCallback(
    (key: string, value: -1 | 0 | 1) => update((state) => correctInterest(state, key, value)),
    [update],
  );
  const seen = useCallback(
    (ids: string[]) => update((value) => noteDiscoveries(value, ids)),
    [update],
  );
  const configure = useCallback(
    (enabled: boolean, autoDetails?: boolean) => {
      update((value) => ({
        ...readLearning(value),
        enabled,
        autoDetails: autoDetails ?? value.autoDetails,
      }));
      setReadingSuggestion(suggestedReading(current.current));
    },
    [update],
  );
  const baseline = useCallback(
    (reading: 'essential' | 'detailed') => {
      update((value) =>
        value.enabled
          ? {
              ...value,
              detail: { value: reading === 'detailed' ? 3 : -3, samples: 3, at: Date.now() },
            }
          : value,
      );
      setReadingSuggestion(null);
    },
    [update],
  );
  const clear = useCallback(() => {
    const next = emptyLearning();
    current.current = next;
    setState(next);
    setReadingSuggestion(null);
    try {
      localStorage.removeItem(learningKey);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, []);
  return (
    <LearningContext.Provider
      value={{
        state,
        ready,
        storageError,
        readingSuggestion,
        visit,
        detail,
        correct,
        seen,
        configure,
        baseline,
        clear,
      }}
    >
      {children}
    </LearningContext.Provider>
  );
}
export const usePersonalization = () => useContext(LearningContext);

/** Opening alone is not proof of interest; a deliberate quick collapse suggests less detail. */
export function useDetailLearning() {
  const { detail, state } = usePersonalization();
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!state.enabled || !state.autoDetails) {
      clearTimeout(timer.current);
      started.current = 0;
    }
  }, [state.enabled, state.autoDetails]);
  return (opening: boolean) => {
    clearTimeout(timer.current);
    if (!state.enabled || !state.autoDetails) return;
    if (opening) {
      started.current = Date.now();
      timer.current = setTimeout(() => {
        if (document.visibilityState === 'visible') detail(1);
      }, 8000);
    } else {
      if (!started.current || Date.now() - started.current < 4000) detail(-1);
      started.current = 0;
    }
  };
}

export function PersonalizationSettings() {
  const { state, ready, storageError, configure, clear, correct } = usePersonalization();
  const [message, setMessage] = useState('');
  return (
    <section className="panel learning-settings">
      <span className="eyebrow">PERSONALIZAÇÃO NO APARELHO</span>
      <h2>Um observatório que aprende com seu uso</h2>
      <p>
        Com sua autorização, consultas a lugares e assuntos ajudam a escolher sugestões. Abrir e
        fechar detalhes ajuda a ajustar a leitura nas próximas páginas.
      </p>
      <label className="alert-option">
        <input
          type="checkbox"
          disabled={!ready}
          checked={state.enabled}
          onChange={(event) => {
            configure(event.target.checked);
            setMessage(
              event.target.checked
                ? 'Aprendizado ativado neste aparelho.'
                : 'Aprendizado pausado. Suas consultas continuam disponíveis.',
            );
          }}
        />
        <span>
          <strong>Aprender com meu uso</strong>
          <small>
            Opcional. Os sinais ficam apenas neste navegador, sem envio ao servidor ou Analytics.
          </small>
        </span>
      </label>
      <label className="alert-option">
        <input
          type="checkbox"
          disabled={!ready || !state.enabled}
          checked={state.autoDetails}
          onChange={(event) => configure(state.enabled, event.target.checked)}
        />
        <span>
          <strong>Ajustar o nível de detalhe automaticamente</strong>
          <small>
            As mudanças valem nas próximas páginas; você pode manter sua escolha manual.
          </small>
        </span>
      </label>
      <p className="fine">
        Guardamos contadores resumidos por assunto, estado ou região e correções por até 30 dias de
        inatividade, descartados na próxima leitura do app. Não registramos nomes de candidatos,
        textos de anotações, colégios ou seções neste aprendizado. Suas escolhas de alertas são
        independentes.
      </p>
      {Object.keys(state.corrections).length > 0 && (
        <details className="inline-details">
          <summary>Seus ajustes de sugestões ({Object.keys(state.corrections).length})</summary>
          <ul>
            {Object.entries(state.corrections).map(([key, signal]) => (
              <li key={key}>
                {signal.value === 1 ? 'Mais' : 'Menos'} sobre {learningLabel(key)}{' '}
                <button
                  className="text-button"
                  onClick={() => {
                    correct(key, 0);
                    setMessage('Ajuste desfeito para as próximas sugestões.');
                  }}
                >
                  Desfazer ajuste de {learningLabel(key)}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      <button
        className="button secondary"
        onClick={() => {
          clear();
          setMessage(
            'Aprendizado apagado e desligado. Seu caderno e suas preferências foram preservados.',
          );
        }}
      >
        Apagar aprendizado
      </button>
      {(message || storageError) && (
        <p role="status" className="fine">
          {storageError
            ? 'Não foi possível atualizar o armazenamento. A mudança vale nesta visita; os dados anteriores podem continuar no navegador.'
            : message}
        </p>
      )}
    </section>
  );
}
