import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

/** Atteinte via le lien de réinitialisation (la session est ouverte par /auth/confirmer). */
export default async function NouveauMotDePassePage() {
  const user = await getUser();
  if (!user) redirect("/connexion?erreur=lien");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Nouveau mot de passe</h1>
        <p className="mt-1 text-muted">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>
      </div>
      <NewPasswordForm />
    </div>
  );
}
