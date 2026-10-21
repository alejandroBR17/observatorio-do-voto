'use client';
import { useState } from 'react';
import Link from 'next/link';
import { NotificationHistory, type HistoryPreview } from './notification-history';
const examples: HistoryPreview['items'] = [
  {
    id: 'example-1',
    title: 'Pesquisa incluída no acompanhamento',
    body: 'Exemplo de apresentação de um aviso de pesquisa, com acesso à atualização correspondente.',
    url: '/?tab=polls',
    receivedAt: Date.parse('2026-10-21T15:00:00-03:00'),
  },
  {
    id: 'example-2',
    title: 'Resumo da cobertura',
    body: 'Exemplo de um resumo recebido neste aparelho. Esta demonstração não foi enviada como notificação.',
    url: '/?tab=social',
    receivedAt: Date.parse('2026-10-21T12:30:00-03:00'),
  },
];
const states: { label: string; value: HistoryPreview }[] = [
  { label: 'Com avisos', value: { status: 'ready', items: examples } },
  { label: 'Vazio', value: { status: 'ready', items: [] } },
  { label: 'Carregando', value: { status: 'loading', items: [] } },
  { label: 'Falha de consulta', value: { status: 'error', items: [] } },
];
export function HistoryPreviewPage() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="control-room or-alerts history-review-page">
      <main>
        <Link className="button secondary" href="/identidade?tab=alerts">
          ← Voltar aos Alertas
        </Link>
        <header>
          <span className="eyebrow">PRÉVIA / AVISOS RECEBIDOS</span>
          <h1>O histórico, em cada situação.</h1>
          <p>
            Exemplos visuais. Nada é enviado, consultado ou apagado no aparelho. Os botões de
            atualização e limpeza apenas simulam o fluxo.
          </p>
        </header>
        <nav className="history-review-controls" aria-label="Situações do histórico">
          {states.map((state, i) => (
            <button key={state.label} aria-pressed={selected === i} onClick={() => setSelected(i)}>
              {state.label}
            </button>
          ))}
        </nav>
        <NotificationHistory key={selected} preview={states[selected].value} />
      </main>
    </div>
  );
}
