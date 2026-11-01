import { redirect } from "next/navigation";
export default async function Reviews({ searchParams }: { searchParams: Promise<{ record?: string }> }) {
  const { record } = await searchParams;
  redirect(record ? `/emissions?record=${encodeURIComponent(record)}&review=1` : "/emissions?all=1");
}
