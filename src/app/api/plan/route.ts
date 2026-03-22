import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { PlanFormSchema } from "@/lib/validation";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

// 10 plan generations per hour per client.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// ── ORS types ───────────────────────────────────────────────────────────────

interface OrsFeature {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number, number][] };
  properties: {
    summary: { distance: number; duration: number; ascent: number; descent: number };
    segments: { distance: number; duration: number; ascent: number; descent: number }[];
  };
}

interface OrsResponse {
  type: "FeatureCollection";
  features: OrsFeature[];
}

// ── ORS helpers ─────────────────────────────────────────────────────────────

async function orsDirections(
  coords: [number, number][],
  orsKey: string,
): Promise<OrsFeature | null> {
  try {
    const res = await fetch(
      "https://api.openrouteservice.org/v2/directions/foot-hiking/geojson",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: orsKey },
        body: JSON.stringify({
          coordinates: coords,
          elevation: true,
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as OrsResponse;
    return data.features?.[0] ?? null;
  } catch {
    return null;
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const groqKey = process.env.GROQ_API_KEY;
  const orsKey = process.env.ORS_API_KEY;

  if (!groqKey) {
    return NextResponse.json({ error: "GROQ_API_KEY non configurée." }, { status: 500 });
  }
  if (!orsKey) {
    return NextResponse.json({ error: "ORS_API_KEY non configurée." }, { status: 500 });
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

  const { destination, date, distance, elevation, difficulty, participants, fitness, equipment, loop } =
    parsed.data;

  // ── Step 1: Ask Groq for waypoints ──────────────────────────────────────

  const prompt = `Tu es un guide de montagne expert en sentiers de randonnée.

Génère un plan de randonnée pour la zone de ${destination}.

PARAMÈTRES :
- Date : ${date || "non précisée"}
${distance ? `- Distance souhaitée : ${distance} km` : "- Distance : libre"}
${elevation ? `- Dénivelé positif souhaité : ${elevation} m D+` : "- Dénivelé : libre"}
- Type : ${loop ? "BOUCLE (circuit fermé, retour au point de départ)" : "ALLER SIMPLE"}
- Difficulté : ${difficulty}
- Participants : ${participants}
- Niveau : ${fitness}
- Équipement : ${equipment || "non précisé"}

${loop ? `BOUCLE — INSTRUCTIONS CRITIQUES :
- Les waypoints DOIVENT former un CIRCUIT CIRCULAIRE sur la carte (pas un aller-retour).
- Monte par un versant, descends par un AUTRE versant. Les waypoints d'aller et de retour sont dans des directions OPPOSÉES.
- Le DERNIER waypoint a les MÊMES coordonnées lat/lng que le PREMIER.
- Dispose les waypoints en cercle/ovale autour d'un point central (sommet, lac, col).
${distance ? `- Pour une boucle de ${distance} km, reste dans un rayon de ~${(parseFloat(distance) / 5).toFixed(1)} km autour du départ.` : ""}` : ""}

${distance ? `DISTANCE — Place les waypoints pour que le parcours sur sentier fasse environ ${distance} km au total. Pour ça, les waypoints doivent être PROCHES les uns des autres (segments de ~${(parseFloat(distance) / 7).toFixed(1)} km en ligne droite).` : ""}

${elevation ? `DÉNIVELÉ — Le départ est en fond de vallée/parking. Les waypoints montent progressivement jusqu'à un point culminant situé ~${elevation}m plus haut, puis redescendent. Les altitudes de chaque waypoint doivent refléter cette progression.` : ""}

Réponds UNIQUEMENT en JSON valide :
{
  "plan": "Plan en français : 1. Itinéraire détaillé étape par étape, 2. Horaires, 3. Sécurité, 4. Conseil du guide",
  "waypoints": [
    {"name": "Nom du lieu", "lat": 45.923, "lng": 6.862, "elevation": 1050, "description": "Description courte", "type": "start"},
    {"name": "...", "lat": ..., "lng": ..., "elevation": ..., "description": "...", "type": "waypoint"},
    {"name": "...", "lat": ..., "lng": ..., "elevation": ..., "description": "...", "type": "end"}
  ]
}

Règles :
- Coordonnées GPS de VRAIS lieux/sentiers à ${destination}
- 6 à 10 waypoints
- type "start" pour le premier, "end" pour le dernier, "waypoint" pour les intermédiaires
- Altitudes réalistes correspondant au terrain réel
- Plan texte en français, pratique et motivant`;

  try {
    const groq = new Groq({ apiKey: groqKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw || raw.trim() === "") {
      return NextResponse.json({ error: "Réponse IA vide." }, { status: 502 });
    }

    let aiResult: unknown;
    try {
      aiResult = JSON.parse(raw);
    } catch {
      return NextResponse.json({ plan: raw, waypoints: [] });
    }

    const aiData = aiResult as Record<string, unknown>;
    const plan = typeof aiData.plan === "string" ? aiData.plan : "Plan non disponible.";
    const aiWaypoints = Array.isArray(aiData.waypoints) ? aiData.waypoints : [];

    // Extract valid coordinates from AI waypoints.
    const validWaypoints = aiWaypoints.filter(
      (wp: Record<string, unknown>) =>
        typeof wp.lat === "number" &&
        typeof wp.lng === "number" &&
        Math.abs(wp.lat as number) <= 90 &&
        Math.abs(wp.lng as number) <= 180,
    ) as { name: string; lat: number; lng: number; elevation?: number; description?: string; type?: string }[];

    if (validWaypoints.length < 2) {
      return NextResponse.json({
        plan,
        waypoints: validWaypoints,
        routeGeometry: null,
        routeDistanceKm: null,
        routeElevationUp: null,
        routeElevationDown: null,
        totalDistance: null,
        totalElevation: null,
        estimatedDuration: null,
      });
    }

    // ── Step 2: Route via ORS foot-hiking ─────────────────────────────────

    const coords: [number, number][] = validWaypoints.map((wp) => [wp.lng, wp.lat]);
    const orsFeature = await orsDirections(coords, orsKey);

    let routeGeometry: unknown = null;
    let routeDistanceKm: number | null = null;
    let routeElevationUp: number | null = null;
    let routeElevationDown: number | null = null;
    let routeDurationMin: number | null = null;

    if (orsFeature) {
      routeGeometry = orsFeature.geometry;
      const s = orsFeature.properties.summary;
      routeDistanceKm = Math.round((s.distance / 1000) * 100) / 100;
      routeElevationUp = Math.round(s.ascent);
      routeElevationDown = Math.round(s.descent);
      routeDurationMin = Math.round(s.duration / 60);
    }

    // User-requested values for display; ORS values are the real route stats.
    const distStr = String(distance ?? "");
    const elevStr = String(elevation ?? "");
    const userDist = distStr.length > 0 ? parseFloat(distStr) : NaN;
    const userElev = elevStr.length > 0 ? parseFloat(elevStr) : NaN;
    const totalDistance = !isNaN(userDist) && userDist > 0 ? userDist : null;
    const totalElevation = !isNaN(userElev) && userElev > 0 ? userElev : null;

    // Use ORS duration if available, otherwise estimate from user values.
    let estimatedDuration = routeDurationMin;
    if (!estimatedDuration && totalDistance && totalDistance > 0) {
      const walkMin = (totalDistance / 4) * 60;
      const climbMin = totalElevation ? (totalElevation / 400) * 60 : 0;
      estimatedDuration = Math.round(Math.max(walkMin, climbMin) + Math.min(walkMin, climbMin) * 0.5);
    }

    return NextResponse.json({
      plan,
      waypoints: validWaypoints,
      routeGeometry,
      routeDistanceKm,
      routeElevationUp,
      routeElevationDown,
      totalDistance,
      totalElevation,
      estimatedDuration,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    console.error("Plan generation error:", message);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Erreur : ${message}`
            : "Erreur lors de la génération.",
      },
      { status: 500 },
    );
  }
}
