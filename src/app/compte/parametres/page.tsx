import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, ArrowLeft } from "lucide-react";
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
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-dvh bg-sand/30 text-ink flex flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Link
            href="/explorer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
          >
            <Compass className="size-3.5" />
            <span>Retour à Explorer</span>
          </Link>
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

        <ClientSettingsForm email={user.email ?? ""} profile={profile as CustomerProfile | null} />
      </main>
    </div>
  );
}
