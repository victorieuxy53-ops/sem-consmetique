import { load } from '@/lib/server';
import { Diagnostic } from '@/components/views/site';

export const metadata = { title: 'Diagnostic de peau' };
export default async function Page() {
  const [products, services] = await Promise.all([load('/api/products'), load('/api/services')]);
  return <Diagnostic products={products} services={services} />;
}
