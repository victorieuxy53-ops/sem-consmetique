import { Agenda } from '@/components/admin/app';

export default async function Page({ searchParams }) {
  return <Agenda week={(await searchParams).week} />;
}
