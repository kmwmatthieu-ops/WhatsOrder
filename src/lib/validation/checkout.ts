import { z } from "zod";
import { E164_REGEX } from "@/lib/phone";

export const checkoutSchema = z
  .object({
    customer_name: z
      .string()
      .trim()
      .min(2, { message: "Veuillez saisir votre nom complet (au moins 2 caractères)." })
      .max(80, { message: "80 caractères maximum." }),
    customer_phone: z
      .string()
      .trim()
      .regex(E164_REGEX, { message: "Numéro de téléphone invalide (au format international, ex: +225...)." }),
    fulfillment: z.enum(["delivery", "pickup"], {
      message: "Veuillez choisir un mode : livraison ou retrait.",
    }),
    delivery_address: z
      .string()
      .trim()
      .max(300, { message: "300 caractères maximum." })
      .optional()
      .nullable(),
    customer_note: z
      .string()
      .trim()
      .max(500, { message: "500 caractères maximum." })
      .optional()
      .nullable(),
    honeypot: z.string().max(0, { message: "Activité suspecte détectée." }).optional(),
    items: z
      .array(
        z.object({
          product_id: z.string().uuid(),
          quantity: z.number().int().min(1).max(999),
          selected_options: z.string().max(300).nullable().optional(),
        })
      )
      .min(1, { message: "Votre panier est vide." }),
  })
  .refine(
    (data) => {
      if (data.fulfillment === "delivery") {
        return Boolean(data.delivery_address && data.delivery_address.trim().length >= 3);
      }
      return true;
    },
    {
      message: "Veuillez indiquer une adresse précise pour la livraison.",
      path: ["delivery_address"],
    }
  );

export type CheckoutInput = z.infer<typeof checkoutSchema>;
