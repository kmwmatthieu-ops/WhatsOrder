"use client";

import Link from "next/link";
import { useEffect, useState, type SyntheticEvent } from "react";
import { signIn, checkAuthenticated } from "@/app/(auth)/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function SignInForm({ linkError }: { linkError?: string }) {
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

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || redirecting) return;

    setPending(true);
    setState(initialActionState);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await signIn(initialActionState, formData);
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
        <div className="size-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <p className="text-sm font-bold text-ink">Connexion réussie…</p>
        <p className="text-xs text-muted">Ouverture de vos boutiques en cours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
      <Button type="submit" block loading={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
