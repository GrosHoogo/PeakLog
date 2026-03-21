import Link from "next/link";
import {
  Mountain,
  Sparkles,
  BookOpen,
  BarChart3,
  Map,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Planificateur IA",
    description:
      "Claude vous prépare un itinéraire personnalisé : horaires, équipement, alertes météo.",
    href: "/plan",
  },
  {
    icon: BookOpen,
    title: "Journal de sorties",
    description:
      "Chaque rando mérite sa fiche : distance, dénivelé, photos, tracé GPX.",
    href: "/journal",
  },
  {
    icon: BarChart3,
    title: "Statistiques",
    description:
      "Visualisez votre progression : km cumulés, dénivelé, streak de sorties.",
    href: "/stats",
  },
  {
    icon: Map,
    title: "Carte mondiale",
    description:
      "Tous vos sommets sur une carte interactive. Filtrez par année ou difficulté.",
    href: "/map",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-forest-900/20 via-transparent to-transparent" />

        <Mountain className="mb-6 h-16 w-16 text-amber-400" />
        <h1 className="font-display text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
          Chaque sommet
          <br />
          <span className="text-amber-400">raconte une histoire</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-peak-text-muted">
          Planifiez vos randonnées avec l&apos;IA, tenez votre journal de
          sorties, suivez votre progression et connectez Strava.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/plan"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-medium text-peak-bg transition-colors hover:bg-amber-400"
          >
            <Sparkles className="h-5 w-5" />
            Planifier une rando
          </Link>
          <Link
            href="/journal"
            className="inline-flex items-center gap-2 rounded-xl border border-peak-border px-6 py-3 font-medium text-peak-text transition-colors hover:bg-peak-surface-light"
          >
            Mon journal
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-2xl border border-peak-border bg-peak-surface p-6 transition-all hover:border-forest-700 hover:bg-peak-surface-light"
            >
              <f.icon className="mb-4 h-8 w-8 text-forest-500 transition-colors group-hover:text-amber-400" />
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-peak-text-muted">
                {f.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
