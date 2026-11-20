import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyShop, getMyShops, getUser } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";
import OnboardingWizard from "./onboarding-wizard";

export const metadata: Metadata = { title: "Créer ma boutique" };

/**
 * Assistant de création de boutique pour les NOUVEAUX utilisateurs uniquement.
 * Si le commerçant possède déjà une boutique, redirection immédiate vers /boutiques.
 */
export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/connexion");
  const shop = await getMyShop();
  const shops = await getMyShops();
  if (shop || shops.length > 0) redirect("/boutiques");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
      <Logo className="mb-8" />
      <OnboardingWizard existingShop={null} />
    </main>
  );
}
