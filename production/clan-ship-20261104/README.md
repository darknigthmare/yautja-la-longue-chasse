# Reprise ShipHub — 4 novembre 2026

## Point repris

La conversation retrouvée s'arrêtait sur la séparation entre **le vaisseau personnel du joueur** et **l'immense Clan Ship dans lequel il vient s'amarrer**. L'ancien brouillon n'avait pas été publié ; ses fichiers, son ancien classeur et l'annonce de 27 vérifications ne sont pas disponibles comme preuves. Ce dossier est un nouveau point de reprise fondé sur les exigences connues et le dépôt courant.

Base de travail : `main` à `d56c0e0`. Branche de reprise : `feat/clan-ship-docking-20261104`.

PR de reprise : [#104 — brouillon](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/104). Les preuves ci-dessous indiquent précisément la version du code qu'elles couvrent.

## Livrables

- `shiphub-reprise-20261104.xlsx` : cinq onglets — reprise, pièces et services du Clan Ship, assets, château orbital, arrivée et recette.
- `prompts.md` : trois briefs de conception réutilisables, avec séparation explicite entre références demandées, adaptation de gameplay et extrapolation.
- `build-workbook.mjs` : source reproductible du classeur, générée avec `@oai/artifact-tool`.
- `verification.json` : contrôle des formules et manifeste des rendus, lorsqu'il est produit par le script.

## Travail courant et limites

La reprise du code porte sur l'approche, l'amarrage, l'entrée, la circulation dans les salles, le retour au vaisseau personnel et le désamarrage. Elle couvre aussi la persistance par campagne, les emplacements de sauvegarde, l'import/export et l'attribution des entrées à une seule interface active. L'identité du vaisseau personnel doit rester celle de la flotte du joueur, y compris après rechargement à bord du Clan Ship.

**Résultats obtenus : 184/184 tests automatisés, ESLint strict sans avertissement ni erreur et `npm run typecheck` réussis en CI ; build Next webpack local terminé avec code de sortie 0.** Le [run CI final](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41789974649), sur la source `9d77af88148e8ab5b2d49e64040024c57aeba67d`, a réussi **10/10 scénarios** dans le véritable `GameClient` rendu par Vite, avec **zéro asset demandé manquant et zéro exception JavaScript**. Le contrôle des assets est bloquant et porte sur les ressources demandées par les parcours réellement visités.

Le navigateur local reste indisponible (`socket(): Operation not permitted`, escalade refusée par la politique d'exécution) ; la recette réellement exécutée provient du navigateur CI. Les captures desktop à 1440 px et mobile à 320 px ont été relues par l'agent principal et l'agent UI, sans défaut matériel signalé. La navigation est aussi testée à 390 px.

### Périmètre navigateur réellement exécuté

1. Migration d'une ancienne campagne par le menu réel vers le pont personnel.
2. Confirmation manette maintenue : une seule étape d'amarrage.
3. Amarrage et entrée à bord en conservant la coque personnelle.
4. Navigation des sept salles, ouverture des six services existants et retour à la bonne salle.
5. Suspension du contrôleur clan dans les paramètres et checkpoint manuel conservant la salle archives.
6. Sauvegarde, retour au menu, rechargement et Continuer : reprise de la salle archives.
7. Retour au pont personnel avec amarrage conservé, voyage bloqué jusqu'au désamarrage, puis départ.
8. Annulation durable de l'approche sans entrée à bord.
9. Navigation mobile à 390 et 320 px sans débordement horizontal.
10. Chargement des images des vaisseaux et des assets partagés demandés : aucun asset manquant et aucune exception JavaScript.

L'ouverture et la fermeture des services sont testées ; la recette n'étend pas cette preuve à tous leurs coûts, récompenses ou effets métier. **QA-05 et QA-06 — séparation des propriétaires/campagnes et import/export — sont couvertes par les 20 tests d'intégration de `tests/clan-ship-save.test.mjs`, sans scénario UI dédié.** Le classeur distingue donc « Validé CI » pour le parcours navigateur de « Testé (domaine) » pour les validations de données et d'intégration.

Les premières copies CI omettaient des assets déjà présents dans le dépôt ; le [premier run de parcours](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41788704193) reste une preuve historique à périmètre limité. La copie et l'assertion ont été corrigées ; le run final ci-dessus confirme zéro absence. Aucune approbation artistique ou fidélité canonique n'est déduite du simple chargement des fichiers.

Le **château orbital Predator King / Wolf System, associé dans le brief à Black Panther vs Predator**, et la **cinématique d'arrivée inspirée de Predator (1987) jusqu'à 1:02** ne sont pas implémentés dans cette passe. Leurs lignes sont des éléments de planification. Les associations de lore et le découpage exact du film demandent encore une vérification sur les références choisies ; les prompts et les timings proposés ne constituent pas des preuves de canon.

## Prochaine étape

Construire l'**intérieur physique du Clan Ship** à partir d'assets individuels : hangar, sas, portes, passerelles et modules propres aux salles. La circulation spatiale, les collisions, les transitions et les services devront conserver les deux identités de vaisseau et les contrats de sauvegarde validés. Les briefs de `prompts.md` préparent ce travail ; le château orbital et l'arrivée cinématique gardent leurs chantiers distincts planifiés.

## Sources et lecture du classeur

Les sources sont indiquées par ligne : brief de reprise, chemins de code et assets présents dans l'arbre Git. Un asset « Existant » signifie que le fichier est référencé dans le dépôt ; cela ne certifie ni son intégration dans le Clan Ship, ni sa fidélité canonique, ni son approbation artistique. Les nouveaux assets restent « À produire ». Les propositions de salles et d'effets métier restent des adaptations de gameplay lorsqu'aucune référence vérifiée ne les établit.

Références principales : `app/game/systems/clanShipDocking.ts`, `app/game/ShipHub.tsx`, `app/game/shipCatalogue.ts`, `app/game/shipInteriorKit.ts`, `app/game/shipInteriorV22.ts`, `app/game/systems/campaignSlots.ts`, `app/game/systems/activeHuntSave.ts`, `tests/clan-ship-docking.test.mjs`, `tests/clan-ship-save.test.mjs`, `docs/ship-modular-art-contract.md`.

La feuille Reprise compte automatiquement les éléments des feuilles de détail. Aucun taux global de réalisation n'est calculé : les chantiers n'ont pas la même taille et plusieurs éléments ne sont pas encore exécutés.

## Vérification du livrable

Les cinq onglets ont été rendus et examinés. Les six formules de synthèse ont été recalculées : 24 exigences Clan Ship, 20 assets existants candidats, 6 lots à produire, 12 éléments château, 8 plans d'arrivée et 10 scénarios navigateur exécutés. Un changement temporaire de statut d'asset a vérifié la propagation des compteurs, puis la donnée d'origine a été restaurée. Ces vérifications du livrable sont distinctes de la recette navigateur décrite ci-dessus.
