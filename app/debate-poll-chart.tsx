'use client';
import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
  Legend,
  type LabelProps,
} from 'recharts';
import type { PollSnapshot } from '@/lib/polls/types';
type PollPoint = { id: string; date: string; Flávio: number; Lula: number };
function PollPointLabel({
  x,
  y,
  index,
  candidate,
  seriesPoints,
}: LabelProps & { candidate: 'Flávio' | 'Lula'; seriesPoints: PollPoint[] }) {
  const point = index === undefined ? undefined : seriesPoints[index];
  const px = Number(x),
    py = Number(y);
  if (!point || !Number.isFinite(px) || !Number.isFinite(py)) return null;
  const other = candidate === 'Flávio' ? 'Lula' : 'Flávio';
  const above =
    point[candidate] > point[other] ||
    (point[candidate] === point[other] && candidate === 'Flávio');
  return (
    <text
      x={px}
      y={py + (above ? -15 : 24)}
      textAnchor="middle"
      fill={`var(--data-${candidate === 'Flávio' ? 'flavio' : 'lula'})`}
      fontSize={14}
      fontWeight={700}
      stroke="var(--surface)"
      strokeWidth={4}
      paintOrder="stroke"
      aria-hidden="true"
    >
      {point[candidate].toLocaleString('pt-BR')}%
    </text>
  );
}
export default function DebatePollChart({ polls }: { polls: PollSnapshot[] }) {
  const valid = useMemo(
    () =>
      polls.filter(
        (p) =>
          p.scope === 'Brasil' &&
          p.turn === 2 &&
          p.basis === 'valid' &&
          Date.parse(p.publishedAt) >= Date.parse('2026-10-05T00:00:00-03:00'),
      ),
    [polls],
  );
  const institutes = [...new Set(valid.map((p) => p.institute))];
  const [selected, setSelected] = useState('');
  const institute = institutes.includes(selected) ? selected : institutes[0];
  const points = useMemo(
    () =>
      valid
        .filter((p) => p.institute === institute)
        .sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))
        .slice(-8)
        .map((p) => ({
          id: p.id,
          date: new Date(p.publishedAt).toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
          }),
          Flávio: p.flavio,
          Lula: p.lula,
        })),
    [valid, institute],
  );
  if (!institute) return <p>Nenhuma série com votos válidos publicados está disponível.</p>;
  return (
    <div className="debate-poll-chart">
      <label>
        Instituto para comparar
        <select value={institute} onChange={(e) => setSelected(e.target.value)}>
          {institutes.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <p className="debate-small">
        Rodadas do mesmo instituto, pelos dias de divulgação. Votos válidos publicados, sem
        conversão. Mudanças não podem ser atribuídas somente ao debate.
      </p>
      {points.length > 1 ? (
        <div
          className="debate-chart-scroll"
          role="region"
          aria-label="Evolução com percentuais em cada ponto. Em telas pequenas, deslize para ver todas as datas."
          tabIndex={0}
        >
          <div
            className="debate-chart-canvas"
            style={{ minWidth: Math.max(290, points.length * 76) }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={points}
                accessibilityLayer
                margin={{ top: 32, right: 28, bottom: 20, left: 8 }}
              >
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 12 }} interval={0} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                  width={36}
                  unit="%"
                />
                <Tooltip
                  formatter={(value) => `${Number(value).toLocaleString('pt-BR')}%`}
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                    borderRadius: 10,
                  }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  dataKey="Flávio"
                  stroke="var(--data-flavio)"
                  strokeWidth={3}
                  isAnimationActive={false}
                  dot={{ r: 4 }}
                >
                  <LabelList
                    content={(props) => (
                      <PollPointLabel {...props} candidate="Flávio" seriesPoints={points} />
                    )}
                  />
                </Line>
                <Line
                  dataKey="Lula"
                  stroke="var(--data-lula)"
                  strokeWidth={3}
                  isAnimationActive={false}
                  dot={{ r: 4 }}
                >
                  <LabelList
                    content={(props) => (
                      <PollPointLabel {...props} candidate="Lula" seriesPoints={points} />
                    )}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="debate-small">
          Há apenas uma rodada deste instituto no período. A tabela mantém os números disponíveis.
        </p>
      )}
      {points.length > 1 && (
        <p className="debate-small">
          Os números junto aos pontos são os percentuais publicados. No celular, deslize somente o
          gráfico para ver todas as datas. A tabela abaixo mantém todos os valores.
        </p>
      )}
      <table>
        <caption>Resultados publicados · {institute}</caption>
        <thead>
          <tr>
            <th>Divulgação</th>
            <th>Flávio</th>
            <th>Lula</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.id}>
              <td>{p.date}</td>
              <td>{p.Flávio.toLocaleString('pt-BR')}%</td>
              <td>{p.Lula.toLocaleString('pt-BR')}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
