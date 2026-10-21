import { notFound } from 'next/navigation';
import Dashboard from '../dashboard';

export const dynamic = 'force-dynamic';

// A review surface for the branch deployment, never a public production route.
export default async function IdentityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  if (process.env.VERCEL_ENV !== 'preview') notFound();
  const { tab } = await searchParams;
  return <Dashboard reviewOnly initialTab={typeof tab === 'string' ? tab : undefined} />;
}
