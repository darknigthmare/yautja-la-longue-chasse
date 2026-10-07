# Bibliothèque de sources récentes V85

La bibliothèque V85 intègre les sources locales fournies depuis le 4 octobre 2026. Les vingt-cinq sous-packs retenus composent **1 711 entrées de catalogue**, correspondant à **1 396 fichiers PNG uniques**, soit **3 281 392 523 octets natifs**. Les versions d’une même identité restent inventoriées ; 1 363 fiches sont désignées préférées par leur priorité de version et le statut de remplacement documenté. Ce sont des chiffres de source produits lors de l’import, pas une mesure de sprites montés, de performances ou une QA du jeu.

Les fichiers sont copiés tels quels, regroupés par SHA256 sans supprimer de téléchargement ou version précédente. Les archives originales restent dans `C:/Users/chuck/Downloads/Yautja games/`. Le staging C se trouve dans `.work-local/recent-sprites-v85/` : `library/` contient les PNG natifs adressés par SHA et `source-metadata/` les documents originaux extraits. Le namespace public `game/imports/v85/library/` pointe vers ce staging ; la jonction évite une seconde copie sur le disque D déjà contraint.

## Packs locaux retenus

| Ensemble | Entrées PNG importées |
| --- | ---: |
| Clans V5 et lignées V5 complets | 380 |
| Gardes des dix clans V4 | 100 |
| Guerre interne V2 et douze chasseurs conservés | 42 |
| Rois et chefs V1 | 7 |
| Chevaucheurs complets V5.2 | 30 |
| Base historique V6, CP01, matriarches et militaires | 398 |
| Ajouts/corrections V6.1 et humains V6.1 | 133 |
| Cours et cavaliers V6.3 A/B | 216 |
| Matriarches et cavaliers V6.4 A/B | 72 |
| Portable V6.6/V6.7 : quatre sous-packs PNG | 126 |
| Ménagerie du 6 octobre | 11 |
| Hunting Grounds : reconstitutions de matériaux | 78 |
| Badlands V7 : catalogue de 118 visuels | 118 |

Le portable V66/V67 contient les quatre archives de PNG et deux archives documentaires. Le manifeste producteur V67 décrit aussi des fichiers de son projet d’origine qui ne sont pas tous emballés dans ce portable : le lot importe les **126 PNG physiquement présents**, sans transformer le chiffre producteur 288 en une livraison locale de 288 PNG.

Le ZIP partagé ménagerie/vaisseaux contient 11 PNG de ménagerie et 31 PNG de vaisseaux. Ces 31 navires sont pris en charge par le lot distinct de l’agent navires ; ils ne sont pas comptés dans les 1 711 entrées ci-dessus.

## Sources documentaires et fichiers plus récents

`YAUTJA_PNJ_V84_integration.zip` livre les métadonnées de 640 variantes, leur cast, rôles, SHA et chemins attendus, avec **zéro PNG emballé**. Les déclarations producteur de revue et disponibilité restent des données de cette archive, sans être certifiées par le présent lot. `recentNpcSourceMetadataV85.json` préserve ces fiches ; `documentedRecentNpcVariantV85` retourne explicitement `availableForRender:false`. Aucun visage de substitution, acteur ou animation n’est créé pour combler les pixels absents.

Le Drive comporte aussi des ensembles plus récents que les archives locales retenues : Badlands V13/159, ménagerie/vaisseaux de 52 fichiers et matériaux Hunting Grounds du 7 octobre. Les six lots d’ajouts Badlands V8 à V13 sont maintenant importés séparément : 41 PNG natifs complètent la base locale de 118 jusqu’aux 159 visuels documentés, sans recopier les archives cumulatives. Leur registre propre est `badlandsLatestSpritesV85.json`. Les autres ensembles restent signalés dans `drive-imports-v85-sources.json` selon leur récupération séparée par l’agent racine. La bibliothèque ne prétend pas importer tout le Drive.

Le complément `driveLatestSpritesV85.json` est alimenté séparément par l’agent racine pour les PNG individuels reçus. Le provider et la galerie le fusionnent avec le registre local sans modifier ses pixels. Les fichiers `attempt`, `rejected`, provisoires ou en attente restent identifiés par leurs statuts et accessibles via l’historique ; ils ne remplacent pas une version préférée. Une texture reconstruite reste un échantillon de matériau : UV originaux, valeurs calibrées et apparence 1:1 ne sont pas affirmés.

## Consommateurs

`RecentSpriteLibraryV85({onClose})` propose recherche, filtres famille/pack/groupe, pagination par dix-huit fiches, viewer natif, historique, statut de chargement, liens d’image originale et codex de provenance. Le composant conserve le focus clavier dans son panneau et appelle `onClose` sur Échap. L’agent racine possède son ouverture dans le GameClient et la suspension du jeu.

`recentSpriteLibraryV85.ts` exporte les groupes, IDs, versions préférées, variantes historiques, catalogue documentaire PNJ et `findImportedYautjaArtV85({clanName?,role?,name?})`. Ce dernier utilise les clans, fonctions et noms réellement documentés par CSV/manifest ; un nom demandé exige une correspondance de nom, un rôle demandé exige une fonction documentée dans le même clan, et un clan seul donne une représentation déclarée du clan. Une absence retourne `null`, permettant au système tactique de conserver son dessin historique. Il n’attribue aucun portrait canonique aux Pxx de l’exercice RTS.

Le fournisseur de faune expose les variantes statiques identifiées par le catalogue Badlands pour Kalisk, Bud, Bone Bison, Vulture, Luna Bug, Spray Snake, Exploding Worm et Squirt, y compris les ajouts V8 à V13. Ce sont des références additionnelles avec âge, pose et costume conservés ; aucun spawn, collider, compétence de compagnon ou remplacement de marche n’en découle automatiquement. Les onze sources de ménagerie restent sous leur description fournie, sans identité d’espèce inventée.

Le lot n’a exécuté aucun script des archives. L’importeur interne lit les documents, garde les paths d’extraction sous son répertoire C dédié, copie les bytes PNG et enregistre leurs SHA/dimensions d’en-tête. **Aucun test, audit, lint, typecheck, build local, import de module du jeu, contrôle navigateur ou recette publique V85 n’a été exécuté.** La publication Vercel et son build nécessaire sont gérés séparément par l’agent racine ; cette note ne constitue pas un reçu de commit, de push ou de production.
