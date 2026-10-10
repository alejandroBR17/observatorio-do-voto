'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Reading = 'essential' | 'detailed';
const ReadingContext = createContext<{
  reading: Reading;
  setReading: (value: Reading) => void;
  storageError: boolean;
}>({ reading: 'essential', setReading: () => {}, storageError: false });
export function ReadingProvider({ children }: { children: React.ReactNode }) {
  const [reading, setValue] = useState<Reading>('essential'),
    [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem('observatorio.analysisDetails') === 'expanded') setValue('detailed');
    } catch {}
  }, []);
  function setReading(value: Reading) {
    setValue(value);
    try {
      localStorage.setItem(
        'observatorio.analysisDetails',
        value === 'detailed' ? 'expanded' : 'collapsed',
      );
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return (
    <ReadingContext.Provider value={{ reading, setReading, storageError }}>
      {children}
    </ReadingContext.Provider>
  );
}
export const useReading = () => useContext(ReadingContext);
export function AnalysisPreference() {
  const { reading, setReading, storageError } = useReading();
  return (
    <section className="panel analysis-preference">
      <span className="section-index">03 / PREFERÊNCIAS</span>
      <h2>Como você acompanha</h2>
      <label className="alert-option">
        <input
          type="checkbox"
          checked={reading === 'detailed'}
          onChange={(e) => setReading(e.target.checked ? 'detailed' : 'essential')}
        />
        <span>
          <strong>Mostrar detalhes das pesquisas</strong>
          <small>Deixar metodologia e contexto abertos ao comparar os institutos.</small>
        </span>
      </label>
      {storageError && (
        <p className="fine" role="status">
          Este navegador não permitiu salvar a preferência. Ela vale nesta visita.
        </p>
      )}
    </section>
  );
}
