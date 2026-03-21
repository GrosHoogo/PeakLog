import { NextRequest, NextResponse } from "next/server";
import { PlanFormSchema } from "@/lib/validation";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase-server";

// 10 plan generations per hour per client.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY non configurée." },
      { status: 500 },
    );
  }

  // Auth check — enforced only when Supabase is configured.
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentification requise." },
        { status: 401 },
      );
    }
  }

  // Rate limit by IP (or user id once auth is wired up).
  const clientKey = getClientKey(req.headers);
  const { allowed } = checkRateLimit(
    `plan:${clientKey}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans une heure." },
      { status: 429 },
    );
  }

  // Validate and sanitise input with Zod.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const parsed = PlanFormSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const {
    destination,
    date,
    distance,
    elevation,
    difficulty,
    participants,
    fitness,
    equipment,
  } = parsed.data;

  const prompt = `Tu es un guide de montagne expérimenté. Prépare un plan de randonnée détaillé.

Informations :
- Destination : ${destination}
- Date : ${date || "non précisée"}
- Distance souhaitée : ${distance ? distance + " km" : "non précisée"}
- Dénivelé : ${elevation ? elevation + " m" : "non précisé"}
- Difficulté : ${difficulty}
- Nombre de participants : ${participants}
- Niveau physique : ${fitness}
- Équipement disponible : ${equipment || "non précisé"}

Réponds en français avec ces sections :
1. **Itinéraire détaillé** (étapes, points d'intérêt)
2. **Horaires recommandés** (départ, pauses, arrivée)
3. **Liste d'équipement** personnalisée selon le niveau et la destination
4. **Alertes sécurité** (météo, passages techniques, risques)
5. **Astuce du guide** (un conseil de pro pour cette sortie)

Sois précis, pratique et encourageant.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error. Status:", response.status);
      return NextResponse.json(
        { error: "Erreur API Anthropic." },
        { status: 502 },
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return NextResponse.json(
        { error: "Réponse Anthropic illisible." },
        { status: 502 },
      );
    }

    // Validate the shape of Anthropic's response.
    if (
      typeof data !== "object" ||
      data === null ||
      !Array.isArray((data as Record<string, unknown>).content) ||
      (data as Record<string, unknown[]>).content.length === 0
    ) {
      console.error("Unexpected Anthropic response shape.");
      return NextResponse.json(
        { error: "Format de réponse inattendu." },
        { status: 502 },
      );
    }

    const firstBlock = (data as { content: Record<string, unknown>[] })
      .content[0];
    const plan = firstBlock?.text;

    if (typeof plan !== "string" || plan.trim() === "") {
      return NextResponse.json(
        { error: "Réponse IA vide ou invalide." },
        { status: 502 },
      );
    }

    return NextResponse.json({ plan });
  } catch (err) {
    console.error("Plan generation error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la génération." },
      { status: 500 },
    );
  }
}
