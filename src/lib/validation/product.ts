import { z } from "zod";
import { MAX_PRODUCT_IMAGES } from "@/lib/constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `${max} caractères maximum.` })
    .transform((v) => (v === "" ? null : v));

export const productVariantInputSchema = z.object({
  id: z.string().uuid().optional(),
  label: z
    .string()
    .trim()
    .min(1, { message: "Le nom de la variante est requis." })
    .max(120, { message: "120 caractères maximum." }),
  attributes: z
    .object({
      taille: z.string().trim().max(40).optional(),
      couleur: z.string().trim().max(40).optional(),
      modele: z.string().trim().max(40).optional(),
    })
    .optional()
    .default({}),
  price_override: z
    .union([
      z.null(),
      z.coerce
        .number({ message: "Prix de variante invalide." })
        .int({ message: "Prix entier uniquement (FCFA)." })
        .min(1, { message: "Le prix doit être supérieur à 0." })
        .max(100_000_000, { message: "Prix trop élevé." }),
    ])
    .optional()
    .default(null),
  stock: z
    .union([
      z.null(),
      z.coerce
        .number({ message: "Stock de variante invalide." })
        .int({ message: "Stock entier uniquement." })
        .min(0, { message: "Le stock ne peut pas être négatif." })
        .max(1_000_000),
    ])
    .optional()
    .default(null),
  is_available: z.boolean().optional().default(true),
});

export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Donnez un nom au produit." })
    .max(80, { message: "80 caractères maximum." }),
  price: z.coerce
    .number({ message: "Prix invalide." })
    .int({ message: "Prix entier uniquement (FCFA)." })
    .min(1, { message: "Le prix doit être supérieur à 0." })
    .max(100_000_000, { message: "Prix trop élevé." }),
  category_id: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().uuid().nullable()),
  description: optionalText(1000),
  options_text: optionalText(300).optional().nullable(),
  // null = stock illimité
  stock: z.union([
    z.null(),
    z.coerce
      .number()
      .int({ message: "Stock entier uniquement." })
      .min(0, { message: "Le stock ne peut pas être négatif." })
      .max(1_000_000),
  ]),
  is_available: z.boolean(),
  images: z
    .array(z.string().url())
    .max(MAX_PRODUCT_IMAGES, { message: `${MAX_PRODUCT_IMAGES} photos maximum.` }),
  variants: z.array(productVariantInputSchema).max(50, { message: "50 variantes maximum." }).optional().default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Saisissez un nom." })
  .max(40, { message: "40 caractères maximum." });
