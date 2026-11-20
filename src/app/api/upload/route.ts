import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient, getMyShop } from "@/lib/supabase/server";
import { MAX_INPUT_BYTES, toWebp } from "@/lib/images/process-server";
import { mediaPathFromUrl } from "@/lib/storage";
import { MEDIA_BUCKET } from "@/lib/constants";

export const runtime = "nodejs";

/**
 * Upload d'une image (logo ou photo produit).
 * 1. Vérifie la session et la boutique du commerçant.
 * 2. Convertit en WebP avec sharp (max 1200 px produits, 512 px logo).
 * 3. Envoie dans Storage avec la session de l'utilisateur → les politiques
 *    Storage garantissent qu'il n'écrit que dans le dossier de SA boutique.
 * Pour un logo : met aussi à jour shops.logo_url et supprime l'ancien fichier.
 */
export async function POST(request: NextRequest) {
  const shop = await getMyShop();
  if (!shop) return json({ error: "Session expirée. Reconnectez-vous." }, 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Envoi invalide." }, 400);
  }

  const kind = form.get("kind");
  const file = form.get("file");
  if (kind !== "product" && kind !== "logo") return json({ error: "Type d'image inconnu." }, 400);
  if (!(file instanceof Blob) || file.size === 0) return json({ error: "Aucune image reçue." }, 400);
  if (file.size > MAX_INPUT_BYTES) return json({ error: "Image trop lourde (8 Mo maximum)." }, 413);

  let webp: Buffer;
  try {
    webp = await toWebp(Buffer.from(await file.arrayBuffer()), kind === "logo" ? 512 : 1200);
  } catch {
    return json({ error: "Image illisible. Essayez une photo JPG ou PNG." }, 415);
  }

  const supabase = await createClient();
  const path = `${shop.id}/${kind === "logo" ? "logo" : "products"}/${randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (uploadError) return json({ error: "Enregistrement de l'image impossible. Réessayez." }, 500);

  const url = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;

  if (kind === "logo") {
    const { error } = await supabase.from("shops").update({ logo_url: url }).eq("id", shop.id);
    if (error) {
      await supabase.storage.from(MEDIA_BUCKET).remove([path]);
      return json({ error: "Mise à jour du logo impossible." }, 500);
    }
    const oldPath = shop.logo_url ? mediaPathFromUrl(shop.logo_url) : null;
    if (oldPath) await supabase.storage.from(MEDIA_BUCKET).remove([oldPath]);
  }

  return json({ url }, 200);
}

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status });
}
