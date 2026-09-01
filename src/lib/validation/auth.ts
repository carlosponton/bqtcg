import { z } from "zod";

import { CITIES } from "@/lib/site";

export const emailSchema = z.email({ error: "Correo no válido." });

export const passwordSchema = z
  .string()
  .min(8, { error: "La contraseña debe tener al menos 8 caracteres." })
  .max(72, { error: "La contraseña es demasiado larga." });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "La contraseña es obligatoria." }),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, { error: "Mínimo 3 caracteres." })
  .max(20, { error: "Máximo 20 caracteres." })
  .regex(/^[a-z0-9_]+$/, {
    error: "Sólo letras minúsculas, números y guión bajo (_).",
  });

export const whatsappSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, {
    error:
      "Número no válido. Usa sólo dígitos, opcionalmente con + (ej. +573001234567).",
  });

const displayNameSchema = z
  .string()
  .trim()
  .min(2, { error: "Escribe tu nombre para mostrar." })
  .max(50, { error: "Máximo 50 caracteres." });

export const onboardingSchema = z.object({
  username: usernameSchema,
  display_name: displayNameSchema,
  city: z.enum(CITIES, { error: "Elige tu ciudad." }),
  whatsapp: z.union([whatsappSchema, z.literal("")]).optional(),
  show_whatsapp: z.boolean().default(true),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Edición de perfil (el `username` no se cambia después del onboarding). */
export const profileSchema = z.object({
  display_name: displayNameSchema,
  bio: z
    .string()
    .trim()
    .max(280, { error: "Máximo 280 caracteres." })
    .optional(),
  city: z.enum(CITIES, { error: "Elige tu ciudad." }),
  whatsapp: z.union([whatsappSchema, z.literal("")]).optional(),
  show_whatsapp: z.boolean().default(true),
  email_notifications: z.boolean().default(true),
});

export type ProfileInput = z.infer<typeof profileSchema>;
