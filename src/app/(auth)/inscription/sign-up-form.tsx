"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { MailCheck, RefreshCw, CheckCircle2, ArrowLeft, KeyRound } from "lucide-react";
import {
  signUp,
  checkAuthenticated,
  checkSignupVerification,
  resendVerificationEmail,
  verifyEmailOtp,
} from "@/app/(auth)/actions";
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
  const [verifyNotice, setVerifyNotice] = useState<{ tone: "error" | "success"; text: string } | null>(
    null
  );
  const [resending, setResending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Décompte pour le renvoi de code
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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
    }, 3000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [state.ok, credentials, redirecting]);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
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

  async function handleVerifyOtpCode(codeOverride?: string) {
    const code = (codeOverride ?? otpCode).trim();
    if (!credentials || !code || code.length < 6 || verifyingOtp || redirecting) return;

    setVerifyingOtp(true);
    setVerifyNotice(null);

    try {
      const res = await verifyEmailOtp(credentials.email, code, credentials.password);
      if (res.ok) {
        setRedirecting(true);
        window.location.replace(res.nextUrl || "/onboarding");
        return;
      }
      setVerifyNotice({
        tone: "error",
        text: res.error || "Code invalide. Vérifiez les 6 chiffres saisis.",
      });
    } catch {
      setVerifyNotice({
        tone: "error",
        text: "Impossible de vérifier le code pour le moment. Réessayez.",
      });
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function handleResend() {
    if (!credentials || resending || cooldown > 0) return;
    setResending(true);
    setVerifyNotice(null);
    try {
      const res = await resendVerificationEmail(credentials.email);
      if (res.ok && res.message) {
        setVerifyNotice({ tone: "success", text: res.message });
        setCooldown(60);
      } else if (res.error) {
        setVerifyNotice({ tone: "error", text: res.error });
      }
    } finally {
      setResending(false);
    }
  }

  function handleBackToForm() {
    setState(initialActionState);
    setVerifyNotice(null);
    setOtpCode("");
  }

  if (redirecting) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
        <div className="size-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <p className="text-sm font-bold text-ink">E-mail confirmé !</p>
        <p className="text-xs text-muted">Ouverture de la création de votre boutique…</p>
      </div>
    );
  }

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-3xl border border-line bg-white p-6 sm:p-7 text-center shadow-xs">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <KeyRound className="size-7" aria-hidden />
        </span>
        
        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-ink">Code de vérification</h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            Un code à 6 chiffres a été envoyé à{" "}
            <strong className="text-ink font-semibold">{credentials?.email}</strong>.
            <br />
            Consultez votre boîte de réception (ou spams) et saisissez-le ci-dessous.
          </p>
        </div>

        {verifyNotice && (
          <div className="w-full text-left">
            <Alert tone={verifyNotice.tone}>{verifyNotice.text}</Alert>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyOtpCode();
          }}
          className="w-full flex flex-col gap-4 pt-1"
          noValidate
        >
          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="otp-input" className="text-xs font-bold text-ink">
              Saisissez le code à 6 chiffres
            </label>
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpCode}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                setOtpCode(val);
                if (val.length === 6) {
                  handleVerifyOtpCode(val);
                }
              }}
              placeholder="123456"
              className="w-full rounded-2xl border-2 border-line bg-sand/30 py-3.5 text-center font-mono text-2xl sm:text-3xl font-black tracking-[0.4em] text-ink focus:border-brand-600 focus:bg-white focus:outline-none transition-all placeholder:text-muted/30 placeholder:tracking-[0.2em]"
              autoFocus
              disabled={verifyingOtp || redirecting}
            />
          </div>

          <Button
            type="submit"
            block
            loading={verifyingOtp}
            disabled={otpCode.length < 6 || verifyingOtp}
          >
            <CheckCircle2 className="size-4" aria-hidden />
            <span>Vérifier le code & Continuer</span>
          </Button>
        </form>

        <div className="flex w-full flex-col items-center gap-3 border-t border-line/60 pt-4 text-xs">
          <button
            type="button"
            disabled={resending || cooldown > 0}
            onClick={handleResend}
            className="inline-flex items-center justify-center gap-1.5 font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`size-3.5 ${resending ? "animate-spin" : ""}`} aria-hidden />
            <span>
              {cooldown > 0
                ? `Renvoyer un nouveau code (${cooldown}s)`
                : resending
                ? "Envoi en cours…"
                : "Renvoyer un nouveau code"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleBackToForm}
            className="inline-flex items-center justify-center gap-1 text-muted hover:text-ink font-medium transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Modifier l&apos;adresse e-mail</span>
          </button>
        </div>

        <p className="text-[11px] text-muted/70 leading-normal">
          Vous pouvez aussi cliquer directement sur le lien présent dans l&apos;e-mail reçu.
        </p>
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
