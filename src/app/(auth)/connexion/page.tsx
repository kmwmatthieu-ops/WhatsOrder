import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, getMyShop } from "@/lib/supabase/server";
import { SignInForm } from "./sign-in-form";
import { SupabaseNotice } from "@/components/ui/supabase-notice";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const user = await getUser();
  if (user) {
    const shop = await getMyShop();
    if (shop) redirect("/boutiques");
    redirect("/explorer");
  }

  const { erreur } = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Bon retour 👋</h1>
        <p className="mt-1 text-muted">Connectez-vous pour gérer votre boutique.</p>
      </div>
      <SupabaseNotice />
      <SignInForm
        linkError={
          erreur === "lien"
            ? "Ce lien a expiré ou a déjà été utilisé. Connectez-vous ou demandez un nouveau lien."
            : undefined
        }
      />
      <p className="text-center text-sm text-muted">
        Pas encore de boutique ?{" "}
        <Link href="/inscription" prefetch={false} className="font-semibold text-brand-700 underline-offset-4 hover:underline">
          Créer ma boutique
        </Link>
      </p>
    </div>
  );
}
