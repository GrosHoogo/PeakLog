"use client";

import { useEffect, useRef, useState } from "react";
import { demoHikes } from "@/lib/demo-data";
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
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError("Token Mapbox non configuré (NEXT_PUBLIC_MAPBOX_TOKEN).");
      return;
    }

    let map: mapboxgl.Map | null = null;

    async function initMap() {
      let mapboxgl: typeof import("mapbox-gl").default;
      try {
        mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");
      } catch {
        setError("Impossible de charger Mapbox. Vérifiez votre connexion.");
        return;
      }

      if (!mapContainer.current) return;

      mapboxgl.accessToken = token!;
      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [2.3, 46.5],
        zoom: 5,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("load", () => {
        setMapLoaded(true);

        demoHikes
          .filter((h) => h.lat != null && h.lng != null)
          .forEach((hike) => {
            // All values are escaped before insertion into popup HTML.
            const safeName = escapeHtml(hike.name);
            const safeDist = escapeHtml(String(hike.distance_km));
            const safeElev = escapeHtml(String(hike.elevation_m));

            const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div style="color:#1a1a18;font-family:sans-serif">
                <strong>${safeName}</strong><br/>
                <span style="font-size:12px">${safeDist} km · ${safeElev} m D+</span>
              </div>`,
            );

            new mapboxgl.Marker({ color: "#d4a04a" })
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
  }, []);

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
            Ajoutez NEXT_PUBLIC_MAPBOX_TOKEN dans .env.local
          </p>

          {/* Fallback: list of locations */}
          <div className="mt-6 w-full max-w-md space-y-2 px-6">
            {demoHikes
              .filter((h) => h.lat && h.lng)
              .map((hike) => (
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
          {demoHikes.filter((h) => h.lat && h.lng).length} points de rando
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
