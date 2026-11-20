"use client";

/**
 * Redimensionnement côté téléphone AVANT l'envoi (connexion lente) :
 * l'image est réduite à `maxSize` px de côté puis réencodée (WebP si le
 * navigateur sait le faire, sinon JPEG). La conversion WebP définitive est
 * faite côté serveur avec sharp (Safari iOS n'encode pas le WebP en canvas).
 */
export async function resizeImageForUpload(file: File, maxSize = 1200, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Ce fichier n'est pas une image.");
  }

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    // imageOrientation "from-image" respecte l'orientation EXIF des photos de téléphone.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = await loadImageElement(file); // anciens navigateurs / formats HEIC non décodables
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Traitement de l'image impossible sur cet appareil.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  if ("close" in bitmap) bitmap.close();

  const blob =
    (await toBlob(canvas, "image/webp", quality)) ?? (await toBlob(canvas, "image/jpeg", quality));
  if (!blob) throw new Error("Traitement de l'image impossible sur cet appareil.");
  return blob;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b && b.type === type ? b : null), type, quality),
  );
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Format d'image non pris en charge. Utilisez une photo JPG ou PNG."));
    };
    img.src = url;
  });
}

export type UploadKind = "product" | "logo";

/** Redimensionne puis envoie l'image à /api/upload. Retourne l'URL publique WebP. */
export async function uploadImage(file: File, kind: UploadKind): Promise<string> {
  const blob = await resizeImageForUpload(file, kind === "logo" ? 512 : 1200);
  const body = new FormData();
  body.append("file", blob, "image");
  body.append("kind", kind);

  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body });
  } catch {
    throw new Error("Envoi impossible. Vérifiez votre connexion puis réessayez.");
  }
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? "Envoi de l'image impossible.");
  return json.url;
}
