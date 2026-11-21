"use client";

import { useState } from "react";
import { updatePassword } from "../actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function NewPasswordForm() {
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, setPending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || redirecting) return;

    setPending(true);
    setState(initialActionState);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await updatePassword(initialActionState, formData);
      if (res.ok) {
        setRedirecting(true);
        window.location.replace("/boutiques");
        return;
      }
      setState(res);
      setPending(false);
    } catch {
      setState({ error: "Connexion impossible. Vérifiez votre réseau puis réessayez." });
      setPending(false);
    }
  }

  if (redirecting) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
        <div className="size-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
        <p className="text-sm font-bold text-ink">Mot de passe mis à jour…</p>
        <p className="text-xs text-muted">Ouverture de vos boutiques en cours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <PasswordInput
        label="Nouveau mot de passe"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        error={state.fieldErrors?.password}
      />
      <PasswordInput
        label="Confirmer le mot de passe"
        name="confirm"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <Button type="submit" block loading={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
