"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

const initialForm = {
  name: "",
  date: "",
  distance_km: "",
  elevation_m: "",
  duration_min: "",
  difficulty: "moderate",
  notes: "",
  tags: "",
};

type HikeForm = typeof initialForm;

export default function NewHikePage() {
  const router = useRouter();
  const [form, setForm] = useState<HikeForm>(initialForm);

  function update(field: keyof HikeForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: save to Supabase when connected
    alert(
      "Sauvegarde en base de données disponible une fois Supabase configuré.",
    );
    router.push("/journal");
  }

  const inputClass =
    "w-full rounded-lg border border-peak-border bg-peak-surface px-4 py-2.5 text-peak-text placeholder:text-peak-text-muted focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600 transition-colors";
  const labelClass = "block text-sm font-medium text-peak-text-muted mb-1.5";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/journal"
        className="mb-6 inline-flex items-center gap-2 text-sm text-peak-text-muted transition-colors hover:text-peak-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au journal
      </Link>

      <h1 className="mb-8 font-display text-3xl font-bold">
        Nouvelle randonnée
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>Nom de la randonnée *</label>
          <input
            type="text"
            required
            placeholder="Lac Blanc, Tour du Mont-Blanc..."
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Date *</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
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
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Distance (km)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="12.5"
              value={form.distance_km}
              onChange={(e) => update("distance_km", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dénivelé (m)</label>
            <input
              type="number"
              min="0"
              placeholder="800"
              value={form.elevation_m}
              onChange={(e) => update("elevation_m", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Durée (min)</label>
            <input
              type="number"
              min="0"
              placeholder="240"
              value={form.duration_min}
              onChange={(e) => update("duration_min", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            placeholder="Conditions, ambiance, points remarquables..."
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={4}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Tags (séparés par des virgules)</label>
          <input
            type="text"
            placeholder="lac, sommet, boucle, alpes..."
            value={form.tags}
            onChange={(e) => update("tags", e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-medium text-peak-bg transition-colors hover:bg-amber-400"
        >
          <Save className="h-5 w-5" />
          Enregistrer la randonnée
        </button>
      </form>
    </div>
  );
}
