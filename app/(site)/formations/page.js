import { load } from '@/lib/server';
import { Courses } from '@/components/views/learn';

export const metadata = { title: 'Formations vidéo' };
export default async function Page() {
  return <Courses list={await load('/api/courses')} />;
}
