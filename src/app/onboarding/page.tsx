import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyShop, getUser } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";
import OnboardingWizard from "./onboarding-wizard";

export const metadata: Metadata = { title: "Créer ma boutique" };

/**
 * Assistant en 3 étapes : (1) nom + lien, (2) WhatsApp → création de la boutique,
 * (3) logo facultatif. Si la boutique existe déjà sans logo, on reprend à l'étape 3.
 */
export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/connexion");
  const shop = await getMyShop();
  // Si le commerçant a déjà une boutique, on ne le force jamais à refaire l'onboarding :
  // on l'oriente directement vers le panneau de sélection de ses boutiques.
  if (shop) redirect("/boutiques");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
      <Logo className="mb-8" />
      <OnboardingWizard existingShop={null} />
    </main>
  );
}
