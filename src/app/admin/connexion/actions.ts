"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminLoginState = {
  error?: string;
};

/**
 * Authentifie un administrateur avec vérification stricte du rôle dans public.admins.
 */
export async function loginAdmin(
  _prev: AdminLoginState | null,
  formData: FormData
): Promise<AdminLoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Veuillez renseigner votre email et mot de passe administrateur." };
  }

  const supabase = await createClient();

  // Déconnexion préventive d'une éventuelle session précédente non-admin
  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      error: "Identifiants administrateur incorrects. Vérifiez votre adresse email et votre mot de passe.",
    };
  }

  // Vérifier formellement que l'utilisateur appartient à la table des administrateurs
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    await supabase.auth.signOut();
    return {
      error: "Accès refusé : ce compte ne dispose pas des privilèges administrateur de la plateforme.",
    };
  }

  redirect("/admin");
}

/**
 * Déconnecte la session admin actuelle.
 */
export async function adminSignOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/connexion");
}
