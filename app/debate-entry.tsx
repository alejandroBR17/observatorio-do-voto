'use client';
import { useEffect, useState } from 'react';
import { MessagesSquare, ArrowRight } from 'lucide-react';
export function DebateEntry({ onOpen }: { onOpen: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => setVisible(Date.now() < Date.parse('2026-10-26T00:00:00-03:00')), []);
  if (!visible) return null;
  return (
    <section className="debate-entry" aria-labelledby="debate-entry-title">
      <span className="debate-entry-icon">
        <MessagesSquare size={26} aria-hidden="true" />
      </span>
      <div>
        <span className="or-overline">ESPECIAL / DEBATE NA GLOBO</span>
        <h2 id="debate-entry-title">O encontro. As propostas. O contexto.</h2>
        <p>23 de outubro · 21h20 (Brasília). Prepare seu olhar e acompanhe as fontes.</p>
      </div>
      <button className="button primary" onClick={onOpen}>
        Explorar o debate <ArrowRight size={17} />
      </button>
    </section>
  );
}
