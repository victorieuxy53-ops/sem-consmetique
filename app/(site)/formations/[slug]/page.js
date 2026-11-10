import { load } from '@/lib/server';
import { Course } from '@/components/views/learn';

const get = async (params) => load(`/api/courses/${encodeURIComponent((await params).slug)}`);

export async function generateMetadata({ params }) {
  const { course: c } = await get(params);
  return { title: c.title, description: c.subtitle };
}
export default async function Page({ params, searchParams }) {
  const [d, { buy }] = await Promise.all([get(params), searchParams]);
  return <Course d={d} buyNow={!!buy} />;
}
