import { z } from "zod";

const ALLOWED_DIFFICULTIES = ["easy", "moderate", "hard", "expert"] as const;

const ALLOWED_FITNESS = [
  "beginner",
  "intermediate",
  "advanced",
  "athlete",
] as const;

// Regex permitting only safe date format, no injection possible.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Only positive numbers or empty string.
const POSITIVE_NUM_RE = /^\d*\.?\d*$/;

export const PlanFormSchema = z.object({
  destination: z.string().min(1, "La destination est requise.").max(200).trim(),
  date: z
    .string()
    .regex(DATE_RE, "Format de date invalide (YYYY-MM-DD).")
    .optional()
    .or(z.literal("")),
  distance: z
    .string()
    .regex(POSITIVE_NUM_RE, "Valeur de distance invalide.")
    .optional()
    .or(z.literal("")),
  elevation: z
    .string()
    .regex(POSITIVE_NUM_RE, "Valeur de dénivelé invalide.")
    .optional()
    .or(z.literal("")),
  difficulty: z.enum(ALLOWED_DIFFICULTIES),
  participants: z
    .string()
    .regex(/^\d+$/, "Nombre de participants invalide.")
    .transform(Number)
    .pipe(z.number().min(1).max(100)),
  fitness: z.enum(ALLOWED_FITNESS),
  equipment: z.string().max(500).optional().or(z.literal("")),
});

export type PlanFormInput = z.input<typeof PlanFormSchema>;
export type PlanFormOutput = z.output<typeof PlanFormSchema>;
