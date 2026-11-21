"use client";

import { useEffect, useState } from "react";
import { MailCheck, RefreshCw, CheckCircle2 } from "lucide-react";
import {
  signUp,
  checkAuthenticated,
  checkSignupVerification,
  resendVerificationEmail,
} from "../actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function SignUpForm() {
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, setPending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [checkingVerify, setCheckingVerify] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<{ tone: "error" | "success"; text: string } | null>(
    null
  );
  const [resending, setResending] = useState(false);

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

  // Détection automatique dès que l'utilisateur clique sur le lien de confirmation dans son e-mail
  useEffect(() => {
    if (!state.ok || !credentials || redirecting) return;

    let active = true;
    const timer = setInterval(async () => {
      if (!active) return;
      try {
        const res = await checkSignupVerification(credentials.email, credentials.password);
        if (active && res.verified) {
          clearInterval(timer);
          setRedirecting(true);
          window.location.replace(res.nextUrl || "/onboarding");
        }
      } catch {
        /* ignore */
      }
    }, 2500);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [state.ok, credentials, redirecting]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || redirecting) return;

    setPending(true);
    setState(initialActionState);
    setVerifyNotice(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const res = await signUp(initialActionState, formData);
      if (res.ok && res.message === "REDIRECT_ONBOARDING") {
        setRedirecting(true);
        window.location.replace("/onboarding");
        return;
      }
      if (res.ok) {
        setCredentials({ email, password });
      }
      setState(res);
      setPending(false);
    } catch {
      setState({ error: "Connexion impossible. Vérifiez votre réseau puis réessayez." });
      setPending(false);
    }
  }

  async function handleManualCheck() {
    if (!credentials || checkingVerify || redirecting) return;
    setCheckingVerify(true);
    setVerifyNotice(null);
    try {
      const res = await checkSignupVerification(credentials.email, credentials.password);
      if (res.verified) {
        setRedirecting(true);
        window.location.replace(res.nextUrl || "/onboarding");
        return;
      }
      setVerifyNotice({
        tone: "error",
        text: "Votre e-mail n'est pas encore confirmé. Ouvrez d'abord l'e-mail reçu et cliquez sur le lien de confirmation.",
      });
    } catch {
      setVerifyNotice({
        tone: "error",
        text: "Vérification impossible pour le moment. Réessayez dans quelques secondes.",
      });
    } finally {
      setCheckingVerify(false);
    }
  }

  async function handleResend() {
    if (!credentials || resending) return;
    setResending(true);
    setVerifyNotice(null);
    try {
      const res = await resendVerificationEmail(credentials.email);
      if (res.ok && res.message) {
        setVerifyNotice({ tone: "success", text: res.message });
      } else if (res.error) {
        setVerifyNotice({ tone: "error", text: res.error });
      }
    } finally {
      setResending(false);
    }
  }

  if (redirecting) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
        <div className="size-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
        <p className="text-sm font-bold text-ink">E-mail confirmé !</p>
        <p className="text-xs text-muted">Ouverture de la création de votre boutique…</p>
      </div>
    );
  }

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-white p-6 text-center shadow-xs">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <MailCheck className="size-7" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-base font-extrabold text-ink">Vérifiez votre boîte e-mail</h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">{state.message}</p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-sand/60 px-3.5 py-2 text-xs font-semibold text-brand-700">
          <div className="size-3.5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent shrink-0" />
          <span>En attente de la confirmation de votre e-mail…</span>
        </div>

        {verifyNotice && (
          <div className="w-full text-left">
            <Alert tone={verifyNotice.tone}>{verifyNotice.text}</Alert>
          </div>
        )}

        <div className="flex w-full flex-col gap-2 pt-1">
          <Button type="button" block loading={checkingVerify} onClick={handleManualCheck}>
            <CheckCircle2 className="size-4" aria-hidden />
            <span>J&apos;ai confirmé mon e-mail → Continuer</span>
          </Button>

          <button
            type="button"
            disabled={resending}
            onClick={handleResend}
            className="inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-muted hover:text-brand-700 disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${resending ? "animate-spin" : ""}`} aria-hidden />
            <span>{resending ? "Envoi en cours…" : "Renvoyer l'e-mail de confirmation"}</span>
          </button>
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
