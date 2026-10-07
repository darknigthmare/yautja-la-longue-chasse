# Portraits Yautja récents — sources V85, sans QA

Le dossier Drive `1knnlhc3gNyz6MRSDKqbya5I9cBD92m-t` a fourni une liste de 131 fichiers directs. La collecte est volontairement limitée aux sept PNG nommés demandés, tous créés dans Drive le 7 octobre 2026 : Rhino Kenner bleu et orange, Snake série 13, Panther Kenner Tribute, Night Cougar Kenner Tribute V14, puis Wolf 2007 masqué et sans masque V1, profil V2.

Les sept fichiers sont conservés avec leurs pixels inchangés, leur SHA-256, leurs dimensions PNG, leurs dates et leurs identifiants Drive. Ils totalisent 14 132 192 octets. La déduplication avec les registres antérieurs — 1 396 PNG uniques locaux, 54 fichiers Drive récents et 41 ajouts Badlands — n’a trouvé aucun doublon : sept nouveaux PNG sont persistés dans `/game/imports/v85/drive-latest/approved-hunters/`.

Le registre dédié `app/game/data/recentApprovedHuntersV85.json` rejoint le provider `recentSpriteLibraryV85.ts`. Le codex et la galerie consomment cette union. Les sept références restent des poses statiques distinctes : aucune série de frames, tenue de marche remplacée, compétence, statistique, récompense, ennemi ou combattant jouable n’est créé. Les deux profils Wolf et les deux couleurs Rhino conservent leurs identités source séparées.

« Validé » désigne uniquement le classement dans le dossier source. Les noms NECA, Kenner et Wolf proviennent des titres fournis ; leur fidélité canonique 1:1 et la qualité visuelle ne sont pas certifiées. Les images Aliens, humaines et Prometheus du même dossier, ainsi que le dossier d’essais/rejets, sont exclues. Aucune couverture exhaustive des PNG Drive des trois derniers jours n’est revendiquée ; les 640 variantes PNJ V84 restent des métadonnées sans pixels dans l’archive locale fournie.

Les copies originales et le fichier de métadonnées restent en staging privé `.work-local/recent-approved-hunters-v85/`. La provenance logique est dans `docs/recent-approved-hunters-v85-sources.json`. Aucun script fourni dans une source n’a été exécuté. Aucune vérification de jeu, compilation, typecheck, lint, test ou navigation navigateur n’a été lancée ; aucune publication n’est effectuée par ce sous-lot.
