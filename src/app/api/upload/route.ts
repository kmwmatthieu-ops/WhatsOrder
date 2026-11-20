import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient, getMyShop } from "@/lib/supabase/server";
import { MAX_INPUT_BYTES, toWebp } from "@/lib/images/process-server";
import { mediaPathFromUrl } from "@/lib/storage";
import { MEDIA_BUCKET } from "@/lib/constants";

export const runtime = "nodejs";

/**
 * Upload d'une image (logo, bannière ou photo produit).
 * 1. Vérifie la session et la boutique du commerçant.
 * 2. Convertit en WebP avec sharp (max 1200 px produits, 512 px logo, 1200x400 bannière).
 * 3. Envoie dans Storage avec la session de l'utilisateur.
 * Pour logo et bannière : met à jour shops.*_url et supprime l'ancien fichier.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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
  if (kind !== "product" && kind !== "logo" && kind !== "banner") {
    return json({ error: "Type d'image inconnu." }, 400);
  }
  if (!(file instanceof Blob) || file.size === 0) return json({ error: "Aucune image reçue." }, 400);
  if (file.size > MAX_INPUT_BYTES) return json({ error: "Image trop lourde (8 Mo maximum)." }, 413);

  let webp: Buffer;
  try {
    if (kind === "banner") {
      webp = await toWebp(Buffer.from(await file.arrayBuffer()), 1200, 400, "cover");
    } else if (kind === "logo") {
      webp = await toWebp(Buffer.from(await file.arrayBuffer()), 512, 512, "inside");
    } else {
      webp = await toWebp(Buffer.from(await file.arrayBuffer()), 1200, 1200, "inside");
    }
  } catch {
    return json({ error: "Image illisible. Essayez une photo JPG ou PNG." }, 415);
  }

  const supabase = await createClient();
  const folder = kind === "logo" ? "logo" : kind === "banner" ? "banner" : "products";
  const path = `${shop.id}/${folder}/${randomUUID()}.webp`;
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
  } else if (kind === "banner") {
    const { error } = await supabase.from("shops").update({ banner_url: url }).eq("id", shop.id);
    if (error) {
      await supabase.storage.from(MEDIA_BUCKET).remove([path]);
      return json({ error: "Mise à jour de la bannière impossible." }, 500);
    }
    const oldPath = shop.banner_url ? mediaPathFromUrl(shop.banner_url) : null;
    if (oldPath) await supabase.storage.from(MEDIA_BUCKET).remove([oldPath]);
  }

  return json({ url }, 200);
}

function json(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, { status });
}
