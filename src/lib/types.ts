export type Difficulty = "easy" | "moderate" | "hard" | "expert";
export type HikeSource = "manual" | "strava" | "apple_health";

export interface Hike {
  id: string;
  user_id: string;
  name: string;
  date: string;
  distance_km: number;
  elevation_m: number;
  duration_min: number;
  difficulty: Difficulty;
  notes: string | null;
  gpx_data: string | null;
  source: HikeSource;
  external_id: string | null;
  lat: number | null;
  lng: number | null;
  tags: string[] | null;
  created_at: string;
}

export interface AIPlan {
  id: string;
  user_id: string;
  hike_id: string | null;
  prompt: string;
  response: string;
  created_at: string;
}

export interface HikePhoto {
  id: string;
  hike_id: string;
  url: string;
  caption: string | null;
  created_at: string;
}

/** Raw activity shape returned by the Strava v3 API. */
export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  distance: number;
  total_elevation_gain: number;
  moving_time: number;
  start_latlng: [number, number] | [] | null;
}

export interface Database {
  public: {
    Tables: {
      hikes: {
        Row: Hike;
        Insert: Omit<Hike, "id" | "created_at">;
        Update: Partial<Omit<Hike, "id" | "created_at">>;
      };
      ai_plans: {
        Row: AIPlan;
        Insert: Omit<AIPlan, "id" | "created_at">;
        Update: Partial<Omit<AIPlan, "id" | "created_at">>;
      };
      hike_photos: {
        Row: HikePhoto;
        Insert: Omit<HikePhoto, "id" | "created_at">;
        Update: Partial<Omit<HikePhoto, "id" | "created_at">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
