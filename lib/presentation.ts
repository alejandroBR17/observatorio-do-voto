export const formatVotes = (n: number) => n.toLocaleString('pt-BR');
export const formatCompactPercent = (n: number) =>
  n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

export function formatDate(value: string | null | undefined) {
  if (!value) return 'Data não informada';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T12:00:00Z' : value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Não informado';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Não informado'
    : date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export const formatPercent = (n: number, d = 2) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';
export const candidateColor = (n: string) =>
  n === '13' ? '#c96856' : n === '22' || n === '17' ? '#24796d' : '#87999b';
export const candidateName = (n: string) =>
  n === 'FLAVIO BOLSONARO'
    ? 'Flávio Bolsonaro'
    : n === 'LULA'
      ? 'Lula'
      : n === 'JAIR BOLSONARO'
        ? 'Jair Bolsonaro'
        : n;
