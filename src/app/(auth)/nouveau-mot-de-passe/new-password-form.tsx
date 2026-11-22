"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "@/app/(auth)/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, ArrowLeft } from "lucide-react";

export function NewPasswordForm({ initialHasUser }: { initialHasUser: boolean }) {
  const [hasSession, setHasSession] = useState<boolean>(initialHasUser);
  const [checking, setChecking] = useState<boolean>(!initialHasUser);
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, setPending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

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
      <div className="rounded-3xl border border-line bg-white p-6 sm:p-7 shadow-xs space-y-4 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-danger-50 text-danger-600">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-ink">Lien de réinitialisation invalide ou expiré</h2>
          <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
            Ce lien de réinitialisation a déjà été utilisé ou a expiré. Pour des raisons de sécurité, les liens sont à usage unique.
          </p>
        </div>
        <Link
          href="/mot-de-passe-oublie"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Demander un nouveau lien</span>
        </Link>
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
