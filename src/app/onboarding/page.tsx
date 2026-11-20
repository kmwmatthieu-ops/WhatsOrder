import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Store } from "lucide-react";
import { getMyShop, getMyShops, getUser } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";
import { shopUrl } from "@/lib/constants";
import OnboardingWizard from "./onboarding-wizard";

export const metadata: Metadata = { title: "Votre boutique — Bon Waz à Dealer" };

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/connexion");
  const shop = await getMyShop();
  const shops = await getMyShops();

  if (shop || shops.length > 0) {
    const currentShop = shop || shops[0];
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-6">
        <Logo className="mb-6" />
        <div className="rounded-3xl border border-line bg-white p-6 shadow-sm text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Store className="size-7" />
          </div>
          <h1 className="mt-4 text-xl font-black text-ink">{currentShop.name}</h1>
          <p className="mt-1 text-xs text-muted">Votre boutique est déjà créée et opérationnelle.</p>

          <a
            href="/tableau-de-bord"
            className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition-all"
          >
            <span>Accéder à mon tableau de bord</span>
            <ArrowRight className="size-4" />
          </a>

          <a
            href={shopUrl(currentShop.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center text-xs font-semibold text-muted hover:text-brand-600"
          >
            Voir la vitrine en ligne ({currentShop.slug})
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
      <Logo className="mb-8" />
      <OnboardingWizard existingShop={null} />
    </main>
  );
}
