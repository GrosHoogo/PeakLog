import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// ── Types ───────────────────────────────────────────────────────────────────

interface TrailResult {
  id: number;
  name: string;
  ref: string | null;
  network: string | null;
  distance: number | null;
  ascent: number | null;
  descent: number | null;
  description: string | null;
  roundtrip: boolean;
}

interface OverpassRelation {
  type: "relation";
  id: number;
  tags?: Record<string, string>;
}

interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  nodes?: number[];
  members?: { type: string; ref: number; role: string }[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse distance from OSM tag (various formats: "12 km", "12.5", "12,5 km"). */
function parseOsmDistance(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(",", ".").replace(/\s*km\s*/i, "").trim();
  const n = parseFloat(cleaned);
  if (isNaN(n) || n <= 0) return null;
  // If value > 500, assume meters.
  return n > 500 ? Math.round((n / 1000) * 10) / 10 : Math.round(n * 10) / 10;
}

/** Parse elevation from OSM tag. */
function parseOsmElevation(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(",", ".").replace(/\s*m\s*/i, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) || n <= 0 ? null : Math.round(n);
}

/** Geocode a destination using Maptiler. */
async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key) return null;
  try {
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${key}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: { center?: [number, number] }[] };
    const coords = data.features?.[0]?.center;
    if (!coords || coords.length < 2) return null;
    return { lng: coords[0], lat: coords[1] };
  } catch {
    return null;
  }
}

// ── Search handler ──────────────────────────────────────────────────────────

async function searchTrails(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<TrailResult[]> {
  const query = `
[out:json][timeout:30];
(
  relation["route"="hiking"](around:${radiusM},${lat},${lng});
  relation["route"="foot"](around:${radiusM},${lat},${lng});
);
out tags;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error("Overpass API error");
  const data = (await res.json()) as { elements: OverpassRelation[] };

  return data.elements
    .filter((el) => el.tags?.name)
    .map((el) => {
      const t = el.tags!;
      const roundtrip =
        t.roundtrip === "yes" ||
        t.route === "circular" ||
        (t.name?.toLowerCase().includes("boucle") ?? false) ||
        (t.name?.toLowerCase().includes("circuit") ?? false) ||
        (t.name?.toLowerCase().includes("tour") ?? false);

      return {
        id: el.id,
        name: t.name!,
        ref: t.ref || null,
        network: t.network || null,
        distance: parseOsmDistance(t.distance),
        ascent: parseOsmElevation(t.ascent),
        descent: parseOsmElevation(t.descent),
        description: t.description || t["description:fr"] || null,
        roundtrip,
      };
    })
    .sort((a, b) => {
      // Prefer trails with distance info, then sort by distance.
      if (a.distance && !b.distance) return -1;
      if (!a.distance && b.distance) return 1;
      if (a.distance && b.distance) return a.distance - b.distance;
      return a.name.localeCompare(b.name);
    });
}

// ── Geometry handler ────────────────────────────────────────────────────────

async function getTrailGeometry(
  relationId: number,
): Promise<{ coordinates: [number, number][]; distance: number | null; ascent: number | null; descent: number | null } | null> {
  const query = `
[out:json][timeout:30];
relation(${relationId});
(._;>;);
out body;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { elements: OverpassElement[] };

  // Build lookups.
  const nodes = new Map<number, { lat: number; lon: number }>();
  const ways = new Map<number, number[]>();
  let relation: OverpassElement | null = null;

  for (const el of data.elements) {
    if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
      nodes.set(el.id, { lat: el.lat, lon: el.lon });
    } else if (el.type === "way" && el.nodes) {
      ways.set(el.id, el.nodes);
    } else if (el.type === "relation") {
      relation = el;
    }
  }

  if (!relation?.members) return null;

  // Get ordered way IDs from the relation members.
  const wayIds = relation.members
    .filter((m) => m.type === "way")
    .map((m) => m.ref);

  // Build coordinate sequences from each way.
  const wayCoords: [number, number][][] = [];
  for (const wid of wayIds) {
    const nodeIds = ways.get(wid);
    if (!nodeIds) continue;
    const coords: [number, number][] = [];
    for (const nid of nodeIds) {
      const node = nodes.get(nid);
      if (node) coords.push([node.lon, node.lat]);
    }
    if (coords.length > 0) wayCoords.push(coords);
  }

  if (wayCoords.length === 0) return null;

  // Connect ways head-to-tail to form a continuous line.
  const result: [number, number][] = [...wayCoords[0]];
  const used = new Set<number>([0]);

  for (let iter = 1; iter < wayCoords.length; iter++) {
    const lastPt = result[result.length - 1];
    let bestIdx = -1;
    let bestReverse = false;
    let bestDist = Infinity;

    for (let i = 0; i < wayCoords.length; i++) {
      if (used.has(i)) continue;
      const w = wayCoords[i];
      const dFwd = Math.abs(w[0][0] - lastPt[0]) + Math.abs(w[0][1] - lastPt[1]);
      const dRev = Math.abs(w[w.length - 1][0] - lastPt[0]) + Math.abs(w[w.length - 1][1] - lastPt[1]);

      if (dFwd < bestDist) {
        bestDist = dFwd;
        bestIdx = i;
        bestReverse = false;
      }
      if (dRev < bestDist) {
        bestDist = dRev;
        bestIdx = i;
        bestReverse = true;
      }
    }

    if (bestIdx === -1) break;
    used.add(bestIdx);

    const coords = bestReverse ? [...wayCoords[bestIdx]].reverse() : wayCoords[bestIdx];
    // Skip first point if it's the same as the last (connection point).
    const start = bestDist < 0.0001 ? 1 : 0;
    for (let i = start; i < coords.length; i++) {
      result.push(coords[i]);
    }
  }

  // Get distance/ascent from relation tags.
  const tags = relation.tags ?? {};

  return {
    coordinates: result,
    distance: parseOsmDistance(tags.distance),
    ascent: parseOsmElevation(tags.ascent),
    descent: parseOsmElevation(tags.descent),
  };
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const clientKey = getClientKey(req.headers);
  const { allowed } = checkRateLimit(`trails:${clientKey}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const action = body.action;

  // ── Search ──────────────────────────────────────────────────────────────

  if (action === "search") {
    const destination = typeof body.destination === "string" ? body.destination.trim() : "";
    if (!destination) {
      return NextResponse.json({ error: "Destination requise." }, { status: 400 });
    }

    const coords = await geocode(destination);
    if (!coords) {
      return NextResponse.json({ error: "Impossible de localiser cette destination." }, { status: 400 });
    }

    try {
      const trails = await searchTrails(coords.lat, coords.lng, 20000);
      return NextResponse.json({ trails, center: coords });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur Overpass";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  // ── Geometry ────────────────────────────────────────────────────────────

  if (action === "geometry") {
    const id = typeof body.id === "number" ? body.id : 0;
    if (!id) {
      return NextResponse.json({ error: "ID de route requis." }, { status: 400 });
    }

    try {
      const geo = await getTrailGeometry(id);
      if (!geo) {
        return NextResponse.json({ error: "Géométrie non trouvée." }, { status: 404 });
      }

      // If ORS key is available, route through ORS for accurate distance/elevation.
      const orsKey = process.env.ORS_API_KEY;
      if (orsKey && geo.coordinates.length >= 2) {
        // Sample up to 50 points to stay within ORS limits.
        const step = Math.max(1, Math.floor(geo.coordinates.length / 50));
        const sampled = geo.coordinates.filter((_, i) => i % step === 0);
        if (sampled[sampled.length - 1] !== geo.coordinates[geo.coordinates.length - 1]) {
          sampled.push(geo.coordinates[geo.coordinates.length - 1]);
        }

        try {
          const orsRes = await fetch(
            "https://api.openrouteservice.org/v2/directions/foot-hiking/geojson",
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: orsKey },
              body: JSON.stringify({ coordinates: sampled, elevation: true }),
            },
          );

          if (orsRes.ok) {
            const orsData = (await orsRes.json()) as {
              features?: {
                geometry: { coordinates: [number, number, number][] };
                properties: { summary: { distance: number; duration: number; ascent: number; descent: number } };
              }[];
            };
            const feat = orsData.features?.[0];
            if (feat) {
              return NextResponse.json({
                geometry: feat.geometry,
                distance: Math.round((feat.properties.summary.distance / 1000) * 100) / 100,
                ascent: Math.round(feat.properties.summary.ascent),
                descent: Math.round(feat.properties.summary.descent),
                duration: Math.round(feat.properties.summary.duration / 60),
              });
            }
          }
        } catch {
          // ORS failed, fall back to raw Overpass geometry.
        }
      }

      return NextResponse.json({
        geometry: { type: "LineString", coordinates: geo.coordinates },
        distance: geo.distance,
        ascent: geo.ascent,
        descent: geo.descent,
        duration: null,
      });
    } catch {
      return NextResponse.json({ error: "Erreur lors du chargement." }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
