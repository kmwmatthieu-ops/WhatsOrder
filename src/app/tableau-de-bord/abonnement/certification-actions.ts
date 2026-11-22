"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireShop, getUser } from "@/lib/supabase/server";
import { getShopSubscription } from "@/lib/subscription";

export type CertificationActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
};

const CERTIFICATION_BUCKET = "certification-docs";

export type SubmitCertificationUrlsParams = {
  businessUrl: string;
  identityUrl: string;
  photoUrl: string;
  videoUrl: string;
};

/**
 * Enregistre un dossier de certification à partir des URLs déjà téléversées directement dans Supabase Storage.
 * Contourne toute limite de taille de payload Vercel / Next.js.
 */
export async function submitCertificationUrlsAction(
  params: SubmitCertificationUrlsParams
): Promise<CertificationActionResult> {
  try {
    const { shop, supabase } = await requireShop();
    const user = await getUser();

    if (!user) {
      return { ok: false, error: "Vous devez être connecté." };
    }

    // 1. Vérification stricte du forfait Premium actif
    const subscription = await getShopSubscription(shop.id);
    if (subscription.effectivePlan.id !== "premium" || subscription.isExpired) {
      return {
        ok: false,
        error: "La certification officielle est exclusivement réservée aux boutiques abonnées à la formule Premium.",
      };
    }

    if (!params.businessUrl || !params.identityUrl || !params.photoUrl || !params.videoUrl) {
      return { ok: false, error: "Les 4 pièces justificatives sont strictement obligatoires." };
    }

    // 2. Enregistrement de la demande dans shop_certifications
    const { error: insertError } = await supabase.from("shop_certifications").insert({
      shop_id: shop.id,
      business_doc_url: params.businessUrl,
      identity_doc_url: params.identityUrl,
      store_photo_url: params.photoUrl,
      store_video_url: params.videoUrl,
      status: "pending",
    });

    if (insertError) {
      console.error("Erreur insertion shop_certifications:", insertError);
      return { ok: false, error: "Impossible d'enregistrer la demande de certification. Réessayez." };
    }

    revalidatePath("/tableau-de-bord/abonnement");
    revalidatePath("/tableau-de-bord/parametres");
    revalidatePath("/admin");

    return {
      ok: true,
      message: "Votre dossier de certification a été transmis à l'équipe. Il sera examiné sous 24 à 48h.",
    };
  } catch (err: unknown) {
    console.error("Erreur submitCertificationUrlsAction:", err);
    const msg = err instanceof Error ? err.message : "Une erreur inattendue est survenue.";
    return { ok: false, error: msg };
  }
}

/**
 * Soumet un dossier de certification officiel pour une boutique Premium via FormData (fallback serveur).
 */
export async function submitCertificationRequest(
  formData: FormData
): Promise<CertificationActionResult> {
  try {
    const { shop, supabase } = await requireShop();
    const user = await getUser();

    if (!user) {
      return { ok: false, error: "Vous devez être connecté." };
    }

    // 1. Vérification stricte du forfait Premium actif
    const subscription = await getShopSubscription(shop.id);
    if (subscription.effectivePlan.id !== "premium" || subscription.isExpired) {
      return {
        ok: false,
        error: "La certification officielle est exclusivement réservée aux boutiques abonnées à la formule Premium.",
      };
    }

    // 2. Récupération des 4 fichiers
    const businessDoc = formData.get("business_doc") as File | null;
    const identityDoc = formData.get("identity_doc") as File | null;
    const storePhoto = formData.get("store_photo") as File | null;
    const storeVideo = formData.get("store_video") as File | null;

    if (!businessDoc || businessDoc.size === 0) {
      return { ok: false, error: "Le document du commerce (registre, patente, etc.) est obligatoire (PDF ou Image)." };
    }
    if (!identityDoc || identityDoc.size === 0) {
      return { ok: false, error: "La pièce d'identité du gérant (CNI, passeport, permis) est obligatoire." };
    }
    if (!storePhoto || storePhoto.size === 0) {
      return { ok: false, error: "La photo de vous dans votre boutique est obligatoire." };
    }
    if (!storeVideo || storeVideo.size === 0) {
      return { ok: false, error: "Une courte vidéo de vous dans votre boutique attestant du lieu est obligatoire." };
    }

    // 3. Limites de taille
    if (businessDoc.size > 25 * 1024 * 1024) {
      return { ok: false, error: "Le document du commerce ne doit pas dépasser 25 Mo." };
    }
    if (identityDoc.size > 20 * 1024 * 1024) {
      return { ok: false, error: "La pièce d'identité ne doit pas dépasser 20 Mo." };
    }
    if (storePhoto.size > 20 * 1024 * 1024) {
      return { ok: false, error: "La photo de la boutique ne doit pas dépasser 20 Mo." };
    }
    if (storeVideo.size > 50 * 1024 * 1024) {
      return { ok: false, error: "La vidéo ne doit pas dépasser 50 Mo." };
    }

    // 4. Upload sécurisé dans le bucket de certification
    async function uploadFile(file: File, folder: string): Promise<string> {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const filename = `${shop.id}/${folder}/${randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error } = await supabase.storage
        .from(CERTIFICATION_BUCKET)
        .upload(filename, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (error) {
        console.error(`Erreur upload ${folder}:`, error);
        throw new Error(`Échec du téléversement (${folder}): ${error.message}`);
      }

      return supabase.storage.from(CERTIFICATION_BUCKET).getPublicUrl(filename).data.publicUrl;
    }

    const [businessUrl, identityUrl, photoUrl, videoUrl] = await Promise.all([
      uploadFile(businessDoc, "business_docs"),
      uploadFile(identityDoc, "identity_docs"),
      uploadFile(storePhoto, "store_photos"),
      uploadFile(storeVideo, "store_videos"),
    ]);

    // 5. Enregistrement de la demande dans shop_certifications
    const { error: insertError } = await supabase.from("shop_certifications").insert({
      shop_id: shop.id,
      business_doc_url: businessUrl,
      identity_doc_url: identityUrl,
      store_photo_url: photoUrl,
      store_video_url: videoUrl,
      status: "pending",
    });

    if (insertError) {
      console.error("Erreur insertion shop_certifications:", insertError);
      return { ok: false, error: "Impossible d'enregistrer la demande de certification. Réessayez." };
    }

    revalidatePath("/tableau-de-bord/abonnement");
    revalidatePath("/tableau-de-bord/parametres");
    revalidatePath("/admin");

    return {
      ok: true,
      message: "Votre dossier de certification a été transmis à l'équipe. Il sera examiné sous 24 à 48h.",
    };
  } catch (err: unknown) {
    console.error("Erreur submitCertificationRequest:", err);
    const msg = err instanceof Error ? err.message : "Une erreur inattendue est survenue.";
    return { ok: false, error: msg };
  }
}
