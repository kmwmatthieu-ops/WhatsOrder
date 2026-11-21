import { MEDIA_BUCKET, getSupabaseCredentials } from "@/lib/constants";

/** Préfixe des URLs publiques des fichiers d'une boutique. */
export function shopMediaPrefix(shopId: string) {
  const { url } = getSupabaseCredentials();
  return `${url}/storage/v1/object/public/${MEDIA_BUCKET}/${shopId}/`;
}

/** Vrai si l'URL pointe vers le dossier Storage de cette boutique (anti-injection d'URL). */
export function isOwnMediaUrl(url: string, shopId: string) {
  return url.startsWith(shopMediaPrefix(shopId)) && !url.includes("..");
}

/** URL publique → chemin dans le bucket ("{shopId}/products/x.webp"). */
export function mediaPathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}
