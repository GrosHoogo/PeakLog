import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { PlanFormSchema } from "@/lib/validation";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

// 10 plan generations per hour per client.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY non configurée." },
      { status: 500 },
    );
  }

  // Rate limit by IP.
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

  // Validate input.
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
    loop,
  } = parsed.data;

  const loopInstructions = loop
    ? `- Type de parcours : BOUCLE — le point d'arrivée DOIT être le même que le point de départ (mêmes coordonnées GPS).
- L'itinéraire doit former une boucle : monter par un versant/sentier et redescendre par un AUTRE chemin différent.
- NE PAS faire un aller-retour par le même chemin. Utiliser des sentiers différents à l'aller et au retour.
- Le dernier waypoint doit avoir les mêmes coordonnées que le premier (retour au parking/point de départ).`
    : `- Type de parcours : ALLER SIMPLE — le point de départ et d'arrivée sont différents.`;

  const prompt = `Tu es un guide de montagne expérimenté et un expert en cartographie de sentiers de randonnée.

Génère un plan de randonnée détaillé avec un itinéraire précis incluant les coordonnées GPS de chaque étape.

CONTRAINTES OBLIGATOIRES :
- Destination : ${destination}
- Date : ${date || "non précisée"}
${distance ? `- Distance EXACTE à respecter : ${distance} km — ton itinéraire DOIT faire EXACTEMENT environ ${distance} km (±1 km max). Si tu dépasses ${distance} km, raccourcis l'itinéraire.` : "- Distance : libre"}
${elevation ? `- Dénivelé EXACT à respecter : ${elevation} m D+ — ton itinéraire DOIT faire environ ${elevation} m de dénivelé positif (±10%), PAS plus.` : "- Dénivelé : libre"}
${loopInstructions}
- Difficulté : ${difficulty}
- Nombre de participants : ${participants}
- Niveau physique : ${fitness}
- Équipement disponible : ${equipment || "non précisé"}

IMPORTANT : Réponds UNIQUEMENT avec un objet JSON valide (sans texte avant/après) ayant cette structure exacte :

{
  "plan": "Le plan détaillé en texte avec les 5 sections : 1. Itinéraire détaillé, 2. Horaires recommandés, 3. Liste d'équipement, 4. Alertes sécurité, 5. Astuce du guide",
  "waypoints": [
    {"name": "Nom du point de départ", "lat": 45.123, "lng": 6.456, "elevation": 1200, "description": "Parking, début du sentier", "type": "start"},
    {"name": "Point intermédiaire", "lat": 45.130, "lng": 6.460, "elevation": 1500, "description": "Bifurcation, prendre à gauche", "type": "waypoint"},
    {"name": "Point d'arrivée / sommet", "lat": 45.140, "lng": 6.470, "elevation": 2000, "description": "Sommet, vue panoramique", "type": "${loop ? "waypoint" : "end"}"}${loop ? `,\n    {"name": "Retour au parking", "lat": 45.123, "lng": 6.456, "elevation": 1200, "description": "Retour au point de départ", "type": "end"}` : ""}
  ],
  "total_distance_km": ${distance || "la distance réelle de l'itinéraire"},
  "total_elevation_m": ${elevation || "le dénivelé réel de l'itinéraire"},
  "estimated_duration_min": 300
}

Règles STRICTES :
- total_distance_km DOIT valoir ${distance ? `exactement ${distance}` : "la distance calculée"} — ne jamais gonfler la distance
- total_elevation_m DOIT valoir ${elevation ? `environ ${elevation}` : "le dénivelé calculé"} — ne jamais gonfler le dénivelé
- estimated_duration_min : calcule de façon réaliste (base ~4 km/h + 400 m D+/h, ajusté selon difficulté)
- Minimum 5 waypoints, maximum 15
- Utilise des coordonnées GPS RÉELLES et PRÉCISES correspondant à de vrais sentiers existants
- Le premier waypoint doit avoir type "start", le dernier "end", les autres "waypoint"
- Inclus l'altitude réelle de chaque point
- Décris brièvement chaque étape (direction à prendre, point de repère)
${distance ? `- CRUCIAL : calcule la distance entre tes waypoints. La somme des distances entre waypoints consécutifs doit faire ~${distance} km. Si tes waypoints sont trop éloignés, rapproche-les.` : ""}
${loop ? `- BOUCLE : le dernier waypoint DOIT avoir exactement les mêmes lat/lng que le premier. Utilise des sentiers DIFFÉRENTS pour l'aller et le retour.` : ""}

Sois précis sur les coordonnées GPS. Le plan texte doit être en français, pratique et encourageant.`;

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw || raw.trim() === "") {
      return NextResponse.json(
        { error: "Réponse IA vide." },
        { status: 502 },
      );
    }

    let result: unknown;
    try {
      result = JSON.parse(raw);
    } catch {
      // Fallback: return as plain text if JSON parsing fails.
      return NextResponse.json({ plan: raw, waypoints: [] });
    }

    const data = result as Record<string, unknown>;
    const plan =
      typeof data.plan === "string" ? data.plan : "Plan non disponible.";
    const waypoints = Array.isArray(data.waypoints) ? data.waypoints : [];
    // Prefer user-specified values over AI-generated ones to avoid inflated stats.
    const aiDistance =
      typeof data.total_distance_km === "number"
        ? data.total_distance_km
        : null;
    const aiElevation =
      typeof data.total_elevation_m === "number"
        ? data.total_elevation_m
        : null;
    const userDist = distance ? parseFloat(distance) : NaN;
    const userElev = elevation ? parseFloat(elevation) : NaN;
    const totalDistance = !isNaN(userDist) ? userDist : aiDistance;
    const totalElevation = !isNaN(userElev) ? userElev : aiElevation;
    const estimatedDuration =
      typeof data.estimated_duration_min === "number"
        ? data.estimated_duration_min
        : null;

    // Fetch trail route from OpenRouteService (foot-hiking profile, follows marked trails).
    let routeGeometry: unknown = null;
    const orsKey = process.env.ORS_API_KEY;
    if (waypoints.length >= 2 && orsKey) {
      try {
        const coords = waypoints
          .filter(
            (wp: Record<string, unknown>) =>
              typeof wp.lng === "number" && typeof wp.lat === "number",
          )
          .map((wp: Record<string, unknown>) => [wp.lng, wp.lat]);

        const orsRes = await fetch(
          "https://api.openrouteservice.org/v2/directions/foot-hiking/geojson",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: orsKey,
            },
            body: JSON.stringify({ coordinates: coords }),
          },
        );

        if (orsRes.ok) {
          const orsData = (await orsRes.json()) as Record<string, unknown>;
          const features = orsData.features as
            | { geometry: unknown }[]
            | undefined;
          if (features && features.length > 0) {
            routeGeometry = features[0].geometry;
          }
        }
      } catch {
        // ORS unavailable — fall back to straight lines on the client.
      }
    }

    return NextResponse.json({
      plan,
      waypoints,
      routeGeometry,
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
            ? `Erreur Groq : ${message}`
            : "Erreur lors de la génération.",
      },
      { status: 500 },
    );
  }
}
