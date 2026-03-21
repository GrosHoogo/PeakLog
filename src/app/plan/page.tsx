"use client";

import { useState } from "react";
import { Sparkles, Loader2, Save, RotateCcw } from "lucide-react";
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
};

/** Renders the IA-generated plan as safe text paragraphs — no innerHTML. */
function PlanText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-peak-text">
      {text.split("\n").map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}

export default function PlanPage() {
  const [form, setForm] = useState<PlanForm>(initialForm);
  const [plan, setPlan] = useState<string | null>(null);
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
    setPlan(null);

    try {
      const res = await fetch(API_ROUTES.PLAN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      let data: { plan?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error("Réponse invalide du serveur.");
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors de la génération du plan.");
      }
      if (typeof data.plan !== "string") {
        throw new Error("Réponse invalide du serveur.");
      }

      setPlan(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-peak-border bg-peak-surface px-4 py-2.5 text-peak-text placeholder:text-peak-text-muted focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600 transition-colors";
  const labelClass = "block text-sm font-medium text-peak-text-muted mb-1.5";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Planificateur IA</h1>
        <p className="mt-2 text-peak-text-muted">
          Décrivez votre rando, Claude prépare tout pour vous.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-5 rounded-2xl border border-peak-border bg-peak-surface p-6">
          <div>
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

          <div className="grid grid-cols-2 gap-4">
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
                step="1"
                value={form.participants}
                onChange={(e) => updateParticipants(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <label className={labelClass}>Niveau physique</label>
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
          </div>

          <div>
            <label className={labelClass}>Équipement disponible</label>
            <textarea
              placeholder="Bâtons, crampons, sac 40L..."
              value={form.equipment}
              onChange={(e) => update("equipment", e.target.value)}
              rows={2}
              maxLength={500}
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={generate}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-medium text-peak-bg transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {loading ? "Génération..." : "Générer le plan"}
            </button>
            <button
              onClick={() => {
                setForm(initialForm);
                setPlan(null);
                setError(null);
              }}
              className="rounded-xl border border-peak-border px-4 py-3 text-peak-text-muted transition-colors hover:bg-peak-surface-light"
              aria-label="Réinitialiser le formulaire"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-2xl border border-peak-border bg-peak-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Votre plan</h2>
            {plan && (
              <button
                className="flex items-center gap-1.5 rounded-lg bg-forest-800 px-3 py-1.5 text-sm text-forest-200 transition-colors hover:bg-forest-700"
                onClick={() => {
                  /* TODO: save plan to Supabase ai_plans table */
                }}
              >
                <Save className="h-4 w-4" />
                Sauvegarder
              </button>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-rust-500/10 p-4 text-sm text-rust-400"
            >
              {error}
            </div>
          )}

          {!plan && !error && !loading && (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-peak-text-muted">
              <p className="text-center text-sm">
                Remplissez le formulaire et laissez
                <br />
                l&apos;IA préparer votre aventure.
              </p>
              <p className="text-xs">
                Champ requis :{" "}
                <span className="text-peak-text">Destination</span>
              </p>
            </div>
          )}

          {loading && (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            </div>
          )}

          {plan && <PlanText text={plan} />}
        </div>
      </div>
    </div>
  );
}
