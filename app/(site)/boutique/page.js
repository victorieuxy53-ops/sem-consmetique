import { load } from '@/lib/server';
import { Shop } from '@/components/views/shop';

export const metadata = { title: 'Boutique' };
export default async function Page({ searchParams }) {
  const [products, { cat }] = await Promise.all([load('/api/products'), searchParams]);
  return <Shop key={cat || "all"} products={products} cat={cat} />;
}
