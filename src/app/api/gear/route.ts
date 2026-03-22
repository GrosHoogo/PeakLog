import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { z } from "zod";

const GearFormSchema = z.object({
  destination: z.string().min(1, "La destination est requise.").max(200).trim(),
  date: z.string().optional().or(z.literal("")),
  distance: z.string().optional().or(z.literal("")),
  elevation: z.string().optional().or(z.literal("")),
  difficulty: z
    .enum(["easy", "moderate", "hard", "expert"])
    .optional()
    .default("moderate"),
  participants: z.coerce.number().min(1).max(100).optional().default(1),
  duration: z.string().optional().or(z.literal("")),
});

const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

interface WeatherData {
  tempMin: number;
  tempMax: number;
  precipitation: number;
  windMax: number;
  weatherCode: number;
}

/** Geocode a destination name to lat/lng using Maptiler. */
async function geocode(
  query: string,
): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key) return null;

  try {
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${key}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { center?: [number, number] }[];
    };
    const coords = data.features?.[0]?.center;
    if (!coords || coords.length < 2) return null;
    return { lng: coords[0], lat: coords[1] };
  } catch {
    return null;
  }
}

/** Fetch weather forecast from Open-Meteo (free, no API key). */
async function fetchWeather(
  lat: number,
  lng: number,
  date: string,
): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&timezone=auto&start_date=${date}&end_date=${date}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      daily?: {
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        wind_speed_10m_max?: number[];
        weather_code?: number[];
      };
    };
    const d = data.daily;
    if (!d) return null;
    return {
      tempMin: d.temperature_2m_min?.[0] ?? 0,
      tempMax: d.temperature_2m_max?.[0] ?? 0,
      precipitation: d.precipitation_sum?.[0] ?? 0,
      windMax: d.wind_speed_10m_max?.[0] ?? 0,
      weatherCode: d.weather_code?.[0] ?? 0,
    };
  } catch {
    return null;
  }
}

/** Convert WMO weather code to a human-readable French label. */
function weatherLabel(code: number): string {
  if (code === 0) return "Ciel dégagé";
  if (code <= 3) return "Partiellement nuageux";
  if (code <= 49) return "Brouillard";
  if (code <= 59) return "Bruine";
  if (code <= 69) return "Pluie";
  if (code <= 79) return "Neige";
  if (code <= 84) return "Averses de pluie";
  if (code <= 86) return "Averses de neige";
  if (code >= 95) return "Orage";
  return "Variable";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY non configurée." },
      { status: 500 },
    );
  }

  const clientKey = getClientKey(req.headers);
  const { allowed } = checkRateLimit(
    `gear:${clientKey}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans une heure." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const parsed = GearFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }

  const {
    destination,
    date,
    distance,
    elevation,
    difficulty,
    participants,
    duration,
  } = parsed.data;

  // Fetch real weather data for the destination and date.
  let weather: WeatherData | null = null;
  let weatherSummary = "Météo non disponible (pas de date ou géocodage échoué).";

  const coords = await geocode(destination);
  if (coords && date) {
    weather = await fetchWeather(coords.lat, coords.lng, date);
  }

  if (weather) {
    weatherSummary = `Météo prévue : ${weatherLabel(weather.weatherCode)}, ${weather.tempMin}°C à ${weather.tempMax}°C, précipitations ${weather.precipitation} mm, vent max ${weather.windMax} km/h.`;
  }

  const prompt = `Tu es un expert en randonnée et alpinisme avec 20 ans d'expérience en préparation de matériel.

Génère une liste de matériel EXHAUSTIVE et ULTRA PRÉCISE pour cette randonnée :

- Destination : ${destination}
- Date prévue : ${date || "non précisée"}
- Distance : ${distance ? `${distance} km` : "non précisée"}
- Dénivelé positif : ${elevation ? `${elevation} m D+` : "non précisé"}
- Difficulté : ${difficulty}
- Nombre de participants : ${participants}
- Durée estimée : ${duration ? `${duration}h` : "non précisée"}

MÉTÉO RÉELLE DU JOUR (données Open-Meteo, à prendre en compte OBLIGATOIREMENT) :
${weatherSummary}
${weather ? `- Température min : ${weather.tempMin}°C / max : ${weather.tempMax}°C` : ""}
${weather ? `- Précipitations : ${weather.precipitation} mm` : ""}
${weather ? `- Vent max : ${weather.windMax} km/h` : ""}
${weather ? `- Conditions : ${weatherLabel(weather.weatherCode)}` : ""}

ADAPTE LE MATÉRIEL À CETTE MÉTÉO :
${weather && weather.tempMin < 5 ? "- FROID : polaire épaisse, doudoune, gants, bonnet OBLIGATOIRES" : ""}
${weather && weather.tempMin < 0 ? "- GEL : sous-couche thermique, guêtres, éventuellement crampons légers" : ""}
${weather && weather.tempMax > 25 ? "- CHALEUR : privilégier vêtements légers et respirants, plus d'eau (+50%), casquette indispensable" : ""}
${weather && weather.precipitation > 5 ? "- PLUIE PRÉVUE : veste imperméable, sur-pantalon, housse de sac, guêtres OBLIGATOIRES" : ""}
${weather && weather.precipitation > 15 ? "- FORTES PLUIES : envisager report ou itinéraire de repli, sac étanche pour les affaires" : ""}
${weather && weather.windMax > 50 ? "- VENT FORT : coupe-vent robuste, lunettes, attention crêtes exposées" : ""}

IMPORTANT : Réponds UNIQUEMENT avec un objet JSON valide (sans texte avant/après) ayant cette structure :

{
  "gear_list": [
    {
      "category": "Nom de la catégorie",
      "items": [
        {"name": "Nom de l'item", "quantity": "2L", "essential": true, "note": "Explication utile"}
      ]
    }
  ],
  "tips": "Conseils personnalisés sur la préparation en lien avec la météo (3-5 phrases max)"
}

Catégories OBLIGATOIRES (dans cet ordre) :
1. "Hydratation" — Calcule la quantité d'eau EXACTE selon la durée et l'effort (environ 0.5L par heure d'effort). Mentionne poche à eau vs gourdes.
2. "Nutrition & Ravitaillement" — Détaille TOUT : barres énergétiques (combien), sandwichs, fruits secs, gels, sucre rapide pour le coup de mou. Calcule les calories nécessaires (~300-400 kcal/h d'effort). Distingue ce qui se mange en marchant vs à la pause.
3. "Vêtements — Haut du corps" — Système 3 couches si besoin. Adapte à la MÉTÉO RÉELLE ci-dessus. Polaire si T° basse, coupe-vent, doudoune légère si haute altitude, T-shirt technique respirant.
4. "Vêtements — Bas du corps" — Pantalon/short selon météo, sous-vêtement technique, guêtres si sentier boueux ou pluie.
5. "Chaussures & Pieds" — Type de chaussures (tige haute/basse selon terrain), chaussettes techniques, pansements anti-ampoules, lacets de rechange.
6. "Sac & Portage" — Taille du sac recommandée (en litres), housse de pluie, organisation des poches.
7. "Navigation & Orientation" — Carte IGN, boussole, tracé GPX sur téléphone, batterie externe.
8. "Sécurité & Premiers secours" — Trousse de secours détaillée (pansements, désinfectant, bandage, couverture de survie, sifflet, tire-tique), numéro des secours.
9. "Protection solaire & Intempéries" — Crème solaire (quel indice), lunettes, casquette/buff, veste imperméable si pluie prévue.
10. "Accessoires & Confort" — Bâtons de marche (recommandé ou non selon D+), lampe frontale si durée longue, couteau, sacs poubelle, papier toilette.

Règles :
- "essential": true pour ce qui est INDISPENSABLE (risque sans), false pour le confort/optionnel
- "quantity": quantité précise ("2L", "3", "1 paire", etc.), PAS juste "1" partout
- "note": TOUJOURS remplir avec un conseil utile et concret (pourquoi cet item, quel type choisir, où le ranger dans le sac)
- Adapte TOUT à la météo réelle, à l'altitude, à la durée et à la difficulté
- Pour ${participants} participants, adapte les quantités du matériel partagé (1 trousse de secours pour le groupe, etc.)
- Sois CONCRET : pas "des barres énergétiques" mais "4 barres énergétiques (type Clif Bar, ~250 kcal chacune)"

Réponds en français.`;

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 6144,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw || raw.trim() === "") {
      return NextResponse.json({ error: "Réponse IA vide." }, { status: 502 });
    }

    let result: unknown;
    try {
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Réponse IA mal formatée." },
        { status: 502 },
      );
    }

    const data = result as Record<string, unknown>;
    const gearList = Array.isArray(data.gear_list) ? data.gear_list : [];
    const tips = typeof data.tips === "string" ? data.tips : "";

    return NextResponse.json({ gearList, tips, weather });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    console.error("Gear generation error:", message);
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
