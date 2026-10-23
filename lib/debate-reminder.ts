import type { Database } from './database';
import { debate } from './debate';
import { queuePush } from './push';
import { initialDebateEditorial } from './debate-editorial';
import { syncDebateEditorial } from './debate-editorial-server';

/** One scheduled reminder, only for the separately selected debate category. */
export async function queueDebateReminder(db: Database, now = Date.now()) {
  if (now >= Date.parse(initialDebateEditorial.updatedAt)) {
    const editorial = await syncDebateEditorial(db, initialDebateEditorial, now);
    if (editorial.state !== 'planned') return;
  }
  const expiresAt = Date.parse(debate.reminderExpiresAt);
  if (now < Date.parse(debate.reminderAt) || now >= expiresAt) return;
  await queuePush(db, {
    id: `debate:${debate.id}:reminder`,
    types: ['debate'],
    urgent: true,
    expiresAt,
    title:
      now < Date.parse(debate.startsAt)
        ? 'O debate na Globo está chegando'
        : 'Horário previsto do debate na Globo',
    body: 'Lula e Flávio Bolsonaro: início previsto às 21h20 (Brasília). Abra o guia, compare propostas e acesse a transmissão oficial.',
    url: '/debate',
  });
}
