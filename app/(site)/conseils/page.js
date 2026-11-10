import { load } from '@/lib/server';
import { Blog } from '@/components/views/site';

export const metadata = { title: 'Conseils beauté' };
export default async function Page() {
  return <Blog posts={await load('/api/posts')} />;
}
