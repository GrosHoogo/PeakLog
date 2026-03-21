"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Hike } from "@/lib/types";

const STORAGE_KEY = "peaklog_hikes";

/** Reads user hikes from localStorage. */
function loadStoredHikes(): Hike[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Hike[]) : [];
  } catch {
    return [];
  }
}

/** Saves hikes to localStorage. */
function saveStoredHikes(hikes: Hike[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hikes));
  } catch {
    // Storage full or unavailable — fail silently.
  }
}

function sortByDate(hikes: Hike[]): Hike[] {
  return [...hikes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

// Stable empty reference — shared between getSnapshot (when empty) and getServerSnapshot.
const EMPTY: Hike[] = [];

// Lazy-initialized on first client-side getSnapshot call.
let snapshot: Hike[] = EMPTY;
let clientInitialized = false;

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Hike[] {
  if (!clientInitialized && typeof window !== "undefined") {
    clientInitialized = true;
    const stored = loadStoredHikes();
    snapshot = stored.length > 0 ? sortByDate(stored) : EMPTY;
  }
  return snapshot;
}

function getServerSnapshot(): Hike[] {
  return EMPTY;
}

function notify() {
  const stored = loadStoredHikes();
  snapshot = stored.length > 0 ? sortByDate(stored) : EMPTY;
  listeners.forEach((cb) => cb());
}

/**
 * Central hook for hike data. Reads from localStorage.
 * When Supabase is wired up, replace localStorage calls with DB queries.
 */
export function useHikes() {
  const hikes = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /** Add multiple hikes (e.g. from Strava sync). Deduplicates by external_id. */
  const addHikes = useCallback((newHikes: Hike[]) => {
    const stored = loadStoredHikes();
    const existingExternalIds = new Set(
      stored.filter((h) => h.external_id).map((h) => h.external_id),
    );

    const toAdd = newHikes.filter(
      (h) => !h.external_id || !existingExternalIds.has(h.external_id),
    );
    saveStoredHikes([...stored, ...toAdd]);
    notify();
  }, []);

  /** Find a single hike by id. */
  const getHike = useCallback(
    (id: string): Hike | undefined => hikes.find((h) => h.id === id),
    [hikes],
  );

  return { hikes, addHikes, getHike };
}
