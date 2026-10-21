import portraits from '../public/assets/licenses/historical-portraits.json';
import additional from '../public/assets/licenses/current-portraits.json';

const normalize = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
export const historicalPortraits = portraits;
export const additionalPortraits = additional;
const current = [
  { name: 'Lula', photo: '/assets/lula.jpeg', aliases: ['LULA', 'LUIZ INACIO LULA DA SILVA'] },
  {
    name: 'Flávio Bolsonaro',
    photo: '/assets/flavio.jpeg',
    aliases: ['FLAVIO BOLSONARO', 'FLAVIO NANTES BOLSONARO'],
  },
];
export function candidateIdentity(name: string) {
  const value = normalize(name);
  return [...current, ...additional, ...portraits].find((person) =>
    person.aliases.some((alias) => normalize(alias) === value),
  );
}
