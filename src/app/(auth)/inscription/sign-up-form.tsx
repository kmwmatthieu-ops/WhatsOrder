"use client";

import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { signUp, checkAuthenticated } from "../actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function SignUpForm() {
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, setPending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let active = true;
    checkAuthenticated()
      .then((res) => {
        if (active && res.authenticated) {
          setRedirecting(true);
          window.location.replace("/boutiques");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || redirecting) return;

    setPending(true);
    setState(initialActionState);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await signUp(initialActionState, formData);
      if (res.ok && res.message === "REDIRECT_ONBOARDING") {
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
        <p className="text-sm font-bold text-ink">Compte prêt…</p>
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
      <PasswordInput
        label="Mot de passe"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="Au moins 8 caractères."
        error={state.fieldErrors?.password}
      />
      <Button type="submit" block loading={pending}>
        {pending ? "Création du compte…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
