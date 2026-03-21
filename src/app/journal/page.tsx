"use client";

import { useState, useMemo } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { HikeCard } from "@/components/hike-card";
import { useHikes } from "@/hooks/use-hikes";
import type { Difficulty } from "@/lib/types";

export default function JournalPage() {
  const { hikes } = useHikes();
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "all">(
    "all",
  );
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return hikes
      .filter((h) => {
        const matchesSearch =
          !search ||
          h.name.toLowerCase().includes(search.toLowerCase()) ||
          h.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));
        const matchesDifficulty =
          difficultyFilter === "all" || h.difficulty === difficultyFilter;
        return matchesSearch && matchesDifficulty;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [hikes, search, difficultyFilter]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Journal</h1>
          <p className="mt-1 text-peak-text-muted">
            {hikes.length} sortie{hikes.length > 1 ? "s" : ""} enregistrée
            {hikes.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/journal/new"
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-peak-bg transition-colors hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Nouvelle rando
        </Link>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-peak-text-muted" />
            <input
              type="text"
              placeholder="Rechercher par nom ou tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-peak-border bg-peak-surface py-2.5 pl-10 pr-4 text-sm text-peak-text placeholder:text-peak-text-muted focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
              showFilters
                ? "border-forest-600 bg-forest-900 text-forest-300"
                : "border-peak-border text-peak-text-muted hover:bg-peak-surface-light"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtres
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "Toutes"],
                ["easy", "Facile"],
                ["moderate", "Modéré"],
                ["hard", "Difficile"],
                ["expert", "Expert"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setDifficultyFilter(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  difficultyFilter === value
                    ? "bg-forest-600 text-white"
                    : "bg-peak-surface text-peak-text-muted hover:bg-peak-surface-light"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hike list */}
      {filtered.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-peak-text-muted">
          Aucune sortie trouvée.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((hike) => (
            <HikeCard key={hike.id} hike={hike} />
          ))}
        </div>
      )}
    </div>
  );
}
