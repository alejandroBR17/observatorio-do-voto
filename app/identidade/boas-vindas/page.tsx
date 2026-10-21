import { notFound } from 'next/navigation';
import { WelcomePreview } from '../../welcome-preview';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Prévia de boas-vindas', robots: { index: false, follow: false } };
export default function Page() {
  if (process.env.VERCEL_ENV !== 'preview') notFound();
  return <WelcomePreview />;
}
