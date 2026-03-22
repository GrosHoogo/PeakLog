import { z } from "zod";

// Only positive numbers or empty string.
const POSITIVE_NUM_RE = /^\d*\.?\d*$/;

const ALLOWED_DIFFICULTIES = ["any", "easy", "moderate", "hard", "expert"] as const;
const ALLOWED_TYPES = ["any", "loop", "out-and-back", "point-to-point"] as const;

export const PlanFormSchema = z.object({
  destination: z.string().min(1, "Le lieu de référence est requis.").max(200).trim(),
  distance: z
    .string()
    .regex(POSITIVE_NUM_RE, "Valeur de distance invalide.")
    .optional()
    .or(z.literal("")),
  region: z.string().max(200).optional().or(z.literal("")),
  elevation: z
    .string()
    .regex(POSITIVE_NUM_RE, "Valeur de dénivelé invalide.")
    .optional()
    .or(z.literal("")),
  difficulty: z.enum(ALLOWED_DIFFICULTIES).optional().default("any"),
  type: z.enum(ALLOWED_TYPES).optional().default("any"),
});

export type PlanFormInput = z.input<typeof PlanFormSchema>;
export type PlanFormOutput = z.output<typeof PlanFormSchema>;
