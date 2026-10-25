'use client';
import { useState } from 'react';
import { states, type Result } from '@/lib/elections';
import { candidateName, formatPercent, formatVotes } from '@/lib/presentation';
import { liveMargin } from '@/lib/live-summary';

export function LiveStateList({
  data,
  region,
  selected,
  onSelect,
}: {
  data: Result[];
  region: string;
  selected: string;
  onSelect: (uf: string) => void;
}) {
  const [order, setOrder] = useState('name');
  const rows = states
    .filter((state) => region === 'Brasil' || state[3] === region)
    .map((state) => ({
      uf: state[1],
      name: state[2],
      result: data.find((row) => row.uf === state[1] && row.year === 2026 && row.turn === 2),
    }))
    .sort((a, b) => {
      if (order === 'progress')
        return (
          (b.result?.counted ?? -1) - (a.result?.counted ?? -1) ||
          a.name.localeCompare(b.name, 'pt-BR')
        );
      if (order === 'close')
        return (
          (a.result ? (liveMargin(a.result)?.points ?? Infinity) : Infinity) -
            (b.result ? (liveMargin(b.result)?.points ?? Infinity) : Infinity) ||
          a.name.localeCompare(b.name, 'pt-BR')
        );
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  return (
    <section className="or-state-list" aria-labelledby="state-list-title">
      <div className="or-live-heading">
        <div>
          <h3 id="state-list-title">Estado por estado</h3>
          <p>Abra um estado para acompanhar seus votos.</p>
        </div>
        <label>
          Ordenar por
          <select
            aria-label="Ordenar estados"
            value={order}
            onChange={(event) => setOrder(event.target.value)}
          >
            <option value="name">Nome do estado</option>
            <option value="progress">Apuração mais avançada</option>
            <option value="close">Menor diferença em pontos</option>
          </select>
        </label>
      </div>
      <p className="fine">
        {rows.filter((row) => row.result).length} de {rows.length} UFs com boletim disponível neste
        recorte. Cada boletim tem seu próprio horário.
      </p>
      <div className="or-state-rows">
        {rows.map(({ uf, name, result }) => {
          const margin = result ? liveMargin(result) : null;
          return (
            <button
              key={uf}
              aria-pressed={selected === uf}
              className="or-state-row"
              onClick={() => onSelect(uf)}
            >
              <span className="or-state-name">
                <b>{uf}</b>
                <span>
                  {name}
                  <small>
                    {result?.generated ? `Boletim: ${result.generated}` : 'Aguardando boletim'}
                  </small>
                </span>
              </span>
              <span>
                {margin
                  ? margin.votes === 0
                    ? 'Empate em votos'
                    : `${candidateName(margin.leader.name)} ${result?.final ? 'mais votado' : 'lidera'}`
                  : 'Sem votos disponíveis'}
                <small>
                  {margin
                    ? `Diferença: ${formatVotes(margin.votes)} votos · ${formatPercent(margin.points).replace('%', ' p.p.')}`
                    : 'Nenhuma liderança atribuída'}
                </small>
              </span>
              <span className="or-state-progress">
                {result ? (
                  <>
                    <strong>{formatPercent(result.counted)}</strong>
                    <small>seções totalizadas</small>
                  </>
                ) : (
                  '—'
                )}
                <span className="bar-track" aria-hidden="true">
                  <span style={{ width: `${result?.counted ?? 0}%` }} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
