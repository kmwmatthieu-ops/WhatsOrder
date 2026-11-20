import { z } from "zod";
import { SLUG_REGEX, RESERVED_SLUGS } from "@/lib/slug";
import { E164_REGEX } from "@/lib/phone";

/** Champ texte optionnel : "" → null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `${max} caractères maximum.` })
    .transform((v) => (v === "" ? null : v));

export const shopNameSchema = z
  .string()
  .trim()
  .min(2, { message: "Au moins 2 caractères." })
  .max(60, { message: "60 caractères maximum." });

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_REGEX, { message: "3 à 40 caractères : lettres minuscules, chiffres et tirets." })
  .refine((s) => !s.includes("--"), { message: "Pas de double tiret." })
  .refine((s) => !RESERVED_SLUGS.has(s), { message: "Ce lien est réservé." });

export const whatsappSchema = z
  .string()
  .trim()
  .regex(E164_REGEX, { message: "Numéro WhatsApp invalide (vérifiez l'indicatif et le numéro)." });

/** Onboarding étapes 1 + 2 (création de la boutique). */
export const createShopSchema = z.object({
  name: shopNameSchema,
  slug: slugSchema,
  whatsapp_number: whatsappSchema,
});

/** Paramètres de la boutique. */
export const updateShopSchema = z
  .object({
    name: shopNameSchema,
    slug: slugSchema,
    whatsapp_number: whatsappSchema,
    description: optionalText(500),
    address: optionalText(200),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: "Couleur invalide." }),
    delivery_fee: z.coerce
      .number({ message: "Montant invalide." })
      .int({ message: "Montant entier uniquement." })
      .min(0, { message: "Le montant ne peut pas être négatif." })
      .max(1_000_000, { message: "Montant trop élevé." }),
    delivery_enabled: z.boolean(),
    pickup_enabled: z.boolean(),
  })
  .refine((d) => d.delivery_enabled || d.pickup_enabled, {
    message: "Activez au moins un mode : livraison ou retrait.",
    path: ["pickup_enabled"],
  });
