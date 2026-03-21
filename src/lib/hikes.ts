/**
 * Data access layer for hikes.
 * Currently returns demo data. When Supabase is configured, swap out
 * the demo fallbacks with real DB calls.
 */

import { demoHikes } from "@/lib/demo-data";
import type { Hike } from "@/lib/types";

function isDemoMode(): boolean {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function getHikes(): Promise<Hike[]> {
  if (isDemoMode()) return demoHikes;
  // TODO: fetch from Supabase
  // const supabase = await createClient();
  // const { data, error } = await supabase.from("hikes").select("*").order("date", { ascending: false });
  // if (error) throw error;
  // return data ?? [];
  return demoHikes;
}

export async function getHikeById(id: string): Promise<Hike | null> {
  if (isDemoMode()) return demoHikes.find((h) => h.id === id) ?? null;
  // TODO: fetch from Supabase by id
  return demoHikes.find((h) => h.id === id) ?? null;
}
