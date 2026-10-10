import { states } from './elections';
export type NotebookEntry = {
  id: string;
  title: string;
  body: string;
  topic: string;
  uf: string;
  updated: string | null;
};
export const noteTopics = ['Observações', 'Pesquisas', 'Apuração', 'Histórico'];
export function readWatch(value: unknown): { states: string[]; entries: NotebookEntry[] } {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const followed = Array.isArray(v.states)
    ? [
        ...new Set(
          v.states.filter(
            (x: unknown): x is string => typeof x === 'string' && states.some((s) => s[1] === x),
          ),
        ),
      ]
    : [];
  const entries: NotebookEntry[] = Array.isArray(v.entries)
    ? v.entries
        .filter(
          (n: unknown): n is Record<string, unknown> & { id: string; body: string } =>
            !!n &&
            typeof n === 'object' &&
            !Array.isArray(n) &&
            typeof (n as Record<string, unknown>).id === 'string' &&
            typeof (n as Record<string, unknown>).body === 'string',
        )
        .slice(0, 100)
        .map((n) => ({
          id: n.id.slice(0, 100),
          title: typeof n.title === 'string' ? n.title.slice(0, 80) : '',
          body: n.body.slice(0, 10000),
          topic:
            typeof n.topic === 'string' && noteTopics.includes(n.topic) ? n.topic : 'Observações',
          uf: typeof n.uf === 'string' && states.some((s) => s[1] === n.uf) ? n.uf : 'BR',
          updated:
            typeof n.updated === 'string' && !Number.isNaN(Date.parse(n.updated))
              ? n.updated
              : null,
        }))
    : typeof v.note === 'string' && v.note.trim()
      ? [
          {
            id: 'legacy-note',
            title: 'Minha anotação anterior',
            body: v.note.slice(0, 10000),
            topic: 'Observações',
            uf: 'BR',
            updated: null,
          },
        ]
      : [];
  return { states: followed, entries };
}
