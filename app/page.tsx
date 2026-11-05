import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BriefApp } from "@/components/brief/brief-app";
import { Orb } from "@/components/ui/orb";
import { keySchema } from "@/lib/brief";
import { getBrief } from "@/lib/server/brief-repository";
import type { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams,
    key = keySchema.safeParse(params.market);
  if (!key.success) return { title: "Review the briefs · Aim" };
  const brief = await getBrief(key.data),
    index =
      typeof params.item === "string" && /^\d+$/.test(params.item)
        ? Number(params.item)
        : -1;
  return { title: `${brief.items[index]?.headline || brief.label} · Aim` };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (!keySchema.safeParse(params.market).success) redirect("/sitemap");
  return (
    <Suspense
      fallback={
        <main className="load-screen" role="status">
          <Orb />
          Loading your brief…
        </main>
      }
    >
      <BriefApp />
    </Suspense>
  );
}
