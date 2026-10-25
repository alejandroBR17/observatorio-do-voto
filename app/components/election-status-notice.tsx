import type { Result } from '@/lib/elections';
import { electionStatusNotice } from '@/lib/election-status-notice';

export function ElectionStatusNotice({ result }: { result?: Result }) {
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
