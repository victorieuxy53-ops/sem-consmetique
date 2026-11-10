import { load } from '@/lib/server';
import { Events } from '@/components/views/booking';

export const metadata = { title: 'Ateliers & masterclass' };
export default async function Page() {
  return <Events list={await load('/api/events')} />;
}
