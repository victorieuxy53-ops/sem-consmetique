import { boot, load } from '@/lib/server';
import { Account } from '@/components/views/learn';

export const metadata = { title: 'Mon espace', robots: { index: false } };
export default async function Page({ searchParams }) {
  const [{ user }, { tab }] = await Promise.all([boot(), searchParams]);
  return <Account key={`${user?.id || 0}-${tab || ""}`} d={user ? await load('/api/me/dashboard') : null} tab={tab} />;
}
