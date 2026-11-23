import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, ShoppingBag } from "lucide-react";
import { getUser, getMyShop } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";
import { ClientSignUpForm } from "./client-signup-form";

export const metadata: Metadata = {
  title: "Créer un compte client — Bon Waz à Dealer",
  description: "Inscrivez-vous pour suivre vos boutiques favorites et profiter d'un fil Explorer sur-mesure.",
};

export default async function ClientSignUpPage() {
  const user = await getUser();
  if (user) {
    const shop = await getMyShop();
    if (shop) redirect("/boutiques");
    redirect("/explorer");
  }

  return (
    <div className="min-h-dvh bg-sand/30 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="flex justify-center mb-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        <div className="rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <span className="inline-grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 mb-2">
              <ShoppingBag className="size-6" />
            </span>
            <h1 className="text-xl font-black text-ink">Espace Client Explorer</h1>
            <p className="text-xs text-muted mt-1">
              Créez votre compte pour enregistrer vos boutiques préférées et découvrir les nouveautés.
            </p>
          </div>

          <ClientSignUpForm />
        </div>

        <div className="text-center mt-6 flex flex-col items-center gap-2">
          <Link
            href="/inscription?type=merchant"
            className="text-xs font-semibold text-muted hover:text-ink"
          >
            Vous êtes commerçant ? <strong className="text-brand-700 underline">Créez votre boutique ici</strong>
          </Link>
          <Link
            href="/explorer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink hover:underline"
          >
            <Compass className="size-3.5" />
            <span>Continuer à explorer sans compte</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
