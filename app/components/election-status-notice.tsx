import type { Result } from '@/lib/elections';
import { electionStatusNotice } from '@/lib/election-status-notice';
import { postElectionContext, postElectionServices } from '@/lib/post-election';
import { FileText } from 'lucide-react';

export function ElectionStatusNotice({ result }: { result?: Result }) {
  const context = postElectionContext(result);
  if (context)
    return (
      <aside className="post-election-card" aria-label="Contexto após o resultado oficial">
        <div className="post-election-icon">
          <FileText size={21} aria-hidden="true" />
        </div>
        <div className="post-election-content">
          <div className="post-election-meta">
            <span>{context.label}</span>
            <time dateTime={context.reviewedAt}>
              Checado em{' '}
              {new Date(context.reviewedAt).toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · Brasília
            </time>
          </div>
          <h2>{context.title}</h2>
          <p>{context.summary}</p>
          <details>
            <summary>O que está confirmado e fontes</summary>
            <div>
              {context.confirmed.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <div className="post-election-sources">
                {context.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                    {source.label} ↗
                  </a>
                ))}
                <a href="/?tab=social">Acompanhar cobertura ↗</a>
              </div>
            </div>
          </details>
          <details id="servicos-pos-eleicao">
            <summary>Serviços ao eleitor e próximas etapas</summary>
            <ul className="post-election-services">
              {postElectionServices.map((service) => (
                <li key={service.id}>
                  <strong>{service.title}</strong>
                  <p>{service.date}</p>
                  <p>{service.text}</p>
                  <a href={service.source} target="_blank" rel="noreferrer">
                    {service.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </aside>
    );
  const notice = electionStatusNotice(result);
  if (!notice) return null;
  return (
    <aside className="notice election-status-notice" aria-label="Contexto da parcial oficial">
      <strong>{notice.title}</strong>
      <p>{notice.text}</p>
      <a className="button secondary" href={notice.source} target="_blank" rel="noreferrer">
        Ler na Agência Brasil
      </a>
    </aside>
  );
}
