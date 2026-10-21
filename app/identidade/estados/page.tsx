import { notFound } from 'next/navigation';
import { RecoveryPreview } from '../../recovery-preview';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Prévia dos estados do app',
  robots: { index: false, follow: false },
};
export default function Page() {
  if (process.env.VERCEL_ENV !== 'preview') notFound();
  return <RecoveryPreview />;
}
