import { notFound } from 'next/navigation';
import Dashboard from '../dashboard';

export const dynamic = 'force-dynamic';

// A review surface for the branch deployment, never a public production route.
export default function IdentityPage() {
  if (process.env.VERCEL_ENV !== 'preview') notFound();
  return <Dashboard reviewOnly />;
}
