import type { Metadata } from 'next';
import Dashboard from '../dashboard';
import { sharingMetadata } from '@/lib/site-metadata';

const title = 'Debate da Globo: íntegra, checagens e propostas';
const description =
  'Reveja o debate de 23 de outubro entre Lula e Flávio Bolsonaro. Acesse a íntegra, as checagens do Fato ou Fake e de outros veículos e compare as propostas.';
export const metadata: Metadata = {
  title,
  description,
  ...sharingMetadata(title, description, '/debate'),
};
export default function DebatePage() {
  return <Dashboard observatory initialTab="debate" />;
}
