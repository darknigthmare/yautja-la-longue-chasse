# V114 — Réconciliation des matières PHG et de la personnalisation V113

Base de travail : PR #27 (sur PR #24), inventaire original déjà présent sous `public/game/imports/v85/drive-latest/`. Le registre `hunterMaterialsV113.ts` est repris **octet pour octet** de la PR #25 pour éviter deux inventaires contradictoires.

- 44 ressources historiques : 13 peaux, 3 composants dreadlocks, 28 matières d'équipement et étoffes. Le fichier de contrôle vérifie l'empreinte Git de chaque PNG, la taille en octets, l'en-tête et le CRC IHDR.
- 39 matières de surface supplémentaires peuvent être sélectionnées ; les trois identifiants V113 déjà sélectionnables restent compatibles. Un masque spécifique, une ligature isolée et la version Shatter archivée ne deviennent pas de faux revêtements de corps.
- Les nouveaux choix utilisent les **chemins V85 existants**, pas des copies vers V114. Les 3 anciens PNG V113 restent pour la compatibilité des sauvegardes.
- Sauvegardes : stockage limité aux IDs enregistrés, toujours isolé par propriétaire de campagne ; pas d'URL issue d'une sauvegarde dans CSS ou Canvas.
- Lore : le comptoir chromatique relève de l'artisanat et d'une étude des chromatophores (interprétation originale), et **non d'un éditeur instantané de gènes confirmé par les films**.
- Fidélité : ce sont des **reconstitutions planes inspirées par PHG**, pas des textures UV officielles, ni des plaques exactes vérifiées 1:1. Aucun nouveau sprite anatomique ou mouvement n'est certifié par cet inventaire.

Les lieux physiques Homeworld et le rendu du chasseur V113 sont conservés. À vérifier après cette synchronisation : couleurs des six morphologies dans l'aperçu, rendu Homeworld et chasse Canvas, gradients/mélanges et cohérence avec les références film/PHG.

Commandes : `python3 scripts/validate-phg-materials-v113.py` ; `node --experimental-strip-types --test tests/hunter-chromatics-v113.test.mjs tests/hunter-chromatic-canvas-v113.test.mjs tests/hunter-chromatics-native-v114.test.mjs`.

Les PR #24 et #25 sont deux branches distinctes. Ne pas déduire de leur mergeabilité séparée l'absence de conflits lors de leur **intégration mutuelle**.
