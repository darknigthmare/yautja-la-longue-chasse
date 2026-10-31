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
