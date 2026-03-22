"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  Mountain,
  TrendingUp,
  MapPin,
  ExternalLink,
  Route,
  Repeat,
  ArrowUpDown,
} from "lucide-react";
import { API_ROUTES } from "@/lib/api-routes";

// ── Types ───────────────────────────────────────────────────────────────────

interface SuggestedTrail {
  name: string;
  zone: string | null;
  distance: number | null;
  elevation: number | null;
  difficulty: string | null;
  type: string | null;
  description: string | null;
  source: string | null;
  url: string | null;
}

interface SearchForm {
  destination: string;
  distance: string;
  region: string;
  elevation: string;
  difficulty: string;
  type: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function difficultyColor(d: string | null): string {
  if (!d) return "bg-peak-border text-peak-text-muted";
  const lower = d.toLowerCase();
  if (lower.includes("facile") || lower === "easy") return "bg-emerald-500/20 text-emerald-400";
  if (lower.includes("modér") || lower === "moderate") return "bg-amber-500/20 text-amber-400";
  if (lower.includes("difficile") || lower === "hard") return "bg-orange-500/20 text-orange-400";
  if (lower.includes("expert")) return "bg-red-500/20 text-red-400";
  return "bg-peak-border text-peak-text-muted";
}

function sourceLabel(source: string | null): string {
  if (!source) return "";
  const lower = source.toLowerCase();
  if (lower.includes("alltrails")) return "AllTrails";
  if (lower.includes("visorando")) return "Visorando";
  if (lower.includes("komoot")) return "Komoot";
  return source;
}

function typeIcon(type: string | null) {
  if (!type) return null;
  const lower = type.toLowerCase();
  if (lower.includes("boucle") || lower === "loop") return <Repeat className="h-3.5 w-3.5" />;
  if (lower.includes("aller") || lower.includes("out")) return <ArrowUpDown className="h-3.5 w-3.5" />;
  if (lower.includes("point") || lower.includes("traversée")) return <Route className="h-3.5 w-3.5" />;
  return null;
}

// ── Trail card ──────────────────────────────────────────────────────────────

function TrailCard({ trail }: { trail: SuggestedTrail }) {
  const hasLink = !!trail.url;

  const card = (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-peak-border bg-peak-surface p-5 transition-colors hover:border-amber-500/50 hover:bg-peak-surface-light">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-peak-text">
            {trail.name}
          </h3>
          {trail.zone && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-peak-text-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {trail.zone}
            </p>
          )}
        </div>
        {trail.difficulty && (
          <span
            className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${difficultyColor(trail.difficulty)}`}
          >
            {trail.difficulty}
          </span>
        )}
      </div>

      {trail.description && (
        <p className="text-sm leading-relaxed text-peak-text-muted">
          {trail.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {trail.distance != null && (
          <span className="flex items-center gap-1.5 rounded-lg bg-peak-bg px-2.5 py-1 text-peak-text">
            <Mountain className="h-3.5 w-3.5 text-forest-500" />
            {trail.distance} km
          </span>
        )}
        {trail.elevation != null && (
          <span className="flex items-center gap-1.5 rounded-lg bg-peak-bg px-2.5 py-1 text-peak-text">
            <TrendingUp className="h-3.5 w-3.5 text-forest-500" />
            {trail.elevation} m D+
          </span>
        )}
        {trail.type && (
          <span className="flex items-center gap-1.5 rounded-lg bg-peak-bg px-2.5 py-1 text-peak-text">
            {typeIcon(trail.type)}
            {trail.type}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-peak-border pt-3">
        {trail.source && (
          <span className="rounded bg-forest-900 px-2 py-0.5 text-xs font-medium text-forest-300">
            {sourceLabel(trail.source)}
          </span>
        )}
        {hasLink && (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            Voir la randonnée
            <ExternalLink className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );

  if (hasLink) {
    return (
      <a
        href={trail.url!}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {card}
      </a>
    );
  }

  return card;
}

// ── Main page ───────────────────────────────────────────────────────────────

const initialForm: SearchForm = {
  destination: "",
  distance: "",
  region: "",
  elevation: "",
  difficulty: "any",
  type: "any",
};

export default function PlanPage() {
  const [form, setForm] = useState<SearchForm>(initialForm);
  const [trails, setTrails] = useState<SuggestedTrail[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  function update(field: keyof SearchForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function search() {
    if (!form.destination.trim()) {
      setError("Entrez un lieu de référence.");
      return;
    }
    setSearching(true);
    setError(null);
    setTrails([]);
    setHasSearched(true);

    try {
      const res = await fetch(API_ROUTES.PLAN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: form.destination,
          distance: form.distance,
          region: form.region,
          elevation: form.elevation,
          difficulty: form.difficulty,
          type: form.type,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok)
        throw new Error((data.error as string) ?? "Erreur de recherche.");
      if (Array.isArray(data.trails)) {
        setTrails(data.trails as SuggestedTrail[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSearching(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-peak-border bg-peak-surface px-4 py-2.5 text-peak-text placeholder:text-peak-text-muted focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600 transition-colors";
  const labelClass = "block text-sm font-medium text-peak-text-muted mb-1.5";
  const selectClass =
    "w-full rounded-lg border border-peak-border bg-peak-surface px-4 py-2.5 text-peak-text focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600 transition-colors";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Planificateur</h1>
        <p className="mt-2 text-peak-text-muted">
          Trouvez de vraies randonnées référencées sur AllTrails, Visorando et
          Komoot.
        </p>
      </div>

      {/* Search form */}
      <div className="mb-6 space-y-4 rounded-2xl border border-peak-border bg-peak-surface p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>
              Lieu de référence <span className="text-rust-400">*</span>
            </label>
            <input
              type="text"
              placeholder="ex: Pilat, Vercors, Mont Blanc..."
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Distance (km)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="ex: 12"
              value={form.distance}
              onChange={(e) => update("distance", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Région{" "}
              <span className="font-normal text-peak-text-muted">
                optionnel
              </span>
            </label>
            <input
              type="text"
              placeholder="ex: Auvergne-Rhône-Alpes"
              value={form.region}
              onChange={(e) => update("region", e.target.value)}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Dénivelé + (m){" "}
              <span className="font-normal text-peak-text-muted">
                optionnel
              </span>
            </label>
            <input
              type="number"
              min="0"
              placeholder="ex: 600"
              value={form.elevation}
              onChange={(e) => update("elevation", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Difficulté{" "}
              <span className="font-normal text-peak-text-muted">
                optionnel
              </span>
            </label>
            <select
              value={form.difficulty}
              onChange={(e) => update("difficulty", e.target.value)}
              className={selectClass}
            >
              <option value="any">Peu importe</option>
              <option value="easy">Facile</option>
              <option value="moderate">Modéré</option>
              <option value="hard">Difficile</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Type{" "}
              <span className="font-normal text-peak-text-muted">
                optionnel
              </span>
            </label>
            <select
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className={selectClass}
            >
              <option value="any">Peu importe</option>
              <option value="loop">Boucle</option>
              <option value="out-and-back">Aller-retour</option>
              <option value="point-to-point">Point à point</option>
            </select>
          </div>
        </div>

        <div className="flex items-center pt-1">
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
            {searching ? "Recherche IA en cours..." : "Rechercher"}
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

      {/* Loading */}
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

      {/* Results */}
      {!searching && trails.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-peak-text-muted">
            {trails.length} randonnée
            {trails.length > 1 ? "s" : ""} trouvée
            {trails.length > 1 ? "s" : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trails.map((trail, i) => (
              <TrailCard key={`${trail.name}-${i}`} trail={trail} />
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {!searching && hasSearched && trails.length === 0 && !error && (
        <div className="rounded-xl border border-peak-border bg-peak-surface p-6 text-center text-sm text-peak-text-muted">
          Aucune randonnée trouvée. Essayez avec d&apos;autres critères.
        </div>
      )}

      {/* Empty state */}
      {!searching && !hasSearched && (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-peak-border bg-peak-surface text-peak-text-muted">
          <Search className="mb-3 h-10 w-10" />
          <p className="text-center text-sm">
            Entrez un lieu et vos critères pour trouver
            <br />
            des randonnées existantes près de chez vous.
          </p>
        </div>
      )}
    </div>
  );
}
