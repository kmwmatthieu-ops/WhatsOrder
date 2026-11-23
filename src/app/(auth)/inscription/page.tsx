import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser, getMyShop } from "@/lib/supabase/server";
import { InscriptionView } from "./inscription-view";

export const metadata: Metadata = {
  title: "Inscription — Bon Waz à Dealer",
  description: "Créez votre compte commerçant pour vendre sur WhatsApp ou votre compte client pour explorer.",
};

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const user = await getUser();
  if (user) {
    const shop = await getMyShop();
    if (shop) redirect("/boutiques");
    redirect("/explorer");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const initialType = resolvedParams.type === "client" ? "client" : "merchant";

  return <InscriptionView initialType={initialType} />;
}
