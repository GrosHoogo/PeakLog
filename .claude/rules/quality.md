Avant chaque commit, exécuter dans l'ordre :
1. `npm run lint` — ESLint doit passer sans erreur.
2. `npm run typecheck` — TypeScript strict, doit passer.
3. `npx prettier --check .` — vérification du formatage.

Si une étape échoue, corriger avant de commiter.
Commentaires : phrases complètes, sans emojis.
Imports : triés (externes → internes → relatifs), pas d'imports non utilisés.
Types : pas de `any` sauf justification commentée.
