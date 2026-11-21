import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "./sign-up-form";
import { SupabaseNotice } from "@/components/ui/supabase-notice";

export const metadata: Metadata = { title: "Créer ma boutique" };

export default function InscriptionPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Créez votre boutique</h1>
        <p className="mt-1 text-muted">Gratuit, en 2 minutes, depuis votre téléphone.</p>
      </div>
      <SupabaseNotice />
      <SignUpForm />
      <p className="text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/connexion" prefetch={false} className="font-semibold text-brand-700 underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
