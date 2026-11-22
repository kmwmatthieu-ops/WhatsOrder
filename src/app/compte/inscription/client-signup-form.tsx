"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { clientSignUp, type ClientActionState } from "../actions";
import { Button } from "@/components/ui/button";

export function ClientSignUpForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ClientActionState, FormData>(
    clientSignUp,
    {}
  );

  useEffect(() => {
    if (state.message === "REDIRECT_EXPLORER") {
      window.location.href = "/explorer";
    }
  }, [state.message]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
          {state.error}
        </div>
      )}

      {state.ok && state.message !== "REDIRECT_EXPLORER" && (
        <div className="rounded-2xl border border-success-200 bg-success-50 p-3 text-xs text-success-800 flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-success-600" />
          <span>{state.message}</span>
        </div>
      )}

      {/* Nom complet */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-ink">Nom complet</label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <input
            type="text"
            name="fullName"
            required
            placeholder="Ex. Aïcha Koné"
            className="w-full h-11 rounded-2xl border border-line bg-white pl-10 pr-3 text-xs text-ink placeholder:text-muted focus:border-brand-600 focus:outline-none"
          />
        </div>
        {state.fieldErrors?.fullName && (
          <p className="text-[11px] text-danger-600">{state.fieldErrors.fullName[0]}</p>
        )}
      </div>

      {/* Adresse e-mail */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-ink">Adresse e-mail</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <input
            type="email"
            name="email"
            required
            placeholder="votre.email@exemple.com"
            className="w-full h-11 rounded-2xl border border-line bg-white pl-10 pr-3 text-xs text-ink placeholder:text-muted focus:border-brand-600 focus:outline-none"
          />
        </div>
        {state.fieldErrors?.email && (
          <p className="text-[11px] text-danger-600">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      {/* Mot de passe */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-ink">Mot de passe</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="8 caractères minimum"
            className="w-full h-11 rounded-2xl border border-line bg-white pl-10 pr-3 text-xs text-ink placeholder:text-muted focus:border-brand-600 focus:outline-none"
          />
        </div>
        {state.fieldErrors?.password && (
          <p className="text-[11px] text-danger-600">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      {/* Case consentement activité (Section 6) */}
      <label className="flex items-start gap-2.5 rounded-2xl border border-line p-3 text-[11px] text-muted hover:bg-sand/40 cursor-pointer transition-colors">
        <input
          type="checkbox"
          name="activityConsent"
          defaultChecked
          className="size-4 shrink-0 mt-0.5 accent-brand-600 rounded"
        />
        <span>
          J&apos;accepte que mon activité de navigation sur Explorer (vues, clics) soit enregistrée pour personnaliser mon fil d&apos;actualités. 
          <span className="text-ink font-medium"> Vous pouvez désactiver cette option ou effacer votre historique à tout moment.</span>
        </span>
      </label>

      {/* Case CGU */}
      <label className="flex items-start gap-2.5 rounded-2xl border border-line p-3 text-[11px] text-muted hover:bg-sand/40 cursor-pointer transition-colors">
        <input
          type="checkbox"
          name="terms"
          required
          className="size-4 shrink-0 mt-0.5 accent-brand-600 rounded"
        />
        <span>
          J&apos;accepte les{" "}
          <Link href="/cgu" target="_blank" className="font-semibold text-brand-700 underline">
            Conditions Générales d&apos;Utilisation
          </Link>{" "}
          et la{" "}
          <Link href="/confidentialite" target="_blank" className="font-semibold text-brand-700 underline">
            Politique de Confidentialité
          </Link>.
        </span>
      </label>
      {state.fieldErrors?.terms && (
        <p className="text-[11px] text-danger-600">{state.fieldErrors.terms[0]}</p>
      )}

      <Button type="submit" size="md" loading={isPending} className="mt-2 w-full">
        <span>Créer mon compte client</span>
        <ArrowRight className="size-4 ml-1" />
      </Button>

      <p className="text-center text-xs text-muted mt-2">
        Déjà un compte ?{" "}
        <Link href="/compte/connexion" className="font-bold text-brand-700 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
