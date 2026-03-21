# MEMORY.md — Mémoire persistante inter-sessions

## Mémoires
- [feedback_no_delete.md](.claude/memory/feedback_no_delete.md) — Ne jamais supprimer, toujours déplacer dans Trash/

## Architecture globale

```
Utilisateur → Next.js (App Router) → Supabase (Auth + DB) → API Anthropic (planificateur)
                                    → Strava OAuth API   (sync activités)
                                    → Apple Health XML   (import fichier export)
                                    → Mapbox GL JS       (carte interactive)
                                    → Open-Meteo API     (météo gratuite)
```

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 14 App Router + TypeScript |
| Style | Tailwind CSS |
| Auth + DB | Supabase (PostgreSQL) |
| IA | Anthropic claude-sonnet-4-20250514 |
| Cartes | Mapbox GL JS |
| Météo | Open-Meteo (gratuit, pas de clé) |
| Hébergement | Vercel |

## Schéma base de données

```sql
-- Géré par Supabase Auth
users (id, email, name, strava_access_token, strava_refresh_token, strava_expires_at, created_at)

-- Randonnées
hikes (
  id uuid PK,
  user_id uuid FK,
  name text,
  date date,
  distance_km float,
  elevation_m int,
  duration_min int,
  difficulty text CHECK IN ('facile','moyen','difficile'),
  notes text,
  gpx_data text,
  source text CHECK IN ('manual','strava','apple_health'),
  external_id text,         -- strava activity id ou apple health uuid
  lat float,
  lng float,
  created_at timestamptz DEFAULT now()
)

-- Plans IA
ai_plans (id uuid PK, user_id uuid FK, hike_id uuid FK nullable, prompt text, response text, created_at timestamptz)

-- Photos
hike_photos (id uuid PK, hike_id uuid FK, url text, caption text, created_at timestamptz)
```

## Variables d'environnement requises

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
NEXT_PUBLIC_MAPBOX_TOKEN=
```

## Intégration Strava — flux OAuth

1. `/settings` → bouton "Connecter Strava" → redirect `https://www.strava.com/oauth/authorize`
2. Scopes : `activity:read_all`
3. Callback : `/api/strava/callback` → échange code → tokens → stockage en DB (chiffré)
4. Sync : `GET /api/v3/athlete/activities?per_page=200` → filtrer `type === 'Hike'`
5. Upsert avec `source='strava'` + `external_id=strava_id` (évite les doublons)
6. Cron quotidien via Vercel Cron Jobs

## Intégration Apple Health — flux import XML

1. `/settings` → instructions export iOS (Réglages > Santé > Exporter toutes les données)
2. Upload `.zip` ou `export.xml`
3. Si `.zip` → extraire `export.xml` côté serveur
4. Parser XML : nœuds `HKWorkout` où `workoutActivityType="HKWorkoutActivityTypeHiking"`
5. Extraire : `startDate`, `endDate`, `totalDistance`, `totalEnergyBurned`, fréquence cardiaque
6. Upsert avec `source='apple_health'`

## Structure de fichiers (Next.js App Router)

```
app/
  (auth)/login/page.tsx
  (app)/layout.tsx          ← layout connecté avec sidebar
  (app)/page.tsx            ← dashboard
  (app)/plan/page.tsx
  (app)/journal/page.tsx
  (app)/journal/[id]/page.tsx
  (app)/journal/new/page.tsx
  (app)/map/page.tsx
  (app)/stats/page.tsx
  (app)/settings/page.tsx
api/
  strava/callback/route.ts
  strava/sync/route.ts
  apple-health/import/route.ts
  ai/plan/route.ts           ← appel Claude
components/
  ui/                        ← composants réutilisables
  hike/                      ← HikeCard, HikeForm, HikeMap
  plan/                      ← PlannerForm, PlanResult
lib/
  supabase.ts
  strava.ts
  apple-health-parser.ts
  anthropic.ts
```

## Décisions techniques

- **Supabase Auth** pour l'authentification (email + OAuth Google optionnel)
- **RLS Supabase** : chaque table a une policy `user_id = auth.uid()` — sécurité par défaut
- **Tokens Strava** stockés chiffrés via `pgcrypto` dans Supabase
- **Apple Health** : pas d'API web → import fichier XML uniquement (limitation Apple)
- **Open-Meteo** : API météo gratuite, pas de clé nécessaire
- **GPX** : stocké en text dans la DB, rendu côté client via Mapbox

## Dernières sessions

- **Init** : Création du projet — config Claude Code générée, structure posée.
