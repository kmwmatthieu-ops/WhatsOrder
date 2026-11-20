import "server-only";

import sharp from "sharp";

/** Taille maximale acceptée en entrée (l'image est déjà réduite par le téléphone). */
export const MAX_INPUT_BYTES = 8 * 1024 * 1024;

/**
 * Normalise une image en WebP : orientation corrigée, métadonnées supprimées,
 * redimensionnée dans un carré `maxSize` sans agrandissement, qualité 80.
 */
export async function toWebp(input: Buffer, maxSize: number): Promise<Buffer> {
  return sharp(input, { failOn: "error", limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();
}
