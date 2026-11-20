import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function MotDePasseOubliePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Mot de passe oublié</h1>
        <p className="mt-1 text-muted">Saisissez votre e-mail, nous vous envoyons un lien pour en choisir un nouveau.</p>
      </div>
      <ForgotForm />
      <Link href="/connexion" className="text-center text-sm font-semibold text-brand-700 underline-offset-4 hover:underline">
        Retour à la connexion
      </Link>
    </div>
  );
}
