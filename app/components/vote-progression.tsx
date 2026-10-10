'use client';
import { useState } from 'react';
import { formatPercent as pct } from '@/lib/presentation';
export type ProgressionPoint = { id?: string; counted: number; lula: number; bolsonaro: number };
export function Progression({
  points,
  label = 'Progressão real da apuração presidencial de 2022',
  greenName = 'Jair Bolsonaro',
}: {
  points: ProgressionPoint[];
  label?: string;
  greenName?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const valid = points.filter((p) => [p.counted, p.lula, p.bolsonaro].every(Number.isFinite)),
    values = valid.flatMap((p) => [p.lula, p.bolsonaro]);
  const lower = values.length ? Math.max(0, Math.floor((Math.min(...values) - 2) / 5) * 5) : 40,
    upper = values.length ? Math.min(100, Math.ceil((Math.max(...values) + 2) / 5) * 5) : 60,
    range = Math.max(1, upper - lower);
  const y = (n: number) => 180 - ((n - lower) / range) * 150,
    line = (k: 'lula' | 'bolsonaro') =>
      valid.map((p) => `${35 + p.counted * 6.1},${y(p[k])}`).join(' ');
  return (
    <>
      <svg viewBox="0 0 680 230" role="img" aria-label={label} className="line-chart">
        {Array.from({ length: 5 }, (_, i) => lower + (range * i) / 4).map((n) => (
          <g key={n}>
            <line x1="35" x2="645" y1={y(n)} y2={y(n)} stroke="var(--line)" strokeDasharray="3 5" />
            <text x="0" y={y(n) + 4}>
              {n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
            </text>
          </g>
        ))}
        <polyline points={line('lula')} fill="none" stroke="#c96856" strokeWidth="3" />
        <polyline points={line('bolsonaro')} fill="none" stroke="#24796d" strokeWidth="3" />
        {[0, 25, 50, 75, 100].map((n) => (
          <text key={n} x={35 + n * 6.1} y="215" textAnchor="middle">
            {n}% apurado
          </text>
        ))}
      </svg>
      <p className="fine">
        O gráfico mostra como a participação de cada candidato mudou durante a apuração. As linhas
        ligam os resultados divulgados.
      </p>
      <details className="inline-details">
        <summary>Ver valores do gráfico em tabela</summary>
        <p className="fine">
          {valid.length} registros disponíveis. Cada coluna identifica um candidato. Os valores são
          os mesmos usados para desenhar as linhas.
        </p>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Valores da progressão de apuração"
        >
          <table>
            <thead>
              <tr>
                <th>Seções totalizadas</th>
                <th>Lula</th>
                <th>{greenName}</th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? valid : valid.slice(0, 10)).map((p, i) => (
                <tr key={p.id || i}>
                  <td>{pct(p.counted)}</td>
                  <td>{pct(p.lula)}</td>
                  <td>{pct(p.bolsonaro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {valid.length > 10 && (
          <button
            className="text-button"
            aria-expanded={showAll}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Ver menos registros' : `Ver todos os ${valid.length} registros`}
          </button>
        )}
      </details>
    </>
  );
}
