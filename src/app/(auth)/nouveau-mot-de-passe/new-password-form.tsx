"use client";

import { useActionState } from "react";
import { updatePassword } from "../actions";
import { initialActionState } from "@/lib/action-state";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, initialActionState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
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
      <SubmitButton block pendingText="Enregistrement…">
        Enregistrer
      </SubmitButton>
    </form>
  );
}
