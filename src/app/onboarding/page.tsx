import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyShop, getUser } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";
import OnboardingWizard from "./onboarding-wizard";

export const metadata: Metadata = { title: "Créer ma boutique" };

/**
 * Page de création de boutique en 3 étapes :
 * Ne fait PAS de redirect("/boutiques") côté serveur afin de ne jamais interrompre
 * l'étape 3 (design / photo de profil) juste après la création en base à l'étape 2.
 * La redirection d'un utilisateur qui possédait déjà une boutique avant d'entrer
 * dans le parcours est gérée par OnboardingWizard au montage initial.
 */
export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/connexion");

  const shop = await getMyShop();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
      <Logo className="mb-8" />
      <OnboardingWizard
        existingShop={
          shop
            ? {
                id: shop.id,
                name: shop.name,
                logo_url: shop.logo_url,
                primary_color: shop.primary_color,
              }
            : null
        }
      />
    </main>
  );
}
