"use client";

import { useEffect, useRef, useState } from "react";
import { useHikes } from "@/hooks/use-hikes";
import { MapPin } from "lucide-react";

/** Escapes special HTML characters to prevent XSS in popup content. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function MapPage() {
  const { hikes } = useHikes();
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hikesWithCoords = hikes.filter((h) => h.lat != null && h.lng != null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!token) {
      setError("Clé Maptiler non configurée (NEXT_PUBLIC_MAPTILER_KEY).");
      return;
    }

    let map: import("maplibre-gl").Map | null = null;

    async function initMap() {
      let maplibregl: typeof import("maplibre-gl");
      try {
        maplibregl = await import("maplibre-gl");
        await import("maplibre-gl/dist/maplibre-gl.css");
      } catch {
        setError("Impossible de charger la carte. Vérifiez votre connexion.");
        return;
      }

      if (!mapContainer.current) return;

      map = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${token}`,
        center: [2.3, 46.5],
        zoom: 5,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      map.on("load", () => {
        setMapLoaded(true);

        hikesWithCoords.forEach((hike) => {
          const safeName = escapeHtml(hike.name);
          const safeDist = escapeHtml(String(hike.distance_km));
          const safeElev = escapeHtml(String(hike.elevation_m));

          const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div style="color:#1a1a18;font-family:sans-serif">
              <strong>${safeName}</strong><br/>
              <span style="font-size:12px">${safeDist} km · ${safeElev} m D+</span>
            </div>`,
          );

          new maplibregl.Marker({
            color: hike.source === "strava" ? "#FC4C02" : "#d4a04a",
          })
            .setLngLat([hike.lng!, hike.lat!])
            .setPopup(popup)
            .addTo(map!);
        });
      });
    }

    initMap().catch(() => setError("Erreur lors du chargement de la carte."));

    return () => {
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hikesWithCoords.length]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="mb-4 font-display text-3xl font-bold">
          Carte des aventures
        </h1>
        <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-peak-border bg-peak-surface">
          <MapPin className="mb-4 h-12 w-12 text-peak-text-muted" />
          <p className="text-peak-text-muted">{error}</p>
          <p className="mt-2 text-sm text-peak-text-muted">
            Ajoutez NEXT_PUBLIC_MAPTILER_KEY dans .env.local
          </p>

          {/* Fallback: liste des localisations */}
          <div className="mt-6 w-full max-w-md space-y-2 px-6">
            {hikesWithCoords.map((hike) => (
              <div
                key={hike.id}
                className="flex items-center gap-3 rounded-lg bg-peak-surface-light p-3 text-sm"
              >
                <MapPin className="h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="font-medium">{hike.name}</p>
                  <p className="text-xs text-peak-text-muted">
                    {hike.lat?.toFixed(4)}, {hike.lng?.toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-peak-border px-4 py-4 sm:px-6">
        <h1 className="font-display text-2xl font-bold">Carte des aventures</h1>
        <p className="text-sm text-peak-text-muted">
          {hikesWithCoords.length} points de rando
        </p>
      </div>
      <div ref={mapContainer} className="flex-1" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-peak-bg/50 pt-16">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent"
            aria-label="Chargement de la carte"
          />
        </div>
      )}
    </div>
  );
}
