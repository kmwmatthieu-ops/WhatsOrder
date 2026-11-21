"use client";

import { useState } from "react";
import { requestPasswordReset } from "../actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function ForgotForm() {
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

  if (state.ok) return <Alert tone="success">{state.message}</Alert>;

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
