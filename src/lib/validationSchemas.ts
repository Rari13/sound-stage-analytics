import { z } from "zod";

// Common validation rules
const emailSchema = z.string()
  .trim()
  .email({ message: "Adresse email invalide" })
  .max(255, { message: "L'email ne doit pas dépasser 255 caractères" });

const passwordSchema = z.string()
  .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
  .max(72, { message: "Le mot de passe ne doit pas dépasser 72 caractères" });

const nameSchema = z.string()
  .trim()
  .min(1, { message: "Ce champ est requis" })
  .max(100, { message: "Ce champ ne doit pas dépasser 100 caractères" });

// Client signup schema
export const clientSignupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: nameSchema,
  lastName: nameSchema,
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter les conditions" }),
  }),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter la politique de confidentialité" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Organizer signup schema
export const organizerSignupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  organizerName: z.string()
    .trim()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères" })
    .max(100, { message: "Le nom ne doit pas dépasser 100 caractères" }),
  slug: z.string()
    .trim()
    .min(3, { message: "L'identifiant doit contenir au moins 3 caractères" })
    .max(50, { message: "L'identifiant ne doit pas dépasser 50 caractères" })
    .regex(/^[a-z0-9-]+$/, { 
      message: "L'identifiant ne peut contenir que des lettres minuscules, des chiffres et des tirets" 
    }),
  phone: z.string()
    .max(20, { message: "Le numéro de téléphone ne doit pas dépasser 20 caractères" })
    .optional()
    .or(z.literal("")),
  siret: z.string()
    .max(17, { message: "Le SIRET ne doit pas dépasser 17 caractères" })
    .optional()
    .or(z.literal("")),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter les conditions" }),
  }),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter la politique de confidentialité" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type ClientSignupData = z.infer<typeof clientSignupSchema>;
export type OrganizerSignupData = z.infer<typeof organizerSignupSchema>;
