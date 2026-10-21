import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowUp, BookOpen, ShieldCheck, Copyright } from 'lucide-react';

const documents = [
  { key: 'termos', label: 'Termos de Uso', icon: BookOpen },
  { key: 'privacidade', label: 'Privacidade', icon: ShieldCheck },
  { key: 'creditos', label: 'Créditos e licenças', icon: Copyright },
] as const;

export function DocumentFrame({
  active,
  sections,
  children,
}: {
  active: (typeof documents)[number]['key'];
  sections: { id: string; label: string }[];
  children: ReactNode;
}) {
  const home = process.env.VERCEL_ENV === 'preview' ? '/identidade' : '/';
  const index = (
    <ol>
      {sections.map((section, i) => (
        <li key={section.id}>
          <a href={`#${section.id}`}>
            <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            {section.label}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <div className="document-observatory control-room" id="document-top">
      <a className="document-skip" href="#document-content">
        Ir ao documento
      </a>
      <header className="document-header">
        <Link href={home} className="document-brand" aria-label="Observatório do Voto — início">
          <img src="/app-icon.svg" width="36" height="36" alt="" />
          <span>
            observatório<small>DO VOTO</small>
          </span>
        </Link>
        <Link href={home} className="button secondary" aria-label="Voltar ao painel">
          <ArrowLeft size={16} />
          <span>Voltar ao painel</span>
        </Link>
      </header>
      <div className="document-intro">
        <span className="eyebrow">TRANSPARÊNCIA / OBSERVATÓRIO DO VOTO</span>
        <p>Conheça as condições de uso, suas escolhas e as fontes do projeto.</p>
        {process.env.VERCEL_ENV === 'preview' && (
          <p className="document-preview-note">
            Prévia para revisão · o site em produção permanece inalterado.
          </p>
        )}
      </div>
      <nav className="document-tabs" aria-label="Documentos do Observatório">
        {documents.map(({ key, label, icon: Icon }) => (
          <Link key={key} href={`/${key}`} aria-current={active === key ? 'page' : undefined}>
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="document-grid">
        <aside className="document-index">
          <nav className="document-index-desktop" aria-label="Índice do documento">
            <h2>Neste documento</h2>
            {index}
          </nav>
          <details className="document-index-mobile">
            <summary>
              Ir direto a um assunto <span>{sections.length} tópicos</span>
            </summary>
            <nav aria-label="Índice do documento">{index}</nav>
          </details>
        </aside>
        {children}
      </div>
      <footer className="document-footer">
        <p>Observatório do Voto · Projeto independente</p>
        <a href="#document-top" className="button secondary">
          <ArrowUp size={16} />
          Voltar ao início
        </a>
      </footer>
    </div>
  );
}
