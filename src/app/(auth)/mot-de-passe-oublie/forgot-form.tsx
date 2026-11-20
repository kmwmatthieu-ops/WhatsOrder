"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, initialActionState);

  if (state.ok) return <Alert tone="success">{state.message}</Alert>;

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
      <SubmitButton block pendingText="Envoi…">
        Recevoir le lien
      </SubmitButton>
    </form>
  );
}
