import { NextRequest, NextResponse } from "next/server";
import { PlanFormSchema } from "@/lib/validation";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

// 10 plan searches per hour per client.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

// ── OpenRouter types ────────────────────────────────────────────────────────

interface OpenRouterChoice {
  message: { role: string; content: string };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: { message: string };
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY non configurée." }, { status: 500 });
  }

  // Rate limit.
  const clientKey = getClientKey(req.headers);
  const { allowed } = checkRateLimit(`plan:${clientKey}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une heure." }, { status: 429 });
  }

  // Parse body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const parsed = PlanFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }

  const { destination, distance, region, elevation, difficulty, type } = parsed.data;

  const distKm = distance ? parseFloat(distance) : null;
  const elevM = elevation ? parseFloat(elevation) : null;

  const difficultyLabel: Record<string, string> = {
    any: "peu importe",
    easy: "facile",
    moderate: "modéré",
    hard: "difficile",
    expert: "expert / alpinisme",
  };

  const typeLabel: Record<string, string> = {
    any: "peu importe",
    loop: "boucle",
    "out-and-back": "aller-retour",
    "point-to-point": "point à point / traversée",
  };

  const prompt = `Tu es un expert en randonnée qui connaît parfaitement les sentiers référencés sur AllTrails, Visorando, Komoot, et les topos IGN.

MISSION : Suggère 5 à 8 randonnées RÉELLES et EXISTANTES correspondant aux critères ci-dessous. Ces randonnées doivent être trouvables sur AllTrails, Visorando, ou Komoot.

CRITÈRES :
- Lieu de référence : ${destination}
${region ? `- Région : ${region}` : ""}
${distKm ? `- Distance souhaitée : environ ${distKm} km (tolérance ±30%)` : "- Distance : peu importe"}
${elevM ? `- Dénivelé positif souhaité : environ ${elevM} m (tolérance ±30%)` : "- Dénivelé : peu importe"}
- Difficulté : ${difficultyLabel[difficulty] ?? "peu importe"}
- Type de parcours : ${typeLabel[type] ?? "peu importe"}

RÈGLES STRICTES :
- Ne suggère QUE des randonnées qui EXISTENT RÉELLEMENT et sont référencées sur au moins une plateforme (AllTrails, Visorando, Komoot)
- Les distances et dénivelés doivent correspondre aux données RÉELLES de la randonnée, pas à des estimations
- Donne le NOM EXACT tel qu'il apparaît sur la plateforme source
- Si tu n'es pas sûr qu'une randonnée existe, ne l'inclus pas

Réponds UNIQUEMENT avec un tableau JSON valide (pas de markdown, pas de texte avant/après) :
[
  {
    "name": "Nom exact de la randonnée",
    "zone": "Commune ou massif, département",
    "distance": 12.5,
    "elevation": 650,
    "difficulty": "modéré",
    "type": "boucle",
    "description": "Description courte (2-3 phrases) : itinéraire, points d'intérêt, ambiance.",
    "source": "AllTrails",
    "url": "https://www.alltrails.com/trail/..."
  }
]

Les champs distance (en km) et elevation (D+ en m) sont des nombres. Le champ url doit être l'URL réelle de la randonnée sur la plateforme source si tu la connais, sinon mets null.`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("OpenRouter error:", res.status, errBody);
      return NextResponse.json(
        { error: process.env.NODE_ENV === "development" ? `OpenRouter ${res.status}: ${errBody}` : "Erreur du service IA." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as OpenRouterResponse;

    if (data.error) {
      console.error("OpenRouter API error:", data.error.message);
      return NextResponse.json(
        { error: process.env.NODE_ENV === "development" ? `OpenRouter: ${data.error.message}` : "Erreur du service IA." },
        { status: 502 },
      );
    }

    const raw = data.choices?.[0]?.message?.content ?? "";
    if (!raw.trim()) {
      return NextResponse.json({ error: "Réponse IA vide." }, { status: 502 });
    }

    // Parse JSON — strip markdown fences if present.
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let trails: unknown;
    try {
      trails = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Réponse IA invalide." }, { status: 502 });
    }

    if (!Array.isArray(trails)) {
      return NextResponse.json({ error: "Format de réponse inattendu." }, { status: 502 });
    }

    // Validate and sanitize each trail.
    const validTrails = trails
      .filter(
        (t: Record<string, unknown>) =>
          typeof t.name === "string" && t.name.length > 0,
      )
      .map((t: Record<string, unknown>) => ({
        name: String(t.name),
        zone: typeof t.zone === "string" ? t.zone : null,
        distance: typeof t.distance === "number" ? t.distance : null,
        elevation: typeof t.elevation === "number" ? t.elevation : null,
        difficulty: typeof t.difficulty === "string" ? t.difficulty : null,
        type: typeof t.type === "string" ? t.type : null,
        description: typeof t.description === "string" ? t.description : null,
        source: typeof t.source === "string" ? t.source : null,
        url: typeof t.url === "string" && t.url.startsWith("https://") ? t.url : null,
      }));

    return NextResponse.json({ trails: validTrails });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    console.error("Plan search error:", message);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Erreur OpenRouter : ${message}`
            : "Erreur lors de la recherche.",
      },
      { status: 500 },
    );
  }
}
