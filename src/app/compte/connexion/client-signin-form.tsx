"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { clientSignIn, type ClientActionState } from "../actions";
import { Button } from "@/components/ui/button";

export function ClientSignInForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ClientActionState, FormData>(
    clientSignIn,
    {}
  );

  useEffect(() => {
    if (state.ok && state.message === "REDIRECT_EXPLORER") {
      router.push("/explorer");
    }
  }, [state.ok, state.message, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
          {state.error}
        </div>
      )}

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
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-ink">Mot de passe</label>
          <Link
            href="/mot-de-passe-oublie"
            className="text-[11px] font-medium text-brand-700 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <input
            type="password"
            name="password"
            required
            placeholder="••••••••"
            className="w-full h-11 rounded-2xl border border-line bg-white pl-10 pr-3 text-xs text-ink placeholder:text-muted focus:border-brand-600 focus:outline-none"
          />
        </div>
        {state.fieldErrors?.password && (
          <p className="text-[11px] text-danger-600">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <Button type="submit" size="md" loading={isPending} className="mt-2 w-full">
        <span>Se connecter</span>
        <ArrowRight className="size-4 ml-1" />
      </Button>

      <p className="text-center text-xs text-muted mt-2">
        Pas encore de compte ?{" "}
        <Link href="/compte/inscription" className="font-bold text-brand-700 hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
