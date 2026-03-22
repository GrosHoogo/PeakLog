"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Loader2,
  Mountain,
  Clock,
  TrendingUp,
  MapPin,
  Download,
  ArrowLeft,
  Route,
  Repeat,
} from "lucide-react";
import { API_ROUTES } from "@/lib/api-routes";

// ── Types ───────────────────────────────────────────────────────────────────

interface Trail {
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

interface TrailDetail {
  geometry: { type: "LineString"; coordinates: number[][] };
  distance: number | null;
  ascent: number | null;
  descent: number | null;
  duration: number | null;
}

interface SearchForm {
  destination: string;
  distanceMin: string;
  distanceMax: string;
  elevationMin: string;
  loop: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function networkLabel(n: string | null): string {
  if (n === "lwn") return "Local";
  if (n === "rwn") return "Régional";
  if (n === "nwn") return "National";
  if (n === "iwn") return "International";
  return "";
}

function exportGpx(geometry: TrailDetail["geometry"], name: string) {
  const trkpts = geometry.coordinates
    .map(
      (c) =>
        `      <trkpt lat="${c[1]}" lon="${c[0]}">${c.length > 2 ? `<ele>${c[2]}</ele>` : ""}</trkpt>`,
    )
    .join("\n");

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PeakLog" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeHtml(name)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
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

// ── Map component ───────────────────────────────────────────────────────────

function TrailMap({
  geometry,
}: {
  geometry: TrailDetail["geometry"];
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!token || geometry.coordinates.length === 0) return;

    async function initMap() {
      const maplibregl = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (!mapContainer.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Fetch style and strip projection to avoid MapLibre errors.
      const styleUrl = `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${token}`;
      let style: maplibregl.StyleSpecification | string = styleUrl;
      try {
        const styleRes = await fetch(styleUrl);
        if (styleRes.ok) {
          const json = await styleRes.json();
          delete json.projection;
          style = json as maplibregl.StyleSpecification;
        }
      } catch {
        // Fallback to URL.
      }

      const coords = geometry.coordinates;
      const mid = coords[Math.floor(coords.length / 2)];

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style,
        center: [mid[0], mid[1]],
        zoom: 12,
      });
      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl(), "top-right");
      map.on("styleimagemissing", () => {});

      map.on("load", () => {
        map.addSource("trail", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry },
        });

        map.addLayer({
          id: "trail-shadow",
          type: "line",
          source: "trail",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#000", "line-width": 7, "line-opacity": 0.3 },
        });

        map.addLayer({
          id: "trail-line",
          type: "line",
          source: "trail",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#d4a04a", "line-width": 4, "line-opacity": 0.9 },
        });

        // Start marker (green).
        const start = coords[0];
        new maplibregl.Marker({ color: "#22c55e" })
          .setLngLat([start[0], start[1]])
          .setPopup(new maplibregl.Popup().setHTML("<strong>Départ</strong>"))
          .addTo(map);

        // End marker (red).
        const end = coords[coords.length - 1];
        new maplibregl.Marker({ color: "#ef4444" })
          .setLngLat([end[0], end[1]])
          .setPopup(new maplibregl.Popup().setHTML("<strong>Arrivée</strong>"))
          .addTo(map);

        // Fit bounds.
        const bounds = new maplibregl.LngLatBounds();
        coords.forEach((c) => bounds.extend([c[0], c[1]]));
        map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      });
    }

    initMap();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [geometry]);

  return <div ref={mapContainer} className="h-full w-full rounded-xl" />;
}

// ── Trail card ──────────────────────────────────────────────────────────────

function TrailCard({
  trail,
  onSelect,
}: {
  trail: Trail;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="flex w-full items-start gap-4 rounded-xl border border-peak-border bg-peak-surface p-4 text-left transition-colors hover:border-amber-500/50 hover:bg-peak-surface-light"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forest-900 text-amber-400">
        <Route className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-peak-text">{trail.name}</p>
          {trail.ref && (
            <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-400">
              {trail.ref}
            </span>
          )}
          {trail.roundtrip && (
            <Repeat className="h-3.5 w-3.5 shrink-0 text-forest-500" aria-label="Boucle" />
          )}
        </div>
        {trail.description && (
          <p className="mt-0.5 line-clamp-1 text-sm text-peak-text-muted">
            {trail.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-peak-text-muted">
          {trail.distance && (
            <span className="flex items-center gap-1">
              <Mountain className="h-3 w-3" /> {trail.distance} km
            </span>
          )}
          {trail.ascent && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {trail.ascent} m D+
            </span>
          )}
          {trail.network && (
            <span className="rounded bg-peak-bg px-1.5 py-0.5">
              {networkLabel(trail.network)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

const initialForm: SearchForm = {
  destination: "",
  distanceMin: "",
  distanceMax: "",
  elevationMin: "",
  loop: false,
};

export default function PlanPage() {
  const [form, setForm] = useState<SearchForm>(initialForm);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [trailDetail, setTrailDetail] = useState<TrailDetail | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingTrail, setLoadingTrail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof SearchForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Filter trails based on form criteria.
  const filteredTrails = trails.filter((t) => {
    const minDist = form.distanceMin ? parseFloat(form.distanceMin) : 0;
    const maxDist = form.distanceMax ? parseFloat(form.distanceMax) : Infinity;
    const minElev = form.elevationMin ? parseFloat(form.elevationMin) : 0;

    if (t.distance && (t.distance < minDist || t.distance > maxDist)) return false;
    if (t.ascent && t.ascent < minElev) return false;
    if (form.loop && !t.roundtrip) return false;
    return true;
  });

  async function search() {
    if (!form.destination.trim()) {
      setError("Entrez une destination.");
      return;
    }
    setSearching(true);
    setError(null);
    setTrails([]);
    setSelectedTrail(null);
    setTrailDetail(null);

    try {
      const res = await fetch(API_ROUTES.TRAILS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", destination: form.destination }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error((data.error as string) ?? "Erreur de recherche.");
      if (Array.isArray(data.trails)) {
        setTrails(data.trails as Trail[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSearching(false);
    }
  }

  async function selectTrail(trail: Trail) {
    setSelectedTrail(trail);
    setLoadingTrail(true);
    setTrailDetail(null);
    setError(null);

    try {
      const res = await fetch(API_ROUTES.TRAILS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "geometry", id: trail.id }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error((data.error as string) ?? "Erreur de chargement.");

      setTrailDetail({
        geometry: data.geometry as TrailDetail["geometry"],
        distance: typeof data.distance === "number" ? data.distance : trail.distance,
        ascent: typeof data.ascent === "number" ? data.ascent : trail.ascent,
        descent: typeof data.descent === "number" ? data.descent : trail.descent,
        duration: typeof data.duration === "number" ? data.duration : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
      setSelectedTrail(null);
    } finally {
      setLoadingTrail(false);
    }
  }

  function goBack() {
    setSelectedTrail(null);
    setTrailDetail(null);
  }

  const inputClass =
    "w-full rounded-lg border border-peak-border bg-peak-surface px-4 py-2.5 text-peak-text placeholder:text-peak-text-muted focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600 transition-colors";
  const labelClass = "block text-sm font-medium text-peak-text-muted mb-1.5";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Trouver une randonnée</h1>
        <p className="mt-2 text-peak-text-muted">
          Recherchez de vraies randonnées balisées près de votre destination.
        </p>
      </div>

      {/* Search form */}
      <div className="mb-6 space-y-4 rounded-2xl border border-peak-border bg-peak-surface p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Destination <span aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              placeholder="Chamonix, Queyras, Vercors..."
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Distance min (km)</label>
            <input
              type="number"
              min="0"
              placeholder="5"
              value={form.distanceMin}
              onChange={(e) => update("distanceMin", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Distance max (km)</label>
            <input
              type="number"
              min="0"
              placeholder="20"
              value={form.distanceMax}
              onChange={(e) => update("distanceMax", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>D+ minimum (m)</label>
            <input
              type="number"
              min="0"
              placeholder="500"
              value={form.elevationMin}
              onChange={(e) => update("elevationMin", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-6 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-peak-text">
            <input
              type="checkbox"
              checked={form.loop}
              onChange={(e) => setForm((prev) => ({ ...prev, loop: e.target.checked }))}
              className="h-4 w-4 rounded border-peak-border accent-amber-500"
            />
            Boucle uniquement
          </label>

          <button
            onClick={search}
            disabled={searching}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-medium text-peak-bg transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {searching ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            {searching ? "Recherche..." : "Rechercher"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="mb-6 rounded-lg bg-rust-500/10 p-4 text-sm text-rust-400">
          {error}
        </div>
      )}

      {/* Loading search */}
      {searching && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-peak-border bg-peak-surface">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
            <p className="text-sm text-peak-text-muted">
              Recherche de randonnées près de {form.destination}...
            </p>
          </div>
        </div>
      )}

      {/* Trail detail view */}
      {selectedTrail && (
        <div className="space-y-6">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-sm text-peak-text-muted transition-colors hover:text-peak-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux résultats
          </button>

          {/* Trail header + stats */}
          <div className="rounded-2xl border border-peak-border bg-peak-surface p-6">
            <h2 className="font-display text-xl font-bold">
              {selectedTrail.name}
              {selectedTrail.ref && (
                <span className="ml-2 text-base text-amber-400">{selectedTrail.ref}</span>
              )}
            </h2>
            {selectedTrail.description && (
              <p className="mt-1 text-sm text-peak-text-muted">{selectedTrail.description}</p>
            )}

            {trailDetail && (
              <div className="mt-4 flex flex-wrap gap-4">
                {trailDetail.distance && (
                  <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-bg px-4 py-2.5">
                    <Mountain className="h-4 w-4 text-forest-500" />
                    <span className="text-sm font-medium">{trailDetail.distance} km</span>
                  </div>
                )}
                {trailDetail.ascent && (
                  <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-bg px-4 py-2.5">
                    <TrendingUp className="h-4 w-4 text-forest-500" />
                    <span className="text-sm font-medium">{trailDetail.ascent} m D+</span>
                  </div>
                )}
                {trailDetail.descent && (
                  <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-bg px-4 py-2.5">
                    <TrendingUp className="h-4 w-4 rotate-180 text-forest-500" />
                    <span className="text-sm font-medium">{trailDetail.descent} m D-</span>
                  </div>
                )}
                {trailDetail.duration && (
                  <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-bg px-4 py-2.5">
                    <Clock className="h-4 w-4 text-forest-500" />
                    <span className="text-sm font-medium">
                      {Math.floor(trailDetail.duration / 60)}h
                      {trailDetail.duration % 60 > 0
                        ? `${(trailDetail.duration % 60).toString().padStart(2, "0")}`
                        : ""}
                    </span>
                  </div>
                )}
                {selectedTrail.roundtrip && (
                  <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-bg px-4 py-2.5">
                    <Repeat className="h-4 w-4 text-forest-500" />
                    <span className="text-sm font-medium">Boucle</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Map */}
          {loadingTrail && (
            <div className="flex h-96 items-center justify-center rounded-2xl border border-peak-border bg-peak-surface">
              <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
            </div>
          )}
          {trailDetail && (
            <>
              <div className="h-[500px] overflow-hidden rounded-2xl border border-peak-border">
                <TrailMap geometry={trailDetail.geometry} />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => exportGpx(trailDetail.geometry, selectedTrail.name)}
                  className="flex items-center gap-2 rounded-xl bg-forest-800 px-4 py-2.5 text-sm font-medium text-forest-200 transition-colors hover:bg-forest-700"
                >
                  <Download className="h-4 w-4" />
                  Exporter GPX
                </button>
                <a
                  href={`https://www.openstreetmap.org/relation/${selectedTrail.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-peak-border px-4 py-2.5 text-sm text-peak-text-muted transition-colors hover:bg-peak-surface-light"
                >
                  <MapPin className="h-4 w-4" />
                  Voir sur OpenStreetMap
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* Search results list */}
      {!selectedTrail && !searching && trails.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-peak-text-muted">
              {filteredTrails.length} randonnée{filteredTrails.length > 1 ? "s" : ""} trouvée{filteredTrails.length > 1 ? "s" : ""}
              {filteredTrails.length !== trails.length && ` (sur ${trails.length} au total)`}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTrails.map((trail) => (
              <TrailCard
                key={trail.id}
                trail={trail}
                onSelect={() => selectTrail(trail)}
              />
            ))}
          </div>
          {filteredTrails.length === 0 && trails.length > 0 && (
            <div className="rounded-xl border border-peak-border bg-peak-surface p-6 text-center text-sm text-peak-text-muted">
              Aucune randonnée ne correspond aux filtres. Essayez d&apos;élargir vos critères.
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {!selectedTrail && !searching && trails.length === 0 && !error && form.destination && (
        <div className="rounded-xl border border-peak-border bg-peak-surface p-6 text-center text-sm text-peak-text-muted">
          Aucune randonnée trouvée. Essayez une autre destination ou un rayon plus large.
        </div>
      )}

      {/* Empty state */}
      {!selectedTrail && !searching && trails.length === 0 && !error && !form.destination && (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-peak-border bg-peak-surface text-peak-text-muted">
          <Search className="mb-3 h-10 w-10" />
          <p className="text-center text-sm">
            Entrez une destination pour trouver
            <br />
            des randonnées balisées à proximité.
          </p>
        </div>
      )}
    </div>
  );
}
