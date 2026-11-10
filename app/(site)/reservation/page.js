import { load } from '@/lib/server';
import { Booking } from '@/components/views/booking';

export const metadata = { title: 'Prendre rendez-vous' };
export default async function Page({ searchParams }) {
  const [services, { service }] = await Promise.all([load('/api/services'), searchParams]);
  return <Booking key={service || "none"} services={services} pre={service} />;
}
