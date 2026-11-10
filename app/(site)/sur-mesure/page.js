import { Custom } from '@/components/views/shop';

export const metadata = { title: 'Commande sur-mesure' };
export default async function Page({ searchParams }) {
  const { type } = await searchParams;
  return <Custom key={type || "none"} type={type} />;
}
