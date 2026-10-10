'use client';
import { useState } from 'react';
import { RotateCcw, ArrowDown } from 'lucide-react';
import { transferScenario } from '@/lib/poll-view';
export function TransferScenario({ a, b, others }: { a: number; b: number; others: number }) {
  const [toA, setToA] = useState(50),
    [excluded, setExcluded] = useState(10),
    s = transferScenario(a, b, others, toA, excluded);
  const pct = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%',
    votes = (n: number) => Math.round(n).toLocaleString('pt-BR');
  return (
    <div className="transfer-lab">
      <span className="eyebrow">HIPÓTESE PESSOAL · NÃO É PESQUISA NEM PREVISÃO</span>
      <h2>Para onde iriam os votos dos demais candidatos?</h2>
      <p>
        Partimos dos <strong>{votes(others)} votos</strong> recebidos pelos candidatos que ficaram
        fora do segundo turno.
      </p>
      <div className="transfer-origin">
        <span>Votos dos demais candidatos no 1º turno</span>
        <strong>{votes(others)}</strong>
        <ArrowDown size={22} />
      </div>
      <div className="transfer-controls">
        <label htmlFor="excluded-votes">
          Primeiro, quantos deixariam de votar em um candidato?<strong>{excluded}%</strong>
        </label>
        <input
          id="excluded-votes"
          type="range"
          min="0"
          max="100"
          value={excluded}
          onChange={(e) => setExcluded(+e.target.value)}
        />
        <p className="fine">Nesta hipótese, essa parcela se abstém ou vota branco/nulo.</p>
        <label htmlFor="transfer-votes">
          Dos que ainda escolheriam um candidato, quantos iriam para Flávio?<strong>{toA}%</strong>
        </label>
        <input
          id="transfer-votes"
          disabled={excluded === 100}
          type="range"
          min="0"
          max="100"
          value={toA}
          onChange={(e) => setToA(+e.target.value)}
        />
        <div className="transfer-range-labels">
          <span>Flávio: {toA}%</span>
          <span>Lula: {100 - toA}%</span>
        </div>
      </div>
      <p className="fine">A cada 100 votos desse grupo, a distribuição seria:</p>
      <div className="transfer-destinations">
        <div>
          <span>Flávio</span>
          <strong>{pct(s.aShare)}</strong>
          <small>{votes(s.aVotes - a)} votos transferidos</small>
        </div>
        <div>
          <span>Lula</span>
          <strong>{pct(s.bShare)}</strong>
          <small>{votes(s.bVotes - b)} votos transferidos</small>
        </div>
        <div>
          <span>Sem voto em candidato</span>
          <strong>{pct(excluded)}</strong>
          <small>{votes(s.excluded)} votos fora dos válidos</small>
        </div>
      </div>
      <div className="transfer-result">
        <span className="eyebrow">RESULTADO DESTA HIPÓTESE · VOTOS VÁLIDOS</span>
        <div className="poll-big">
          <span style={{ color: 'var(--candidate-a)' }}>
            {pct(s.aPercent)}
            <small>Flávio Bolsonaro</small>
          </span>
          <span style={{ color: 'var(--candidate-b)' }}>
            {pct(s.bPercent)}
            <small>Lula</small>
          </span>
        </div>
        <div className="split-bar">
          <div style={{ width: s.aPercent + '%', background: 'var(--candidate-a)' }} />
          <div style={{ width: s.bPercent + '%', background: 'var(--candidate-b)' }} />
        </div>
      </div>
      <details className="inline-details">
        <summary>O que fica fixo nesta simulação?</summary>
        <p>
          Mantemos os {votes(a)} votos de Flávio e os {votes(b)} votos de Lula no primeiro turno. Só
          redistribuímos os votos dos demais candidatos. Não incluímos novos votantes, trocas entre
          os finalistas nem mudanças de participação dos seus eleitores.
        </p>
      </details>
      <button
        className="text-button"
        onClick={() => {
          setToA(50);
          setExcluded(10);
        }}
      >
        <RotateCcw size={14} />
        Recomeçar a simulação
      </button>
    </div>
  );
}
