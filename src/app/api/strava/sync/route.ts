import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { StravaActivity } from "@/lib/types";

const ISO_DATE_RE = /(\d{4}-\d{2}-\d{2})/;

function parseDate(raw: string): string {
  const match = ISO_DATE_RE.exec(raw);
  return match ? match[1] : new Date().toISOString().split("T")[0]!;
}

function parseLatLng(latlng: StravaActivity["start_latlng"]): {
  lat: number | null;
  lng: number | null;
} {
  if (Array.isArray(latlng) && latlng.length === 2) {
    const [lat, lng] = latlng;
    if (typeof lat === "number" && typeof lng === "number") {
      return { lat, lng };
    }
  }
  return { lat: null, lng: null };
}

export async function POST(req: NextRequest) {
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

  // The access token must come from a server-side secret, not the client.
  // Once auth is wired up, retrieve it from the encrypted DB column.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const accessToken =
    typeof body === "object" &&
    body !== null &&
    "accessToken" in body &&
    typeof (body as Record<string, unknown>).accessToken === "string"
      ? (body as { accessToken: string }).accessToken
      : null;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Access token requis." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=200",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Erreur API Strava." },
        { status: 502 },
      );
    }

    const rawActivities: unknown = await res.json();

    if (!Array.isArray(rawActivities)) {
      return NextResponse.json(
        { error: "Réponse Strava inattendue." },
        { status: 502 },
      );
    }

    // Cast and filter with strict guards — all fields validated before use.
    const activities = rawActivities as StravaActivity[];

    const hikes = activities
      .filter(
        (a) =>
          ["Hike", "Walk"].includes(a.type) &&
          typeof a.name === "string" &&
          a.name.trim().length > 0 &&
          typeof a.start_date === "string" &&
          typeof a.distance === "number" &&
          typeof a.total_elevation_gain === "number" &&
          typeof a.moving_time === "number",
      )
      .map((a) => {
        const { lat, lng } = parseLatLng(a.start_latlng);
        return {
          name: a.name.trim(),
          date: parseDate(a.start_date),
          distance_km: Math.round((a.distance / 1000) * 10) / 10,
          elevation_m: Math.round(a.total_elevation_gain),
          duration_min: Math.round(a.moving_time / 60),
          source: "strava" as const,
          external_id: `strava_${a.id}`,
          lat,
          lng,
        };
      });

    // TODO: upsert into Supabase with ON CONFLICT (external_id) DO UPDATE

    return NextResponse.json({
      synced: hikes.length,
      total: activities.length,
      hikes,
    });
  } catch (err) {
    console.error("Strava sync error:", err);
    return NextResponse.json(
      { error: "Erreur de synchronisation." },
      { status: 500 },
    );
  }
}
