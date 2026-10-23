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
} from 'recharts';
import type { PollSnapshot } from '@/lib/polls/types';
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
        <div className="debate-chart-canvas">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={points}
              accessibilityLayer
              margin={{ top: 15, right: 20, bottom: 10, left: 0 }}
            >
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                width={36}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  borderRadius: 10,
                }}
              />
              <Line
                dataKey="Flávio"
                stroke="var(--data-flavio)"
                strokeWidth={3}
                isAnimationActive={false}
              />
              <Line
                dataKey="Lula"
                stroke="var(--data-lula)"
                strokeWidth={3}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="debate-small">
          Há apenas uma rodada deste instituto no período. A tabela mantém os números disponíveis.
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
