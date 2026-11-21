"use client";

import { useActionState, useEffect } from "react";
import { MailCheck } from "lucide-react";
import { signUp } from "../actions";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function SignUpForm() {
  const [state, action] = useActionState(signUp, initialActionState);

  useEffect(() => {
    if (state.ok && state.message === "REDIRECT_ONBOARDING") {
      window.location.replace("/boutiques");
    }
  }, [state.ok, state.message]);

  if (state.ok && state.message === "REDIRECT_ONBOARDING") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
        <div className="size-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
        <p className="text-sm font-bold text-ink">Compte créé…</p>
        <p className="text-xs text-muted">Préparation de votre espace commerçant.</p>
      </div>
    );
  }

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-white p-6 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <MailCheck className="size-7" aria-hidden />
        </span>
        <p className="text-[15px] leading-relaxed">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
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
        autoComplete="new-password"
        required
        minLength={8}
        hint="Au moins 8 caractères."
        error={state.fieldErrors?.password}
      />
      <SubmitButton block pendingText="Création du compte…">
        Créer mon compte
      </SubmitButton>
    </form>
  );
}
