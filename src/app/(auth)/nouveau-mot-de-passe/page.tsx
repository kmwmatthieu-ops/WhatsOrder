import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

/**
 * Page de réinitialisation du mot de passe.
 * Accepte à la fois la session SSR établie par /auth/confirmer ET
 * la session client hydratée via hash (#access_token=...) ou token_hash.
 */
export default async function NouveauMotDePassePage() {
  const user = await getUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Nouveau mot de passe</h1>
        <p className="mt-1 text-muted">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>
      </div>
      <NewPasswordForm initialHasUser={Boolean(user)} />
    </div>
  );
}
