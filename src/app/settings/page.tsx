"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  User,
  Link2,
  Heart,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useHikes } from "@/hooks/use-hikes";
import type { Hike } from "@/lib/types";

/** Infers a difficulty from elevation and distance. */
function inferDifficulty(
  elevation: number,
  distance: number,
): Hike["difficulty"] {
  const effort = elevation / Math.max(distance, 1);
  if (effort > 120 || elevation > 1500) return "expert";
  if (effort > 80 || elevation > 1000) return "hard";
  if (effort > 40 || elevation > 400) return "moderate";
  return "easy";
}

/** Reads a cookie value by name from document.cookie. */
function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("strava") === "connected";
  const error = searchParams.get("error");

  const [stravaConnected, setStravaConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const { addHikes } = useHikes();

  useEffect(() => {
    // Check cookie for persistent Strava state.
    if (justConnected || getCookie("strava_connected") === "true") {
      setStravaConnected(true);
    }
  }, [justConnected]);

  function connectStrava() {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      alert(
        "Configurez NEXT_PUBLIC_STRAVA_CLIENT_ID et NEXT_PUBLIC_STRAVA_REDIRECT_URI dans .env.local",
      );
      return;
    }

    const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=activity:read_all&approval_prompt=auto`;
    window.location.href = url;
  }

  async function syncStrava() {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/strava/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setSyncResult(data.error ?? "Erreur de synchronisation.");
        return;
      }

      // Convert partial Strava hikes to full Hike objects and store locally.
      const now = new Date().toISOString();
      const fullHikes: Hike[] = (data.hikes ?? []).map(
        (h: {
          name: string;
          date: string;
          distance_km: number;
          elevation_m: number;
          duration_min: number;
          source: "strava";
          external_id: string;
          lat: number | null;
          lng: number | null;
        }) => ({
          id: h.external_id,
          user_id: "local",
          name: h.name,
          date: h.date,
          distance_km: h.distance_km,
          elevation_m: h.elevation_m,
          duration_min: h.duration_min,
          difficulty: inferDifficulty(h.elevation_m, h.distance_km),
          notes: null,
          gpx_data: null,
          source: h.source,
          external_id: h.external_id,
          lat: h.lat,
          lng: h.lng,
          tags: null,
          created_at: now,
        }),
      );

      addHikes(fullHikes);

      setSyncResult(
        `${data.synced} randonnée${data.synced > 1 ? "s" : ""} synchronisée${data.synced > 1 ? "s" : ""} sur ${data.total} activités.`,
      );
    } catch {
      setSyncResult("Erreur de connexion au serveur.");
    } finally {
      setSyncing(false);
    }
  }

  const sectionClass =
    "rounded-2xl border border-peak-border bg-peak-surface p-6";

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rust-500/10 p-4 text-sm text-rust-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error === "token_exchange"
            ? "Échec de la connexion Strava. Réessayez."
            : error === "no_code"
              ? "Code d'autorisation manquant."
              : "Une erreur est survenue."}
        </div>
      )}

      {/* Profile */}
      <div className={sectionClass}>
        <div className="mb-4 flex items-center gap-3">
          <User className="h-5 w-5 text-forest-500" />
          <h2 className="font-display text-lg font-semibold">Profil</h2>
        </div>
        <p className="text-sm text-peak-text-muted">
          Connectez-vous avec Supabase Auth pour sauvegarder vos données.
          Configurez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
          dans .env.local.
        </p>
      </div>

      {/* Strava */}
      <div className={sectionClass}>
        <div className="mb-4 flex items-center gap-3">
          <Link2 className="h-5 w-5 text-forest-500" />
          <h2 className="font-display text-lg font-semibold">Strava</h2>
        </div>

        {stravaConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-forest-400">
              <CheckCircle className="h-4 w-4" />
              Connecté
            </div>
            <button
              onClick={syncStrava}
              disabled={syncing}
              className="flex items-center gap-2 rounded-xl bg-[#FC4C02] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {syncing ? "Synchronisation..." : "Synchroniser mes activités"}
            </button>
            {syncResult && (
              <p className="text-sm text-peak-text-muted">{syncResult}</p>
            )}
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-peak-text-muted">
              Synchronisez automatiquement vos randonnées depuis Strava.
            </p>
            <button
              onClick={connectStrava}
              className="flex items-center gap-2 rounded-xl bg-[#FC4C02] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" />
              Connecter Strava
            </button>
          </div>
        )}
      </div>

      {/* Apple Health */}
      <div className={sectionClass}>
        <div className="mb-4 flex items-center gap-3">
          <Heart className="h-5 w-5 text-forest-500" />
          <h2 className="font-display text-lg font-semibold">Apple Health</h2>
        </div>
        <p className="mb-4 text-sm text-peak-text-muted">
          Importez vos données de randonnée depuis Apple Health. Exportez vos
          données depuis l&apos;app Santé sur iOS (Réglages &gt; Santé &gt;
          Exporter les données), puis uploadez le fichier ici.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-peak-border px-5 py-2.5 text-sm font-medium text-peak-text transition-colors hover:bg-peak-surface-light">
            <input
              type="file"
              accept=".xml,.zip"
              className="hidden"
              onChange={() => {
                alert("Le parsing Apple Health sera disponible prochainement.");
              }}
            />
            Importer export.xml
          </label>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-peak-surface-light p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-peak-text-muted">
            Sur votre iPhone : Réglages &gt; Santé &gt; Exporter les données de
            santé. Le fichier .zip contient un export.xml avec toutes vos
            activités.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 font-display text-3xl font-bold">Paramètres</h1>
      <Suspense
        fallback={<div className="text-peak-text-muted">Chargement...</div>}
      >
        <SettingsContent />
      </Suspense>
    </div>
  );
}
