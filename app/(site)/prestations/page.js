import { load } from '@/lib/server';
import { Services } from '@/components/views/site';

export const metadata = { title: 'Prestations & tarifs' };
export default async function Page({ searchParams }) {
  const [list, { cat }] = await Promise.all([load('/api/services'), searchParams]);
  return <Services key={cat || "all"} list={list} cat={cat} />;
}
