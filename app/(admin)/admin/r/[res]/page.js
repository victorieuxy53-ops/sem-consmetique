import { ListView } from '@/components/admin/resources';

export default async function Page({ params, searchParams }) {
  const [{ res }, query] = await Promise.all([params, searchParams]);
  return <ListView key={[res, query.status, query.course_id].join('|')} res={res} query={query} />;
}
