"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Loader2,
  Save,
  RotateCcw,
  Mountain,
  Clock,
  TrendingUp,
  MapPin,
  Download,
} from "lucide-react";
import { API_ROUTES } from "@/lib/api-routes";

interface PlanForm {
  destination: string;
  date: string;
  distance: string;
  elevation: string;
  difficulty: string;
  participants: string;
  fitness: string;
  equipment: string;
  loop: boolean;
}

interface Waypoint {
  name: string;
  lat: number;
  lng: number;
  elevation?: number;
  description?: string;
  type?: "start" | "waypoint" | "end";
}

interface RouteGeometry {
  type: "LineString";
  coordinates: [number, number][];
}

interface PlanResult {
  plan: string;
  waypoints: Waypoint[];
  routeGeometry: RouteGeometry | null;
  totalDistance: number | null;
  totalElevation: number | null;
  estimatedDuration: number | null;
}

const initialForm: PlanForm = {
  destination: "",
  date: "",
  distance: "",
  elevation: "",
  difficulty: "moderate",
  participants: "1",
  fitness: "intermediate",
  equipment: "",
  loop: false,
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Map component that renders the route with waypoints. */
function RouteMap({
  waypoints,
  routeGeometry,
}: {
  waypoints: Waypoint[];
  routeGeometry: RouteGeometry | null;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!token || waypoints.length === 0) return;

    async function initMap() {
      const maplibregl = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");

      if (!mapContainer.current) return;

      // Clean up previous map instance.
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Center on the midpoint of the route.
      const midIdx = Math.floor(waypoints.length / 2);
      const center: [number, number] = [
        waypoints[midIdx].lng,
        waypoints[midIdx].lat,
      ];

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${token}`,
        center,
        zoom: 12,
      });
      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      map.on("load", () => {
        // Use OSRM geometry (follows real paths) or fall back to straight lines.
        const geometry = routeGeometry ?? {
          type: "LineString" as const,
          coordinates: waypoints.map((w) => [w.lng, w.lat]),
        };

        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry,
          },
        });

        // Route shadow for depth.
        map.addLayer({
          id: "route-shadow",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#000",
            "line-width": 7,
            "line-opacity": 0.3,
          },
        });

        // Main route line.
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#d4a04a",
            "line-width": 4,
            "line-opacity": 0.9,
          },
        });

        // Add markers for each waypoint.
        waypoints.forEach((wp, i) => {
          const isStart = wp.type === "start" || i === 0;
          const isEnd =
            wp.type === "end" || i === waypoints.length - 1;

          const color = isStart
            ? "#22c55e"
            : isEnd
              ? "#ef4444"
              : "#d4a04a";

          const safeName = escapeHtml(wp.name);
          const safeDesc = escapeHtml(wp.description ?? "");
          const elevText = wp.elevation ? `${wp.elevation} m` : "";

          const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div style="color:#1a1a18;font-family:sans-serif;max-width:200px">
              <strong>${safeName}</strong>
              ${elevText ? `<br/><span style="font-size:11px;color:#666">${elevText}</span>` : ""}
              ${safeDesc ? `<br/><span style="font-size:12px">${safeDesc}</span>` : ""}
            </div>`,
          );

          new maplibregl.Marker({ color })
            .setLngLat([wp.lng, wp.lat])
            .setPopup(popup)
            .addTo(map);
        });

        // Fit map to route bounds.
        const bounds = new maplibregl.LngLatBounds();
        waypoints.forEach((wp) => bounds.extend([wp.lng, wp.lat]));
        map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      });
    }

    initMap();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [waypoints, routeGeometry]);

  return <div ref={mapContainer} className="h-full w-full rounded-xl" />;
}

/** Renders the plan text as safe paragraphs. */
function PlanText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-peak-text">
      {text.split("\n").map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}

/** Generate a GPX file from waypoints and route geometry for AllTrails import. */
function exportGpx(
  waypoints: Waypoint[],
  routeGeometry: RouteGeometry | null,
  name: string,
) {
  const timestamp = new Date().toISOString();
  const wptEntries = waypoints
    .map(
      (wp) =>
        `  <wpt lat="${wp.lat}" lon="${wp.lng}">${wp.elevation ? `\n    <ele>${wp.elevation}</ele>` : ""}\n    <name>${escapeHtml(wp.name)}</name>${wp.description ? `\n    <desc>${escapeHtml(wp.description)}</desc>` : ""}\n  </wpt>`,
    )
    .join("\n");

  const coords = routeGeometry
    ? routeGeometry.coordinates
    : waypoints.map((w) => [w.lng, w.lat] as [number, number]);

  const trkpts = coords
    .map((c) => `      <trkpt lat="${c[1]}" lon="${c[0]}"></trkpt>`)
    .join("\n");

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PeakLog" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeHtml(name)}</name>
    <time>${timestamp}</time>
  </metadata>
${wptEntries}
  <trk>
    <name>${escapeHtml(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([gpx], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç _-]/g, "").trim() || "randonnee"}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlanPage() {
  const [form, setForm] = useState<PlanForm>(initialForm);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof PlanForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateParticipants(raw: string) {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1) {
      update("participants", String(Math.min(n, 100)));
    }
  }

  async function generate() {
    if (!form.destination.trim()) {
      setError("Entrez une destination.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(API_ROUTES.PLAN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        throw new Error("Réponse invalide du serveur.");
      }

      if (!res.ok) {
        throw new Error(
          (data.error as string) ?? "Erreur lors de la génération.",
        );
      }

      setResult({
        plan: typeof data.plan === "string" ? data.plan : "",
        waypoints: Array.isArray(data.waypoints)
          ? (data.waypoints as Waypoint[])
          : [],
        routeGeometry:
          data.routeGeometry &&
          typeof data.routeGeometry === "object" &&
          "coordinates" in (data.routeGeometry as Record<string, unknown>)
            ? (data.routeGeometry as RouteGeometry)
            : null,
        totalDistance:
          typeof data.totalDistance === "number" ? data.totalDistance : null,
        totalElevation:
          typeof data.totalElevation === "number" ? data.totalElevation : null,
        estimatedDuration:
          typeof data.estimatedDuration === "number"
            ? data.estimatedDuration
            : null,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-peak-border bg-peak-surface px-4 py-2.5 text-peak-text placeholder:text-peak-text-muted focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600 transition-colors";
  const labelClass = "block text-sm font-medium text-peak-text-muted mb-1.5";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Planificateur IA</h1>
        <p className="mt-2 text-peak-text-muted">
          Décrivez votre rando, l&apos;IA trace votre itinéraire sur la carte.
        </p>
      </div>

      {/* Form — compact row */}
      <div className="mb-6 space-y-4 rounded-2xl border border-peak-border bg-peak-surface p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Destination <span aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              placeholder="Mont Blanc, Tour du Queyras..."
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Participants</label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.participants}
              onChange={(e) => updateParticipants(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className={labelClass}>Distance (km)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="15"
              value={form.distance}
              onChange={(e) => update("distance", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dénivelé (m)</label>
            <input
              type="number"
              min="0"
              placeholder="800"
              value={form.elevation}
              onChange={(e) => update("elevation", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Difficulté</label>
            <select
              value={form.difficulty}
              onChange={(e) => update("difficulty", e.target.value)}
              className={inputClass}
            >
              <option value="easy">Facile</option>
              <option value="moderate">Modéré</option>
              <option value="hard">Difficile</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Niveau</label>
            <select
              value={form.fitness}
              onChange={(e) => update("fitness", e.target.value)}
              className={inputClass}
            >
              <option value="beginner">Débutant</option>
              <option value="intermediate">Intermédiaire</option>
              <option value="advanced">Avancé</option>
              <option value="athlete">Athlète</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Équipement</label>
            <input
              type="text"
              placeholder="Bâtons, crampons..."
              value={form.equipment}
              onChange={(e) => update("equipment", e.target.value)}
              maxLength={500}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-peak-text">
            <input
              type="checkbox"
              checked={form.loop}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, loop: e.target.checked }))
              }
              className="h-4 w-4 rounded border-peak-border accent-amber-500"
            />
            Boucle (retour au départ)
          </label>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-medium text-peak-bg transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {loading ? "Génération de l'itinéraire..." : "Tracer l'itinéraire"}
          </button>
          <button
            onClick={() => {
              setForm(initialForm);
              setResult(null);
              setError(null);
            }}
            className="rounded-xl border border-peak-border px-4 py-3 text-peak-text-muted transition-colors hover:bg-peak-surface-light"
            aria-label="Réinitialiser le formulaire"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-rust-500/10 p-4 text-sm text-rust-400"
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex h-96 items-center justify-center rounded-2xl border border-peak-border bg-peak-surface">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
            <p className="text-sm text-peak-text-muted">
              Recherche des sentiers et points de passage...
            </p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-6">
          {/* Stats bar */}
          {(result.totalDistance ||
            result.totalElevation ||
            result.estimatedDuration) && (
            <div className="flex flex-wrap gap-4">
              {result.totalDistance && (
                <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-surface px-4 py-2.5">
                  <Mountain className="h-4 w-4 text-forest-500" />
                  <span className="text-sm font-medium">
                    {result.totalDistance} km
                  </span>
                </div>
              )}
              {result.totalElevation && (
                <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-surface px-4 py-2.5">
                  <TrendingUp className="h-4 w-4 text-forest-500" />
                  <span className="text-sm font-medium">
                    {result.totalElevation} m D+
                  </span>
                </div>
              )}
              {result.estimatedDuration && (
                <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-surface px-4 py-2.5">
                  <Clock className="h-4 w-4 text-forest-500" />
                  <span className="text-sm font-medium">
                    {Math.floor(result.estimatedDuration / 60)}h
                    {result.estimatedDuration % 60 > 0
                      ? `${(result.estimatedDuration % 60).toString().padStart(2, "0")}`
                      : ""}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-surface px-4 py-2.5">
                <MapPin className="h-4 w-4 text-forest-500" />
                <span className="text-sm font-medium">
                  {result.waypoints.length} étapes
                </span>
              </div>
            </div>
          )}

          {/* Map + plan side by side */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Map — takes 3/5 of the width */}
            {result.waypoints.length > 0 && (
              <div className="lg:col-span-3">
                <div className="h-[500px] overflow-hidden rounded-2xl border border-peak-border">
                  <RouteMap waypoints={result.waypoints} routeGeometry={result.routeGeometry} />
                </div>

                {/* Waypoints list */}
                <div className="mt-4 space-y-2">
                  {result.waypoints.map((wp, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg bg-peak-surface p-3 text-sm"
                    >
                      <div
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          wp.type === "start"
                            ? "bg-green-500/20 text-green-400"
                            : wp.type === "end"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{wp.name}</p>
                        {wp.description && (
                          <p className="text-peak-text-muted">
                            {wp.description}
                          </p>
                        )}
                      </div>
                      {wp.elevation && (
                        <span className="shrink-0 text-xs text-peak-text-muted">
                          {wp.elevation} m
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plan text — takes 2/5 */}
            <div
              className={`rounded-2xl border border-peak-border bg-peak-surface p-6 ${
                result.waypoints.length > 0 ? "lg:col-span-2" : "lg:col-span-5"
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  Plan détaillé
                </h2>
                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-1.5 rounded-lg bg-forest-800 px-3 py-1.5 text-sm text-forest-200 transition-colors hover:bg-forest-700"
                    onClick={() =>
                      exportGpx(
                        result.waypoints,
                        result.routeGeometry,
                        form.destination || "randonnee",
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                    Exporter GPX
                  </button>
                  <button
                    className="flex items-center gap-1.5 rounded-lg bg-forest-800 px-3 py-1.5 text-sm text-forest-200 transition-colors hover:bg-forest-700"
                    onClick={() => {
                      /* TODO: save plan */
                    }}
                  >
                    <Save className="h-4 w-4" />
                    Sauvegarder
                  </button>
                </div>
              </div>
              <PlanText text={result.plan} />
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !error && !loading && (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-peak-border bg-peak-surface text-peak-text-muted">
          <MapPin className="mb-3 h-10 w-10" />
          <p className="text-center text-sm">
            Remplissez le formulaire et l&apos;IA tracera
            <br />
            votre itinéraire sur la carte.
          </p>
        </div>
      )}
    </div>
  );
}
