"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "@/app/(auth)/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";

export function NewPasswordForm({ initialHasUser }: { initialHasUser: boolean }) {
  const [hasSession, setHasSession] = useState<boolean>(initialHasUser);
  const [checking, setChecking] = useState<boolean>(!initialHasUser);
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, setPending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Validation par Code OTP (sécurité de secours sans dépendre du clic sur lien e-mail)
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpPending, setOtpPending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    if (initialHasUser) {
      setChecking(false);
      return;
    }

    async function checkClientSession() {
      try {
        const supabase = createClient();

        // 1. Vérifier si des tokens sont présents dans le fragment de l'URL (#access_token=...&refresh_token=...)
        if (typeof window !== "undefined" && window.location.hash) {
          const hash = window.location.hash.replace(/^#/, "");
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!sessionError) {
              setHasSession(true);
              setChecking(false);
              return;
            }
          }
        }

        // 2. Vérifier si token_hash est présent dans les searchParams (?token_hash=...&type=recovery)
        if (typeof window !== "undefined" && window.location.search) {
          const searchParams = new URLSearchParams(window.location.search);
          const tokenHash = searchParams.get("token_hash");
          const type = (searchParams.get("type") as "recovery") || "recovery";

          if (tokenHash) {
            const { error: otpError } = await supabase.auth.verifyOtp({
              type,
              token_hash: tokenHash,
            });
            if (!otpError) {
              setHasSession(true);
              setChecking(false);
              return;
            }
          }
        }

        // 3. Vérifier la session active stockée
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
        } else {
          setHasSession(false);
        }
      } catch (err) {
        console.error("Erreur vérification session client:", err);
        setHasSession(false);
      } finally {
        setChecking(false);
      }
    }

    checkClientSession();
  }, [initialHasUser]);

  async function handleVerifyOtp(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (otpPending) return;
    const cleanMail = otpEmail.trim().toLowerCase();
    const cleanToken = otpCode.trim();

    if (!cleanMail || !cleanToken) {
      setOtpError("Veuillez renseigner votre e-mail et le code de sécurité reçu.");
      return;
    }

    setOtpPending(true);
    setOtpError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: cleanMail,
        token: cleanToken,
        type: "recovery",
      });

      if (error) {
        setOtpError("Code incorrect ou expiré. Vérifiez le code à 6 chiffres reçu par e-mail.");
      } else {
        setHasSession(true);
      }
    } catch {
      setOtpError("Connexion impossible. Vérifiez votre réseau puis réessayez.");
    } finally {
      setOtpPending(false);
    }
  }

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || redirecting) return;

    setPending(true);
    setState(initialActionState);

    const formData = new FormData(e.currentTarget);
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("confirm") || "");

    if (password.length < 8) {
      setState({ error: "Le mot de passe doit comporter au moins 8 caractères." });
      setPending(false);
      return;
    }
    if (password !== confirm) {
      setState({ error: "Les deux mots de passe ne correspondent pas." });
      setPending(false);
      return;
    }

    try {
      // 1. Mise à jour via le client Supabase (utilise la session active)
      const supabase = createClient();
      const { error: clientUpdateErr } = await supabase.auth.updateUser({ password });

      if (clientUpdateErr) {
        // Fallback via action serveur
        const res = await updatePassword(initialActionState, formData);
        if (res.ok) {
          setRedirecting(true);
          window.location.replace("/boutiques");
          return;
        }
        setState(res);
        setPending(false);
        return;
      }

      setRedirecting(true);
      window.location.replace("/boutiques");
    } catch {
      setState({ error: "Connexion impossible. Vérifiez votre réseau puis réessayez." });
      setPending(false);
    }
  }

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
        <Spinner className="size-6 text-brand-600" />
        <p className="text-xs text-muted">Vérification de votre lien de sécurité…</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="rounded-3xl border border-line bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div className="text-center space-y-1">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 mb-2">
            <KeyRound className="size-6" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-ink">Validation de sécurité</h2>
          <p className="text-xs sm:text-sm text-muted max-w-sm mx-auto">
            Saisissez votre e-mail et le <strong>code de sécurité (OTP)</strong> reçu dans votre boîte mail pour choisir votre nouveau mot de passe :
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3.5" noValidate>
          {otpError && <Alert tone="error">{otpError}</Alert>}
          <Input
            label="Votre adresse e-mail"
            type="email"
            placeholder="nom@exemple.com"
            value={otpEmail}
            onChange={(e) => setOtpEmail(e.target.value)}
            required
            autoCapitalize="none"
          />
          <Input
            label="Code de sécurité à 6 ou 8 chiffres"
            type="text"
            inputMode="numeric"
            placeholder="Ex: 123456"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            required
          />
          <Button type="submit" block loading={otpPending}>
            {otpPending ? "Vérification du code…" : "Valider mon code et continuer →"}
          </Button>
        </form>

        <div className="pt-3 border-t border-line text-center">
          <Link
            href="/mot-de-passe-oublie"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink font-semibold transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Demander un nouvel e-mail</span>
          </Link>
        </div>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
        <div className="size-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
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
