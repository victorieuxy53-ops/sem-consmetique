import { Track } from '@/components/views/shop';

export const metadata = { title: 'Suivre ma demande' };
export default async function Page({ searchParams }) {
  const ref = (await searchParams).ref || '';
  return <Track key={ref} ref0={ref} />;
}
