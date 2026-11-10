import { load } from '@/lib/server';
import { Post } from '@/components/views/site';

const get = async (params) => load(`/api/posts/${encodeURIComponent((await params).slug)}`);

export async function generateMetadata({ params }) {
  const { post } = await get(params);
  return { title: post.title, description: post.excerpt };
}
export default async function Page({ params }) {
  return <Post {...await get(params)} />;
}
