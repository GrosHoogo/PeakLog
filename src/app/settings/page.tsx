"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  User,
  Link2,
  Heart,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

function SettingsContent() {
  const searchParams = useSearchParams();
  const stravaConnected = searchParams.get("strava") === "connected";

  function connectStrava() {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      alert(
        "Configurez STRAVA_CLIENT_ID et NEXT_PUBLIC_STRAVA_REDIRECT_URI dans .env.local",
      );
      return;
    }

    const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=activity:read_all&approval_prompt=auto`;
    window.location.href = url;
  }

  const sectionClass =
    "rounded-2xl border border-peak-border bg-peak-surface p-6";

  return (
    <div className="space-y-6">
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
          <div className="flex items-center gap-2 text-sm text-forest-400">
            <CheckCircle className="h-4 w-4" />
            Connecté
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
