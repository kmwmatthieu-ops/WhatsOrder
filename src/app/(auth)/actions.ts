"use server";

import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/constants";
import { authErrorMessage } from "@/lib/errors";
import { toFieldErrors, type ActionState } from "@/lib/action-state";
import { forgotSchema, newPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation/auth";

const NOT_CONFIGURED_MSG =
  "Configuration Supabase requise : Le fichier .env.local n'est pas encore configuré avec vos clés Supabase. Consultez le guide ci-dessous pour l'activer.";

export async function checkAuthenticated(): Promise<{ authenticated: boolean }> {
  try {
    const user = await getUser();
    return { authenticated: Boolean(user) };
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
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error) };

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirmer?next=/boutiques` },
  });
  if (error) return { error: authErrorMessage(error) };

  // Confirmation e-mail désactivée → session immédiate.
  if (data.session) {
    return { ok: true, message: "REDIRECT_ONBOARDING" };
  }

  // Supabase ne signale pas un e-mail déjà inscrit (anti-énumération) : identities vide.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "Un compte existe déjà avec cet e-mail. Connectez-vous." };
  }

  return {
    ok: true,
    message: `Presque fini ! Nous avons envoyé un lien de confirmation à ${parsed.data.email}. Ouvrez-le pour créer votre boutique (pensez à vérifier les spams).`,
  };
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/confirmer?next=/nouveau-mot-de-passe`,
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
