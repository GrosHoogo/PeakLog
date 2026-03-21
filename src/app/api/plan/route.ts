import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PlanFormSchema } from "@/lib/validation";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

// 10 plan generations per hour per client.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY non configurée." },
      { status: 500 },
    );
  }

  // TODO: uncomment auth check once login UI is implemented.
  // if (
  //   process.env.NEXT_PUBLIC_SUPABASE_URL &&
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // ) {
  //   const supabase = await createClient();
  //   const {
  //     data: { session },
  //   } = await supabase.auth.getSession();
  //   if (!session) {
  //     return NextResponse.json(
  //       { error: "Authentification requise." },
  //       { status: 401 },
  //     );
  //   }
  // }

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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const plan = response.text();

    if (!plan || plan.trim() === "") {
      return NextResponse.json(
        { error: "Réponse IA vide ou invalide." },
        { status: 502 },
      );
    }

    return NextResponse.json({ plan });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur inconnue.";
    console.error("Plan generation error:", message);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Erreur Gemini : ${message}`
            : "Erreur lors de la génération.",
      },
      { status: 500 },
    );
  }
}
