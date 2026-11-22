import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, ArrowLeft, Store, ArrowRight } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";
import { ClientSettingsForm } from "./client-settings-form";
import type { CustomerProfile } from "@/types/database";

export const metadata: Metadata = {
  title: "Mon Compte Client — Bon Waz à Dealer",
};

export default async function ClientSettingsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/compte/connexion");
  }

  const supabase = await createClient();
  let { data: profile } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Si le profil n'existe pas encore (compte créé initialement comme commerçant), on l'initialise
  if (!profile) {
    const { data: newProfile } = await supabase
      .from("customer_profiles")
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Client",
        personalization_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();
    profile = newProfile;
  }

  return (
    <div className="min-h-dvh bg-sand/30 text-ink flex flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/tableau-de-bord"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-700 transition-colors shadow-xs"
            >
              <Store className="size-3.5" />
              <span>Espace Commerçant</span>
            </Link>
            <Link
              href="/explorer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition-colors px-2 py-1.5 rounded-xl hover:bg-sand"
            >
              <Compass className="size-3.5 text-brand-600" />
              <span className="hidden sm:inline">Explorer</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6 flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/explorer"
              className="text-muted hover:text-ink transition-colors"
              title="Retourner à Explorer"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-ink">Mon Compte Client</h1>
          </div>
          <p className="text-xs text-muted">
            Gérez vos informations personnelles, vos préférences Explorer et la sécurité de votre compte.
          </p>
        </div>

        {/* Passerelle directe vers l'espace commerçant */}
        <div className="rounded-3xl border border-brand-200 bg-brand-50/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-brand-600 text-white shrink-0">
              <Store className="size-5" />
            </span>
            <div>
              <p className="text-xs sm:text-sm font-bold text-ink">Vous avez aussi une boutique ?</p>
              <p className="text-[11px] text-muted">Basculez sur votre tableau de bord commerçant en 1 clic.</p>
            </div>
          </div>
          <Link
            href="/tableau-de-bord"
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white border border-brand-300 px-4 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50 transition-colors shrink-0 shadow-2xs"
          >
            <span>Ouvrir mon tableau de bord</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <ClientSettingsForm email={user.email ?? ""} profile={profile as CustomerProfile | null} />
      </main>
    </div>
  );
}
