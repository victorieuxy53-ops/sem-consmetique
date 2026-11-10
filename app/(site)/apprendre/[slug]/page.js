import { boot, load } from '@/lib/server';
import { Learn } from '@/components/views/learn';

export const metadata = { title: 'Formation', robots: { index: false } };
export default async function Page({ params, searchParams }) {
  const [{ user }, { slug }, { l }] = await Promise.all([boot(), params, searchParams]);
  const d = user ? await load(`/api/courses/${encodeURIComponent(slug)}`) : null;
  return <Learn key={`${user?.id}-${d?.access}`} d={d} start={l} />;
}
