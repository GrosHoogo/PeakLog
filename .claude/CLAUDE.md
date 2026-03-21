# CLAUDE.md

## Projet : Peaklog

Application web de randonnée & aventure outdoor.
Planificateur IA (Claude) + Journal de sorties + Stats + Intégrations Strava / Apple Health.

Stack : Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase + Mapbox GL JS + API Anthropic

Mémoire inter-sessions : lire MEMORY.md au début de chaque session et après chaque /compact.
Architecture détaillée, décisions techniques et état courant : voir MEMORY.md.

## Principes de code

Ces règles privilégient la prudence sur la vitesse. Pour les tâches triviales, faire preuve de jugement.

### 1. Réfléchir avant de coder
- Énoncer les hypothèses explicitement. En cas de doute, poser la question.
- Si plusieurs interprétations existent, les présenter — ne pas choisir silencieusement.
- Si une approche plus simple existe, la proposer. Savoir pousser en retour.

### 2. Simplicité avant tout
- Aucune fonctionnalité au-delà de ce qui est demandé.
- Pas d'abstraction pour du code à usage unique.
- Si 200 lignes peuvent s'écrire en 50, réécrire.

### 3. Modifications chirurgicales
- Ne pas "améliorer" le code adjacent, les commentaires ou le formatage sans raison.
- Respecter le style existant. Chaque ligne modifiée doit tracer directement vers la demande.

### 4. Exécution orientée objectifs
- Transformer les tâches en objectifs vérifiables avec critères de succès.
- Pour les tâches multi-étapes, énoncer un plan court avant d'implémenter.

## Conventions

- Commits : voir .claude/rules/commits.md
- Qualité & formatage : voir .claude/rules/quality.md
- Gestion du contexte : voir .claude/rules/context.md
- Suppression de fichiers : voir .claude/rules/no-delete.md
- Sécurité & secrets : voir .claude/rules/secrets.md

### CLAUDE.md et MEMORY.md
- Mettre à jour CLAUDE.md si la stack ou l'architecture change.
- Mettre à jour MEMORY.md (max 150 lignes) après chaque modification significative et avant chaque /compact.
- Dans MEMORY.md, toujours indiquer la branche Git concernée.

## Pages de l'application

| Route | Description |
|-------|-------------|
| `/` | Landing (visiteur) / Dashboard (connecté) |
| `/plan` | Planificateur IA |
| `/journal` | Liste des randonnées |
| `/journal/[id]` | Fiche détaillée |
| `/journal/new` | Nouvelle rando (manuelle) |
| `/map` | Carte mondiale |
| `/stats` | Statistiques & graphiques |
| `/settings` | Compte, Strava, Apple Health |

FIN DU FICHIER CLAUDE.md — ne rien ajouter après cette ligne.
