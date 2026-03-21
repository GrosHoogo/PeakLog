# MEMORY.md — Peaklog

## Branche : main

## État courant
MVP initial en place + audit de sécurité complet appliqué.
Build Next.js, ESLint, TypeScript strict, Prettier : tout passe sans erreur.

## Stack
- Next.js 16 (App Router) + TypeScript strict + Tailwind CSS v4
- Supabase (client configuré, pas encore connecté en base)
- Mapbox GL JS (carte interactive, nécessite token)
- API Anthropic (planificateur IA, claude-sonnet-4-20250514)
- Recharts (graphiques stats, lazy-loadés via next/dynamic)
- Zod (validation des inputs API)
- Lucide React (icônes), date-fns (formatage dates)

## Sécurité appliquée (après audit)
- XSS : suppression de `dangerouslySetInnerHTML`, rendu sécurisé par paragraphes
- XSS Mapbox popup : tous les champs passent par `escapeHtml()` avant setHTML
- Prompt injection : inputs validés et bornés via Zod avant construction du prompt
- Auth check sur `/api/plan` et `/api/strava/sync` (conditionnel si Supabase configuré)
- Rate limiting in-memory sur `/api/plan` (10 req/heure par IP)
- Open redirect corrigé dans `/api/auth/callback` (whitelist des chemins autorisés)
- Logs Strava : suppression du log avec token, mode dev only pour l'athlete ID
- CSP + X-Frame-Options + X-Content-Type-Options dans `next.config.ts`

## Fichiers clés
- `src/app/page.tsx` — Landing
- `src/app/plan/page.tsx` — Planificateur IA (rendu sécurisé, validation)
- `src/app/api/plan/route.ts` — Route Anthropic (Zod + auth + rate limit)
- `src/app/journal/page.tsx` — Liste randos
- `src/app/journal/[id]/page.tsx` — Fiche détail
- `src/app/journal/new/page.tsx` — Formulaire nouvelle rando
- `src/app/stats/page.tsx` — Dashboard stats (Recharts lazy)
- `src/app/map/page.tsx` — Carte Mapbox (popup échappée)
- `src/app/settings/page.tsx` — Settings + Strava OAuth
- `src/app/api/strava/callback/route.ts` — OAuth callback Strava
- `src/app/api/strava/sync/route.ts` — Sync activités + edge cases
- `src/app/api/auth/callback/route.ts` — Auth Supabase (open redirect protégé)
- `src/lib/types.ts` — Hike, AIPlan, HikePhoto, StravaActivity, Database
- `src/lib/validation.ts` — Schémas Zod pour les inputs API
- `src/lib/rate-limit.ts` — Rate limiter in-memory (à remplacer par Redis en prod)
- `src/lib/hikes.ts` — Abstraction couche données (démo → Supabase)
- `src/lib/api-routes.ts` — Constantes des routes API
- `src/lib/supabase-server.ts` — Client Supabase SSR
- `src/lib/supabase-browser.ts` — Client Supabase browser
- `src/lib/demo-data.ts` — 6 randos de démo
- `src/components/navbar.tsx` — Navigation responsive
- `src/components/hike-card.tsx` — Carte de rando
- `src/components/stats-charts.tsx` — Graphiques Recharts (lazy)
- `next.config.ts` — CSP + security headers
- `eslint.config.mjs` — no-console + no-explicit-any
- `tsconfig.json` — strict + noImplicitAny + strictNullChecks + strictFunctionTypes

## Variables d'environnement requises (.env.local)
Voir `.env.example`. Le rate limiter et auth utilisent Supabase si configuré.

## Prochaines étapes
1. Connecter Supabase (créer tables, brancher CRUD réel)
2. Auth UI (login/signup pages)
3. Upload photos + GPX
4. Parser Apple Health XML
5. Cron sync Strava
6. Export PDF bilan annuel
7. Rate limiter Redis/Upstash (remplace in-memory)
8. PWA manifest
