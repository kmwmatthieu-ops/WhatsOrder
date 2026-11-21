"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { signIn } from "../actions";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function SignInForm({ linkError }: { linkError?: string }) {
  const [state, action] = useActionState(signIn, initialActionState);

  useEffect(() => {
    if (state.ok) {
      window.location.replace("/boutiques");
    }
  }, [state.ok]);

  if (state.ok) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
        <div className="size-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
        <p className="text-sm font-bold text-ink">Connexion réussie…</p>
        <p className="text-xs text-muted">Ouverture de vos boutiques en cours.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {linkError && !state.error && <Alert tone="error">{linkError}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Input
        label="E-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        required
        error={state.fieldErrors?.email}
      />
      <PasswordInput
        label="Mot de passe"
        name="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <Link
        href="/mot-de-passe-oublie"
        className="-mt-1 self-end py-1 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
      >
        Mot de passe oublié ?
      </Link>
      <SubmitButton block pendingText="Connexion…">
        Se connecter
      </SubmitButton>
    </form>
  );
}
