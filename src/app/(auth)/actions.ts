"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, getUser, getMyShops } from "@/lib/supabase/server";
import { isSupabaseConfigured, PRODUCTION_SITE_URL, siteUrl } from "@/lib/constants";
import { authErrorMessage } from "@/lib/errors";
import { toFieldErrors, type ActionState } from "@/lib/action-state";
import { forgotSchema, newPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation/auth";

const NOT_CONFIGURED_MSG =
  "Configuration Supabase requise : Le fichier .env.local n'est pas encore configuré avec vos clés Supabase. Consultez le guide ci-dessous pour l'activer.";

/**
 * Détermine dynamiquement l'URL publique courante à partir des en-têtes de requête
 * pour que les liens de vérification e-mail ne pointent jamais vers localhost en production.
 */
async function resolvePublicOrigin(): Promise<string> {
  try {
    const h = await headers();
    const origin = h.get("origin");
    if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return origin.replace(/\/$/, "");
    }
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || "https";
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  } catch {
    /* ignore */
  }
  const fallback = siteUrl();
  return fallback.includes("localhost") && process.env.NODE_ENV === "production"
    ? PRODUCTION_SITE_URL
    : fallback;
}

export async function checkAuthenticated(): Promise<{ authenticated: boolean }> {
  try {
    const user = await getUser();
    return { authenticated: Boolean(user && user.email_confirmed_at) };
  } catch {
    return { authenticated: false };
  }
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED_MSG };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error) };

  // Garde stricte : interdire la connexion si l'adresse e-mail n'a pas été confirmée.
  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return {
      error:
        "Votre adresse e-mail n'a pas encore été vérifiée. Cliquez d'abord sur le lien de confirmation envoyé dans votre boîte mail.",
    };
  }

  return { ok: true };
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED_MSG };
  }

  const publicOrigin = await resolvePublicOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${publicOrigin}/auth/confirmer?next=/onboarding` },
  });
  if (error) return { error: authErrorMessage(error) };

  // Supabase ne signale pas un e-mail déjà inscrit (anti-énumération) : identities vide.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "Un compte existe déjà avec cet e-mail. Connectez-vous." };
  }

  // Si une session non confirmée a été ouverte, on la referme en attendant la confirmation e-mail.
  if (data.session && !data.user?.email_confirmed_at) {
    await supabase.auth.signOut();
  }

  if (data.session && data.user?.email_confirmed_at) {
    return { ok: true, message: "REDIRECT_ONBOARDING" };
  }

  return {
    ok: true,
    message: `Nous avons envoyé un lien de confirmation à ${parsed.data.email}. Cliquez sur ce lien dans votre boîte mail (vérifiez aussi les spams) : cette page détectera automatiquement la validation et ouvrira la création de votre boutique.`,
  };
}

/**
 * Vérifie en temps réel si l'utilisateur qui vient de s'inscrire a cliqué sur le lien
 * de confirmation e-mail. Dès que email_confirmed_at est renseigné dans Supabase,
 * ouvre la session et indique la destination (/onboarding pour un nouveau compte).
 */
export async function checkSignupVerification(
  email: string,
  password: string
): Promise<{ verified: boolean; nextUrl?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return { verified: false };
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return { verified: false };
    }

    const shops = await getMyShops();
    return {
      verified: true,
      nextUrl: shops.length > 0 ? "/boutiques" : "/onboarding",
    };
  } catch {
    return { verified: false };
  }
}

/**
 * Renvoie l'e-mail de confirmation d'inscription avec l'URL publique exacte.
 */
export async function resendVerificationEmail(
  email: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const publicOrigin = await resolvePublicOrigin();
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${publicOrigin}/auth/confirmer?next=/onboarding` },
    });
    if (error) return { ok: false, error: authErrorMessage(error) };
    return {
      ok: true,
      message: "Un nouveau lien de confirmation vient d'être envoyé dans votre boîte mail.",
    };
  } catch {
    return { ok: false, error: "Impossible de renvoyer l'e-mail pour le moment." };
  }
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const publicOrigin = await resolvePublicOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicOrigin}/auth/confirmer?next=/nouveau-mot-de-passe`,
  });
  // On n'indique jamais si l'e-mail existe (sécurité) — sauf limite d'envoi.
  if (error && error.code?.startsWith("over_")) return { error: authErrorMessage(error) };

  return {
    ok: true,
    message: "Si un compte existe avec cet e-mail, vous allez recevoir un lien pour choisir un nouveau mot de passe.",
  };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorMessage(error) };

  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
