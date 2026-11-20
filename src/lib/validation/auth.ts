import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { message: "Saisissez votre e-mail." })
  .email({ message: "Adresse e-mail invalide." });

export const passwordSchema = z
  .string()
  .min(8, { message: "Au moins 8 caractères." })
  .max(72, { message: "72 caractères maximum." });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Saisissez votre mot de passe." }),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const forgotSchema = z.object({ email: emailSchema });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirm"],
  });
