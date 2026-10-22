import Dashboard from './dashboard';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  return <Dashboard observatory initialTab={typeof tab === 'string' ? tab : undefined} />;
}
