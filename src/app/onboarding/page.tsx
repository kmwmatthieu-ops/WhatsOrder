import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyShop, getMyShops, getUser } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";
import OnboardingWizard from "./onboarding-wizard";

export const metadata: Metadata = { title: "Créer ma boutique" };

/**
 * Création de boutique : réservée aux comptes SANS boutique.
 * Un compte qui possède déjà une boutique est renvoyé vers « Vos boutiques ».
 */
export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/connexion");
  const shops = await getMyShops();
  if (shops.length > 0) redirect("/boutiques");
  const shop = await getMyShop();
  if (shop) redirect("/boutiques");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
      <Logo className="mb-8" />
      <OnboardingWizard existingShop={null} />
    </main>
  );
}
