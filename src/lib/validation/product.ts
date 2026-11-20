import { z } from "zod";
import { MAX_PRODUCT_IMAGES } from "@/lib/constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `${max} caractères maximum.` })
    .transform((v) => (v === "" ? null : v));

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
  options_text: optionalText(300),
  // null = stock illimité
  stock: z
    .union([z.null(), z.coerce.number().int({ message: "Stock entier uniquement." }).min(0, { message: "Le stock ne peut pas être négatif." }).max(1_000_000)]),
  is_available: z.boolean(),
  images: z
    .array(z.string().url())
    .max(MAX_PRODUCT_IMAGES, { message: `${MAX_PRODUCT_IMAGES} photos maximum.` }),
});

export type ProductInput = z.infer<typeof productSchema>;

export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Saisissez un nom." })
  .max(40, { message: "40 caractères maximum." });
