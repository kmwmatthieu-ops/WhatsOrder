"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/(auth)/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { KeyRound, ArrowRight } from "lucide-react";

export function ForgotForm() {
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    setPending(true);
    setState(initialActionState);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await requestPasswordReset(initialActionState, formData);
      setState(res);
    } catch {
      setState({ error: "Connexion impossible. Vérifiez votre réseau puis réessayez." });
    } finally {
      setPending(false);
    }
  }

  if (state.ok) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.message}</Alert>
        <div className="rounded-2xl border border-line bg-sand/60 p-4 text-xs text-muted space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-ink">
            <KeyRound className="size-4 text-brand-600 shrink-0" />
            <span>Vous avez reçu un code de sécurité (OTP) ?</span>
          </div>
          <p className="leading-relaxed">
            Vous pouvez cliquer sur le lien dans l&apos;e-mail, ou saisir directement votre code de sécurité sur la page de mot de passe :
          </p>
          <Link
            href="/nouveau-mot-de-passe"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition-colors"
          >
            <span>Saisir mon code de sécurité</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
      <Button type="submit" block loading={pending}>
        {pending ? "Envoi…" : "Recevoir le lien"}
      </Button>
    </form>
  );
}
