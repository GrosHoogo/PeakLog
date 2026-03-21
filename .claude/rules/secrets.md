Ne jamais écrire de clés API, tokens ou secrets en dur dans le code.
Toutes les variables sensibles passent par `.env.local` (jamais committé).
Vérifier que `.env.local` est dans `.gitignore` avant tout commit.
Variables d'environnement requises listées dans MEMORY.md — utiliser `.env.example` comme référence publique.
Les tokens Strava sont stockés chiffrés en base (pgcrypto) — jamais en clair dans les logs.
