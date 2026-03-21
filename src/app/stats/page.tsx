"use client";

import dynamic from "next/dynamic";
import {
  Mountain,
  TrendingUp,
  Calendar,
  Flame,
  Trophy,
  Clock,
} from "lucide-react";
import { demoHikes } from "@/lib/demo-data";

const difficultyColors: Record<string, string> = {
  easy: "#5a7a52",
  moderate: "#d4a04a",
  hard: "#c46a3f",
  expert: "#ef4444",
};

const difficultyLabels: Record<string, string> = {
  easy: "Facile",
  moderate: "Modéré",
  hard: "Difficile",
  expert: "Expert",
};

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jul",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

// Lazy-load Recharts to reduce initial bundle size (~200 KB saved on first load).
const StatsCharts = dynamic(
  () =>
    import("@/components/stats-charts").then((m) => ({
      default: m.StatsCharts,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl bg-peak-surface" />
        <div className="h-80 animate-pulse rounded-2xl bg-peak-surface" />
      </div>
    ),
  },
);

export default function StatsPage() {
  const totalKm = demoHikes.reduce((acc, h) => acc + h.distance_km, 0);
  const totalElevation = demoHikes.reduce((acc, h) => acc + h.elevation_m, 0);
  const totalDuration = demoHikes.reduce((acc, h) => acc + h.duration_min, 0);
  const totalHours = Math.floor(totalDuration / 60);

  // Monthly data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthHikes = demoHikes.filter(
      (h) => new Date(h.date).getMonth() + 1 === month,
    );
    return {
      month: MONTH_LABELS[i] ?? "",
      sorties: monthHikes.length,
      km:
        Math.round(monthHikes.reduce((acc, h) => acc + h.distance_km, 0) * 10) /
        10,
    };
  });

  // Difficulty distribution — explicit generic avoids implicit-any in callback.
  const difficultyMap = demoHikes.reduce<Record<string, number>>((acc, h) => {
    acc[h.difficulty] = (acc[h.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  const difficultyData = Object.entries(difficultyMap).map(([key, value]) => ({
    name: difficultyLabels[key] ?? key,
    value,
    color: difficultyColors[key] ?? "#666",
  }));

  // Best hikes
  const bestDistance = [...demoHikes].sort(
    (a, b) => b.distance_km - a.distance_km,
  )[0];
  const bestElevation = [...demoHikes].sort(
    (a, b) => b.elevation_m - a.elevation_m,
  )[0];

  const stats = [
    {
      icon: Mountain,
      label: "Distance totale",
      value: `${totalKm.toFixed(1)} km`,
    },
    {
      icon: TrendingUp,
      label: "Dénivelé cumulé",
      value: `${totalElevation.toLocaleString()} m`,
    },
    { icon: Calendar, label: "Sorties", value: `${demoHikes.length}` },
    { icon: Clock, label: "Heures de marche", value: `${totalHours}h` },
    {
      icon: Trophy,
      label: "Plus longue",
      value: bestDistance?.name ?? "-",
    },
    {
      icon: Flame,
      label: "Plus de D+",
      value: bestElevation?.name ?? "-",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 font-display text-3xl font-bold">Statistiques</h1>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-peak-border bg-peak-surface p-4"
          >
            <stat.icon className="mb-2 h-5 w-5 text-forest-500" />
            <p className="text-xs text-peak-text-muted">{stat.label}</p>
            <p className="mt-1 truncate text-lg font-bold leading-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts — lazy loaded */}
      <StatsCharts monthlyData={monthlyData} difficultyData={difficultyData} />
    </div>
  );
}
