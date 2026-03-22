"use client";

import { useState } from "react";
import {
  Backpack,
  Loader2,
  AlertTriangle,
  Check,
  Mountain,
  TrendingUp,
  Clock,
  MapPin,
  Lightbulb,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Thermometer,
  Droplets,
} from "lucide-react";
import { API_ROUTES } from "@/lib/api-routes";

interface GearItem {
  name: string;
  quantity: string;
  essential: boolean;
  note?: string;
}

interface GearCategory {
  category: string;
  items: GearItem[];
}

interface WeatherData {
  tempMin: number;
  tempMax: number;
  precipitation: number;
  windMax: number;
  weatherCode: number;
}

function weatherIcon(code: number) {
  if (code === 0) return <Sun className="h-8 w-8 text-amber-400" />;
  if (code <= 3) return <Cloud className="h-8 w-8 text-gray-400" />;
  if (code <= 49) return <CloudFog className="h-8 w-8 text-gray-400" />;
  if (code <= 69) return <CloudRain className="h-8 w-8 text-blue-400" />;
  if (code <= 79) return <CloudSnow className="h-8 w-8 text-blue-200" />;
  if (code <= 86) return <CloudSnow className="h-8 w-8 text-blue-200" />;
  if (code >= 95) return <CloudLightning className="h-8 w-8 text-yellow-400" />;
  return <Cloud className="h-8 w-8 text-gray-400" />;
}

function weatherLabel(code: number): string {
  if (code === 0) return "Ciel dégagé";
  if (code <= 3) return "Partiellement nuageux";
  if (code <= 49) return "Brouillard";
  if (code <= 59) return "Bruine";
  if (code <= 69) return "Pluie";
  if (code <= 79) return "Neige";
  if (code <= 84) return "Averses";
  if (code <= 86) return "Averses de neige";
  if (code >= 95) return "Orage";
  return "Variable";
}

interface GearForm {
  destination: string;
  date: string;
  distance: string;
  elevation: string;
  difficulty: string;
  participants: string;
  duration: string;
}

const initialForm: GearForm = {
  destination: "",
  date: "",
  distance: "",
  elevation: "",
  difficulty: "moderate",
  participants: "1",
  duration: "",
};

export default function GearPage() {
  const [form, setForm] = useState<GearForm>(initialForm);
  const [gearList, setGearList] = useState<GearCategory[]>([]);
  const [tips, setTips] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  function update(field: keyof GearForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleItem(id: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function generate() {
    if (!form.destination.trim()) {
      setError("Entrez une destination.");
      return;
    }
    setLoading(true);
    setError(null);
    setGearList([]);
    setTips("");
    setWeather(null);
    setCheckedItems(new Set());

    try {
      const res = await fetch(API_ROUTES.GEAR, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        throw new Error("Réponse invalide du serveur.");
      }

      if (!res.ok) {
        throw new Error(
          (data.error as string) ?? "Erreur lors de la génération.",
        );
      }

      if (Array.isArray(data.gearList)) {
        setGearList(data.gearList as GearCategory[]);
      }
      if (typeof data.tips === "string") {
        setTips(data.tips);
      }
      if (data.weather && typeof data.weather === "object") {
        setWeather(data.weather as WeatherData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  const totalItems = gearList.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedCount = checkedItems.size;
  const essentialItems = gearList.reduce(
    (sum, cat) => sum + cat.items.filter((i) => i.essential).length,
    0,
  );
  const essentialChecked = gearList.reduce(
    (sum, cat) =>
      sum +
      cat.items.filter(
        (item, ii) => item.essential && checkedItems.has(`${cat.category}-${ii}`),
      ).length,
    0,
  );

  const inputClass =
    "w-full rounded-lg border border-peak-border bg-peak-surface px-4 py-2.5 text-peak-text placeholder:text-peak-text-muted focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600 transition-colors";
  const labelClass = "block text-sm font-medium text-peak-text-muted mb-1.5";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Préparer mon sac</h1>
        <p className="mt-2 text-peak-text-muted">
          Renseignez votre rando et l&apos;IA génère la liste complète du
          matériel à emporter.
        </p>
      </div>

      {/* Form */}
      <div className="mb-6 space-y-4 rounded-2xl border border-peak-border bg-peak-surface p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Destination <span aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              placeholder="Mont Ventoux, GR20 étape 3..."
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Date prévue</label>
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
              value={form.participants}
              onChange={(e) => update("participants", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Distance (km)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="13"
              value={form.distance}
              onChange={(e) => update("distance", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dénivelé D+ (m)</label>
            <input
              type="number"
              min="0"
              placeholder="700"
              value={form.elevation}
              onChange={(e) => update("elevation", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Durée estimée (h)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="5"
              value={form.duration}
              onChange={(e) => update("duration", e.target.value)}
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

        <div className="flex gap-3 pt-1">
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-medium text-peak-bg transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Backpack className="h-5 w-5" />
            )}
            {loading ? "Génération en cours..." : "Générer ma liste"}
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
      {loading && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-peak-border bg-peak-surface">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
            <p className="text-sm text-peak-text-muted">
              Préparation de votre liste de matériel...
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {gearList.length > 0 && (
        <div className="space-y-6">
          {/* Stats bar */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-surface px-4 py-2.5">
              <Backpack className="h-4 w-4 text-forest-500" />
              <span className="text-sm font-medium">
                {checkedCount}/{totalItems} items cochés
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-surface px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium">
                {essentialChecked}/{essentialItems} essentiels
              </span>
            </div>
            {form.distance && (
              <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-surface px-4 py-2.5">
                <Mountain className="h-4 w-4 text-forest-500" />
                <span className="text-sm font-medium">{form.distance} km</span>
              </div>
            )}
            {form.elevation && (
              <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-surface px-4 py-2.5">
                <TrendingUp className="h-4 w-4 text-forest-500" />
                <span className="text-sm font-medium">
                  {form.elevation} m D+
                </span>
              </div>
            )}
            {form.duration && (
              <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-surface px-4 py-2.5">
                <Clock className="h-4 w-4 text-forest-500" />
                <span className="text-sm font-medium">{form.duration}h</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-peak-border bg-peak-surface px-4 py-2.5">
              <MapPin className="h-4 w-4 text-forest-500" />
              <span className="text-sm font-medium">{form.destination}</span>
            </div>
          </div>

          {/* Weather card */}
          {weather && (
            <div className="rounded-2xl border border-peak-border bg-peak-surface p-5">
              <div className="flex items-center gap-5">
                {weatherIcon(weather.weatherCode)}
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-peak-text">
                    Météo prévue — {form.destination}
                  </h3>
                  <p className="text-lg font-bold text-peak-text">
                    {weatherLabel(weather.weatherCode)}
                  </p>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="h-4 w-4 text-red-400" />
                    <span className="text-peak-text">
                      {weather.tempMin}° / {weather.tempMax}°C
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Droplets className="h-4 w-4 text-blue-400" />
                    <span className="text-peak-text">
                      {weather.precipitation} mm
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wind className="h-4 w-4 text-gray-400" />
                    <span className="text-peak-text">
                      {weather.windMax} km/h
                    </span>
                  </div>
                </div>
              </div>
              {/* Weather warnings */}
              {(weather.precipitation > 10 ||
                weather.tempMin < 0 ||
                weather.windMax > 50) && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-xs text-amber-300">
                    {weather.precipitation > 10 && "Fortes pluies prévues. "}
                    {weather.tempMin < 0 && "Températures négatives. "}
                    {weather.windMax > 50 && "Vent fort prévu. "}
                    Vérifiez les conditions avant de partir.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Progress bar */}
          {totalItems > 0 && (
            <div className="overflow-hidden rounded-full bg-peak-surface">
              <div
                className="h-2 rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${(checkedCount / totalItems) * 100}%` }}
              />
            </div>
          )}

          {/* Gear categories */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gearList.map((cat, ci) => (
              <div
                key={ci}
                className="rounded-2xl border border-peak-border bg-peak-surface p-5"
              >
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">
                  {cat.category}
                </h3>
                <ul className="space-y-2">
                  {cat.items.map((item, ii) => {
                    const id = `${cat.category}-${ii}`;
                    const checked = checkedItems.has(id);
                    return (
                      <li key={ii}>
                        <button
                          onClick={() => toggleItem(id)}
                          className={`flex w-full items-start gap-3 rounded-lg p-2 text-left text-sm transition-colors hover:bg-peak-bg ${
                            checked ? "opacity-50" : ""
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              checked
                                ? "border-forest-500 bg-forest-500 text-white"
                                : item.essential
                                  ? "border-amber-400 text-amber-400"
                                  : "border-peak-border text-transparent"
                            }`}
                          >
                            {checked ? (
                              <Check className="h-3 w-3" />
                            ) : item.essential ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : null}
                          </span>
                          <span className="flex-1">
                            <span
                              className={`${
                                checked
                                  ? "line-through"
                                  : item.essential
                                    ? "font-medium text-peak-text"
                                    : "text-peak-text-muted"
                              }`}
                            >
                              {item.name}
                            </span>
                            {item.quantity && item.quantity !== "1" && (
                              <span className="ml-1.5 inline-block rounded bg-peak-bg px-1.5 py-0.5 text-xs text-peak-text-muted">
                                {item.quantity}
                              </span>
                            )}
                            {item.note && (
                              <p className="mt-0.5 text-xs text-peak-text-muted">
                                {item.note}
                              </p>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Tips */}
          {tips && (
            <div className="flex gap-3 rounded-2xl border border-forest-800 bg-forest-900/30 p-5">
              <Lightbulb className="h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-sm leading-relaxed text-peak-text">{tips}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && gearList.length === 0 && !error && (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-peak-border bg-peak-surface text-peak-text-muted">
          <Backpack className="mb-3 h-10 w-10" />
          <p className="text-center text-sm">
            Décrivez votre randonnée et l&apos;IA génère
            <br />
            la liste complète du matériel à emporter.
          </p>
        </div>
      )}
    </div>
  );
}
