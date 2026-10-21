import { notFound } from 'next/navigation';
import { HistoryPreviewPage } from '../../history-preview';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Prévia do histórico de avisos',
  robots: { index: false, follow: false },
};
export default function Page() {
  if (process.env.VERCEL_ENV !== 'preview') notFound();
  return <HistoryPreviewPage />;
}
