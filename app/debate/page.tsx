import type { Metadata } from 'next';
import Dashboard from '../dashboard';
import { sharingMetadata } from '@/lib/site-metadata';

const title = 'Debate na Globo: acompanhe com contexto';
const description =
  '23 de outubro, às 21h20 (Brasília). Compare propostas de Lula e Flávio Bolsonaro, consulte fontes, acompanhe a cobertura e escolha seu lembrete.';
export const metadata: Metadata = {
  title,
  description,
  ...sharingMetadata(title, description, '/debate'),
};
export default function DebatePage() {
  return <Dashboard observatory initialTab="debate" />;
}
