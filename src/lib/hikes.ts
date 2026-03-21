/**
 * Data access layer for hikes.
 * TODO: replace with Supabase DB calls once auth is wired up.
 */

import type { Hike } from "@/lib/types";

export async function getHikes(): Promise<Hike[]> {
  // TODO: fetch from Supabase
  // const supabase = await createClient();
  // const { data, error } = await supabase.from("hikes").select("*").order("date", { ascending: false });
  // if (error) throw error;
  // return data ?? [];
  return [];
}

export async function getHikeById(id: string): Promise<Hike | null> {
  // TODO: fetch from Supabase by id
  void id;
  return null;
}
