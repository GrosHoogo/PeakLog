import Link from "next/link";
import {
  Mountain,
  Clock,
  TrendingUp,
  Calendar,
  ArrowRight,
} from "lucide-react";
import type { Hike, Difficulty } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const difficultyColors: Record<Difficulty, string> = {
  easy: "bg-forest-600/20 text-forest-400",
  moderate: "bg-amber-500/20 text-amber-400",
  hard: "bg-rust-500/20 text-rust-400",
  expert: "bg-red-500/20 text-red-400",
};

const difficultyLabels: Record<Difficulty, string> = {
  easy: "Facile",
  moderate: "Modéré",
  hard: "Difficile",
  expert: "Expert",
};

export function HikeCard({ hike }: { hike: Hike }) {
  const hours = Math.floor(hike.duration_min / 60);
  const mins = hike.duration_min % 60;

  return (
    <Link
      href={`/journal/${hike.id}`}
      className="group flex flex-col rounded-2xl border border-peak-border bg-peak-surface p-5 transition-all hover:border-forest-700 hover:bg-peak-surface-light"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="font-display text-lg font-semibold leading-tight group-hover:text-amber-400 transition-colors">
          {hike.name}
        </h3>
        <ArrowRight className="h-4 w-4 shrink-0 text-peak-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-peak-text-muted">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {format(new Date(hike.date), "d MMM yyyy", { locale: fr })}
        </span>
        <span className="flex items-center gap-1">
          <Mountain className="h-3.5 w-3.5" />
          {hike.distance_km} km
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" />
          {hike.elevation_m} m D+
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {hours}h{mins > 0 ? `${mins.toString().padStart(2, "0")}` : ""}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyColors[hike.difficulty]}`}
        >
          {difficultyLabels[hike.difficulty]}
        </span>
        {hike.source !== "manual" && (
          <span className="rounded-full bg-peak-surface-light px-2.5 py-0.5 text-xs text-peak-text-muted">
            {hike.source === "strava" ? "Strava" : "Apple Health"}
          </span>
        )}
      </div>

      {hike.tags && hike.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {hike.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-forest-900/50 px-2 py-0.5 text-xs text-forest-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
