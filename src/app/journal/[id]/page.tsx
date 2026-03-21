"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mountain,
  Clock,
  TrendingUp,
  Calendar,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { demoHikes } from "@/lib/demo-data";
import type { Difficulty } from "@/lib/types";

const difficultyLabels: Record<Difficulty, string> = {
  easy: "Facile",
  moderate: "Modéré",
  hard: "Difficile",
  expert: "Expert",
};

const difficultyColors: Record<Difficulty, string> = {
  easy: "bg-forest-600/20 text-forest-400",
  moderate: "bg-amber-500/20 text-amber-400",
  hard: "bg-rust-500/20 text-rust-400",
  expert: "bg-red-500/20 text-red-400",
};

export default function HikeDetailPage() {
  const params = useParams<{ id: string }>();
  const hike = demoHikes.find((h) => h.id === params.id);

  if (!hike) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/journal"
          className="mb-4 inline-flex items-center gap-2 text-sm text-peak-text-muted hover:text-peak-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au journal
        </Link>
        <p className="text-peak-text-muted">Randonnée introuvable.</p>
      </div>
    );
  }

  const hours = Math.floor(hike.duration_min / 60);
  const mins = hike.duration_min % 60;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/journal"
        className="mb-6 inline-flex items-center gap-2 text-sm text-peak-text-muted transition-colors hover:text-peak-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au journal
      </Link>

      <div className="rounded-2xl border border-peak-border bg-peak-surface p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              {hike.name}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-peak-text-muted">
              <Calendar className="h-4 w-4" />
              {format(new Date(hike.date), "EEEE d MMMM yyyy", {
                locale: fr,
              })}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${difficultyColors[hike.difficulty]}`}
          >
            {difficultyLabels[hike.difficulty]}
          </span>
        </div>

        {/* Stats grid */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              icon: Mountain,
              label: "Distance",
              value: `${hike.distance_km} km`,
            },
            {
              icon: TrendingUp,
              label: "Dénivelé",
              value: `${hike.elevation_m} m`,
            },
            {
              icon: Clock,
              label: "Durée",
              value: `${hours}h${mins > 0 ? mins.toString().padStart(2, "0") : ""}`,
            },
            {
              icon: MapPin,
              label: "Source",
              value:
                hike.source === "manual"
                  ? "Manuel"
                  : hike.source === "strava"
                    ? "Strava"
                    : "Apple Health",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-peak-surface-light p-4"
            >
              <stat.icon className="mb-1 h-4 w-4 text-forest-500" />
              <p className="text-xs text-peak-text-muted">{stat.label}</p>
              <p className="text-lg font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Notes */}
        {hike.notes && (
          <div className="mb-6">
            <h2 className="mb-2 font-display text-lg font-semibold">Notes</h2>
            <p className="leading-relaxed text-peak-text-muted">{hike.notes}</p>
          </div>
        )}

        {/* Tags */}
        {hike.tags && hike.tags.length > 0 && (
          <div>
            <h2 className="mb-2 font-display text-lg font-semibold">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {hike.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-forest-900/50 px-3 py-1 text-sm text-forest-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
