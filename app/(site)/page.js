import { load } from '@/lib/server';
import { Home } from '@/components/views/site';

export default async function Page() {
  return <Home d={await load('/api/home')} />;
}
