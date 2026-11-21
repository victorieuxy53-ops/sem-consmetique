import { redirect } from 'next/navigation';
import { boot, load } from '@/lib/server';
import { Account } from '@/components/views/learn';

export const metadata = { title: 'Mon espace', robots: { index: false } };
export default async function Page({ searchParams }) {
  const [{ user }, { tab }] = await Promise.all([boot(), searchParams]);
  if (user?.role === 'admin') redirect('/admin'); // l'administratrice va droit à son espace de gestion
  return <Account key={`${user?.id || 0}-${tab || ""}`} d={user ? await load('/api/me/dashboard') : null} tab={tab} />;
}
