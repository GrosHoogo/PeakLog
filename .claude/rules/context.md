Seuils d'action :
- 50% contexte : commiter le travail en cours, mettre à jour MEMORY.md, signaler le niveau.
- 65% contexte : arrêter la tâche et proposer /compact avant de continuer.
- Auto-compact à 70% (env var). Ne jamais le laisser se déclencher en milieu de tâche complexe.

Avant chaque /compact, préserver obligatoirement :
1. Tâche en cours + statut exact (fait / reste / prochaine étape).
2. Fichiers modifiés cette session (chemins exacts + raison).
3. Décisions techniques avec justification (le pourquoi).
4. Messages d'erreur verbatim si debug en cours.
5. Couche concernée, page/route, composant principal.

Règles anti-dégradation :
- Ne jamais relire un fichier déjà lu cette session sans justifier.
- Ne jamais contredire une décision prise plus tôt — en cas de doute, demander.
- Après /compact, toujours relire MEMORY.md avant de continuer.
