# V144 — Quatre modes de guerre des clans : coopération physique et renseignement vérifiable

**Branche** `feat/v144-four-modes-regroup-checkpoint-investigation-relief-20261031` ; **base** PR #53 V143. Chaîne précédente inchangée jusqu'à #29. La PR #42 du gauntlet holographique reste entièrement parallèle.

## Mécaniques codées dans le gameplay existant

| Mode | Fonctionnalité V144 | Sécurité et limites |
|---|---|---|
| **Assaut latéral** | `regroupWarAssaultV144` : une véritable formation alliée déployée peut se déplacer de **1 à 3 unités de la voie latérale** pour rejoindre un chef allié physiquement proche | **10 AP**, leader x≤35 et soutien x≤50, ≤14 de distance, **une utilisation par groupe**, impossible de traverser ou chevaucher un adversaire/allié. Aucune troupe inventée ou blessure guérie |
| **Outer Ops** | `inspectWarOuterPassageV144` : contrôler **le véritable passage V6 actuellement traversé** avec son texte de condition public, pour **1 RAV** | Une inspection par mandat, équipe effectivement engagée et apte, aucun résultat anticipé, même itinéraire et même date d'arrivée. Bonus de **+2 capacité d'exercice uniquement au règlement final**, reçu et archive contrôlés |
| **Infiltration / sabotage** | Mémoire de **dernière position réellement observée** du joueur. Le garde recherche cette case durant **deux décisions**, pas la position actuelle du chasseur caché | Si un leurre réel est actif, il prime ; nouveaux contacts seulement si ligne de vue physique. État `guardInvestigation` facultatif en sauvegarde V115, coordonnées en terrain traversable et durée bornée |
| **RTS multi-escouades** | `commandWarRtsReliefV144` : une escouade active **adjacente au chef et au poste** reprend la tenue de l'objectif sans remise à zéro de sa progression | Une relève par tâche, groupe vivant et objectif observé, alimentation/pression/météo requises, **un véritable tour ennemi** pendant la relève. Pas de progression à distance ni de victoire prématurée |

## Intégration des interfaces

Le panneau Assaut propose les paires de groupes physiquement compatibles, Outer Ops montre le contrôle du passage et son coût, l'infiltration affiche la recherche limitée du garde sans révéler de nouvelles positions ennemies, et le RTS propose la relève du poste occupé à proximité.

Les coûts AP/RAV sont des règles originales de jeu, **pas des propriétés canoniques des œuvres Predator/AVP/PHG**. Les 24 scénarios W3 restent situés sur leurs mondes définis par `WarRulesV6` et `WarSourceMapsV128`. Les mécanismes supplémentaires n'importent pas les villes terrestres dans les mondes extraterrestres.

## QA automatisée et Excel

- `tests/clan-war-four-modes-v144.test.mjs` teste les quatre changements, le refus des détachements éloignés, les coûts, archives forgées, garde invisible, un seul tour RTS et les 24 missions source.
- Workflow `.github/workflows/clan-war-v144.yml` : suite V144 + tests V115–V143, compilation TypeScript et ESLint.
- Le classeur V143 reste la **référence historique complète de 73 onglets** dans la branche parent et la PR #53. Le **classeur V144 complémentaire** documente les exigences nouvelles, les régressions, les QA et les dépendances avec des liens GitHub, sans prétendre recopier toutes les feuilles historiques. Il sera commité ici et testé sur ses octets binaires.

**Toujours ouvert :** 1 200 niveaux complets, campagnes/territoires V85 persistants, armées multi-régions, serveur coop/PvP, animations, architecture/armes/sprites 1:1 et QA navigateur/mobile/manette. La réussite CI est un statut de validation ciblée, pas de production finale.

## Validation ciblée et suivi V144 (31/10/2026)

Le commit de code `bc5aacd7` a réussi **154/154 tests Node**, la compilation **TypeScript** et **ESLint** sans erreur : [GitHub Actions 41248247831](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41248247831). Cette validation porte sur les quatre nouveaux systèmes, leurs interfaces et les régressions V115–V143.

Le fichier **`docs/clan-war-v144/Yautja_Guerres_Clans_Suivi_Production_V144_2026-10-31.xlsx`** est le supplément Excel V144 : **9 onglets** et **48 exigences** (12 par mode), dont **4 nouveautés validées en CI ciblée**, **25 prototypes existants** et **19 exigences encore à développer**. Il comporte aussi **40 procédures QA**, **16 interactions**, un tableau de bord à formules, un dictionnaire de statuts et un inventaire de sources. Le classeur **historique V143 de 73 onglets demeure dans la PR #53** et est lié explicitement depuis le supplément, sans être remplacé.

`tests/clan-war-production-v144.test.mjs` vérifie les **octets XLSX de ce fichier effectivement commité**, les neuf feuilles, les IDs, les liens historiques et les formules. La QA navigateur/manette, le réseau, les assets cinématographiques 1:1 et la campagne V85 restent des travaux **non réalisés par ces tests**.
