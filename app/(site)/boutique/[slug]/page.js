import { load } from '@/lib/server';
import { Product } from '@/components/views/shop';

const get = async (params) => load(`/api/products/${encodeURIComponent((await params).slug)}`);

export async function generateMetadata({ params }) {
  const { product: p } = await get(params);
  return { title: p.name, description: p.short, openGraph: p.image ? { images: [p.image] } : undefined };
}
export default async function Page({ params }) {
  return <Product {...await get(params)} />;
}
