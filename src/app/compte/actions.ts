"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient, getUser } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/errors";
import { siteUrl, PRODUCTION_SITE_URL } from "@/lib/constants";
import { z } from "zod";

export interface ClientActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const clientSignUpSchema = z.object({
  fullName: z.string().trim().min(2, "Au moins 2 caractères.").max(80, "80 caractères maximum."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(8, "Au moins 8 caractères."),
  activityConsent: z.boolean().default(false),
  terms: z.literal(true, {
    message: "Vous devez accepter les conditions d'utilisation.",
  }),
});

const clientSignInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

async function resolvePublicOrigin(): Promise<string> {
  try {
    const h = await headers();
    const origin = h.get("origin");
    if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return origin.replace(/\/$/, "");
    }
  } catch {
    /* ignore */
  }
  const fallback = siteUrl();
  return fallback.includes("localhost") && process.env.NODE_ENV === "production"
    ? PRODUCTION_SITE_URL
    : fallback;
}

/** Inscription d'un compte client */
export async function clientSignUp(
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const raw = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    activityConsent: formData.get("activityConsent") === "on",
    terms: formData.get("terms") === "on",
  };

  const parsed = clientSignUpSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const origin = await resolvePublicOrigin();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
      emailRedirectTo: `${origin}/auth/confirmer?next=/explorer`,
    },
  });

  if (authError) {
    return { error: authErrorMessage(authError) };
  }

  if (authData.user) {
    // Création du profil client dans customer_profiles
    const { error: profileError } = await supabase.from("customer_profiles").upsert({
      id: authData.user.id,
      full_name: parsed.data.fullName,
      activity_consent: parsed.data.activityConsent,
      personalization_enabled: true,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Erreur création profil client:", profileError);
    }
  }

  // Si l'e-mail est déjà confirmé ou la confirmation est désactivée
  if (authData.session && authData.user?.email_confirmed_at) {
    return { ok: true, message: "REDIRECT_EXPLORER" };
  }

  return {
    ok: true,
    message: `Compte créé avec succès ! Si un e-mail de confirmation est requis, veuillez consulter ${parsed.data.email}.`,
  };
}

/** Connexion d'un client */
export async function clientSignIn(
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = clientSignInSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const cleanEmail = parsed.data.email.trim().toLowerCase();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: parsed.data.password,
  });

  if (error) {
    return { error: authErrorMessage(error) };
  }

  // Si l'e-mail n'a pas encore été confirmé
  if (data.user && !data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    return {
      error:
        "Votre adresse e-mail n'a pas encore été vérifiée. Cliquez d'abord sur le lien de confirmation reçu dans votre boîte mail.",
    };
  }

  // S'assurer que le profil client (customer_profiles) existe pour ce compte
  if (data.user) {
    try {
      await supabase.from("customer_profiles").upsert(
        {
          id: data.user.id,
          full_name:
            data.user.user_metadata?.full_name ||
            data.user.email?.split("@")[0] ||
            "Client",
          personalization_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (e) {
      console.warn("Could not upsert customer profile on clientSignIn:", e);
    }
  }

  return { ok: true, message: "REDIRECT_EXPLORER" };
}

/** Déconnexion */
export async function clientSignOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

/** Mise à jour du profil client */
export async function updateClientProfile(
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const user = await getUser();
  if (!user) return { error: "Non connecté." };

  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const residenceArea = String(formData.get("residenceArea") || "").trim();
  const personalizationEnabled = formData.get("personalizationEnabled") === "on";

  if (!fullName || fullName.length < 2) {
    return { error: "Le nom doit comporter au moins 2 caractères." };
  }

  const supabase = await createClient();
  const updatePayload: Record<string, unknown> = {
    id: user.id,
    full_name: fullName,
    phone: phone || null,
    personalization_enabled: personalizationEnabled,
    updated_at: new Date().toISOString(),
  };

  if (residenceArea) {
    updatePayload.residence_area = residenceArea;
  }

  const { error } = await supabase.from("customer_profiles").upsert(updatePayload as any);

  if (error) {
    // Tolérance si la colonne residence_area n'a pas encore été migrée dans la base
    if (error.message?.includes("residence_area") || error.code === "42703") {
      delete updatePayload.residence_area;
      const { error: fallbackError } = await supabase
        .from("customer_profiles")
        .upsert(updatePayload as any);
      if (fallbackError) {
        return { error: "Impossible d'enregistrer les modifications." };
      }
    } else {
      return { error: "Impossible d'enregistrer les modifications." };
    }
  }

  revalidatePath("/compte/parametres");
  return { ok: true, message: "Vos informations ont été enregistrées avec succès." };
}

/** Effacer l'historique d'activité du client (Section 6 Vie privée - Phase V3-D) */
export async function clearClientActivity(): Promise<ClientActionState> {
  const user = await getUser();
  if (!user) return { error: "Non connecté." };

  const supabase = await createClient();
  await supabase.rpc("clear_my_customer_activity");

  revalidatePath("/compte/parametres");
  revalidatePath("/explorer");
  return { ok: true, message: "Votre historique d'activité a été intégralement effacé." };
}

/** Activer ou désactiver la personnalisation et le traçage d'activité (Phase V3-D) */
export async function togglePersonalizationConsentAction(consented: boolean): Promise<ClientActionState> {
  const user = await getUser();
  if (!user) return { error: "Non connecté." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_personalization_consent", {
    p_consented: consented,
  });

  if (error) {
    return { error: "Impossible de mettre à jour votre consentement." };
  }

  revalidatePath("/compte/parametres");
  revalidatePath("/explorer");
  return {
    ok: true,
    message: consented
      ? "Personnalisation activée. Votre fil Explorer s'adaptera à vos préférences."
      : "Personnalisation désactivée. Votre historique d'activité a été effacé.",
  };
}

/** Enregistrer discrètement une interaction (vue, clic, recherche) pour la personnalisation (Phase V3-D) */
export async function trackCustomerActivityAction(
  type: "view" | "click" | "search" | "order",
  productId?: string | null,
  shopId?: string | null,
  categoryId?: string | null,
  searchQuery?: string | null
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("record_customer_activity", {
      p_activity_type: type,
      p_product_id: productId ?? null,
      p_shop_id: shopId ?? null,
      p_category_id: categoryId ?? null,
      p_search_query: searchQuery ?? null,
    });
  } catch {
    // Non bloquant : l'échec d'un log d'activité ne doit jamais perturber la navigation de l'utilisateur
  }
}

/** Suppression du compte client (Point 3.A) */
export async function deleteClientAccount(
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const user = await getUser();
  if (!user || !user.email) return { error: "Non connecté." };

  const password = String(formData.get("password") || "");
  if (!password) {
    return { error: "Veuillez saisir votre mot de passe pour confirmer la suppression." };
  }

  const supabase = await createClient();

  // 1. Vérifier le mot de passe
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (authErr) {
    return { error: "Mot de passe incorrect. Suppression refusée." };
  }

  // 2. Appel de la RPC sécurisée delete_user_account()
  const { error: rpcErr } = await supabase.rpc("delete_user_account");
  if (rpcErr) {
    return { error: "Impossible de supprimer votre compte : " + rpcErr.message };
  }

  await supabase.auth.signOut();
  return { ok: true, message: "REDIRECT_HOME" };
}
