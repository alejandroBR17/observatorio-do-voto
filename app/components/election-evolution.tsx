'use client';
import { useEffect, useState } from 'react';
import type { Result } from '@/lib/elections';
import { progressionPoint, mergeProgressionPoints, type ProgressionPoint } from '@/lib/progression';
import { Progression } from './vote-progression';

export function ElectionEvolution({
  result,
  points,
  place,
}: {
  result: Result;
  points: ProgressionPoint[];
  place: string;
}) {
  const [series, setSeries] = useState<'2026' | '2022'>('2026');
  const [saved, setSaved] = useState<{ uf: string; points: ProgressionPoint[] } | null>(null);
  const [historical, setHistorical] = useState<ProgressionPoint[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  useEffect(() => {
    if (series !== '2026') return;
    const controller = new AbortController();
    const run = () =>
      fetch(`/api/progression?uf=${result.uf}`, { signal: controller.signal, cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw Error();
          return response.json();
        })
        .then((payload) => {
          if (
            payload.uf !== result.uf ||
            payload.year !== 2026 ||
            payload.turn !== 2 ||
            !Array.isArray(payload.points)
          )
            throw Error('Série incompatível');
          setSaved({ uf: result.uf, points: payload.points });
        })
        .catch(() => {});
    void run();
    const timer = setInterval(run, 60000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [series, result.uf]);
  useEffect(() => {
    if (series !== '2022' || historical) return;
    const controller = new AbortController();
    fetch('/data/progression-2022-2.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then(setHistorical)
      .catch(() => {
        if (!controller.signal.aborted) setHistoryError(true);
      });
    return () => controller.abort();
  }, [series, historical]);
  const current = progressionPoint(result);
  const observed = [
    ...(saved?.uf === result.uf ? saved.points : []),
    ...points,
    ...(current ? [current] : []),
  ];
  const unique = mergeProgressionPoints(observed);
  const chosen = series === '2022' ? historical : unique;
  return (
    <section className="election-evolution">
      <div className="comparison-mode" role="group" aria-label="Série da apuração">
        <button aria-pressed={series === '2026'} onClick={() => setSeries('2026')}>
          2026 · {place}
        </button>
        <button aria-pressed={series === '2022'} onClick={() => setSeries('2022')}>
          Rever Brasil em 2022
        </button>
      </div>
      {series === '2026' && unique.length < 2 && (
        <p className="evolution-limit">
          O serviço não preservou a sequência completa da noite de 2026. Abrir o app após o
          encerramento não recupera as parciais anteriores.
        </p>
      )}
      {chosen ? (
        <Progression
          points={chosen}
          greenName={series === '2022' ? 'Jair Bolsonaro' : 'Flávio Bolsonaro'}
          label={
            series === '2022'
              ? 'Histórico oficial da totalização nacional de 2022 · 2º turno'
              : `Boletins observados em 2026 · ${place}`
          }
        />
      ) : (
        <p role="status">
          {historyError ? 'Não foi possível carregar a série de 2022.' : 'Carregando histórico…'}
        </p>
      )}
      <p className="fine">
        {series === '2022'
          ? '2022 · Brasil inteiro · série histórica real do TSE, amostrada em aproximadamente 100 registros.'
          : '2026 · boletins observados pelo serviço e nesta sessão; cobertura pode ser incompleta.'}
      </p>
      <a
        className="text-button"
        href={
          series === '2022'
            ? 'https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/Historico_Totalizacao_Presidente_BR_2T_2022.zip'
            : 'https://evolucao-totalizacao.tse.jus.br/'
        }
        target="_blank"
        rel="noreferrer"
      >
        {series === '2022'
          ? 'Arquivo histórico do TSE ↗'
          : 'Consultar painel oficial de evolução do TSE ↗'}
      </a>
    </section>
  );
}
