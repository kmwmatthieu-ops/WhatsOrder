/**
 * Traduction des erreurs techniques (Supabase Auth / PostgreSQL / Storage)
 * en messages clairs en français.
 */

type MaybeError = { code?: string; message?: string; status?: number } | null | undefined;

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou mot de passe incorrect.",
  email_not_confirmed: "Votre e-mail n'est pas encore confirmé. Ouvrez le lien reçu par e-mail.",
  user_already_exists: "Un compte existe déjà avec cet e-mail. Connectez-vous.",
  email_exists: "Un compte existe déjà avec cet e-mail. Connectez-vous.",
  weak_password: "Mot de passe trop faible : au moins 8 caractères.",
  same_password: "Le nouveau mot de passe doit être différent de l'ancien.",
  over_email_send_rate_limit: "Trop d'e-mails envoyés. Patientez quelques minutes puis réessayez.",
  over_request_rate_limit: "Trop de tentatives. Patientez quelques minutes puis réessayez.",
  email_address_invalid: "Adresse e-mail invalide.",
  otp_expired: "Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.",
  session_not_found: "Votre session a expiré. Reconnectez-vous.",
};

export function authErrorMessage(error: MaybeError): string {
  if (!error) return "";
  if (error.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code];
  if (error.message?.toLowerCase().includes("fetch")) return NETWORK_MESSAGE;
  return "Une erreur est survenue. Réessayez dans un instant.";
}

export const NETWORK_MESSAGE = "Connexion impossible. Vérifiez votre réseau puis réessayez.";

export function dbErrorMessage(error: MaybeError, fallback = "Enregistrement impossible. Réessayez."): string {
  if (!error) return "";
  const msg = error.message ?? "";
  if (msg.includes("PRODUCT_LIMIT_REACHED"))
    return "Vous avez atteint la limite de 20 produits du plan gratuit.";
  if (msg.includes("FORBIDDEN_STATUS_CHANGE")) return "Vous ne pouvez pas modifier le statut de la boutique.";
  if (msg.includes("shops_one_fulfillment_mode"))
    return "Activez au moins un mode : livraison ou retrait.";
  if (error.code === "23505") {
    if (msg.includes("slug")) return "Ce lien de boutique est déjà pris.";
    if (msg.includes("owner_id")) return "Vous avez déjà une boutique.";
    if (msg.includes("categories_shop_name")) return "Cette catégorie existe déjà.";
    return "Cette valeur existe déjà.";
  }
  if (error.code === "23514") return "Une des valeurs saisies n'est pas valide.";
  if (error.code === "23503") return "Élément lié introuvable (il a peut-être été supprimé).";
  if (error.code === "42501") return "Action non autorisée.";
  if (msg.toLowerCase().includes("fetch")) return NETWORK_MESSAGE;
  return fallback;
}
