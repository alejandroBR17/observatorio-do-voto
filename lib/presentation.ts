export const formatVotes = (n: number) => n.toLocaleString('pt-BR');
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
