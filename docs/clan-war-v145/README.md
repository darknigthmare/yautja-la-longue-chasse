# V145 — Guerre des clans, quatre modes : protections réellement physiques

## Sources et branche

La **V145** est empilée sur la [PR #56 (V144)](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/56), après les versions V143 et V142. La PR #42 des gauntlets reste indépendante. Les objets, créatures, couleurs, lieux et capacités non présents dans les œuvres sont identifiés comme **inventions de gameplay** ; ils ne sont jamais marqués « canon 1:1 ».

## Gameplay développé

| Mode | Changement | Limites physiques et preuve |
|---|---|---|
| Assaut latéral | **Interposition défensive de deux équipes V6 existantes** : `commandWarAssaultInterposeV145`, coût 10 AP, deux échanges, un point de dégât par tir transféré du protégé vers l'escouade arrière | Les deux acteurs sont vivants et sur le front, à six unités max. Aucun point de vie créé : les dégâts totaux restent identiques. Utilisable une fois par protecteur et mission |
| Outer Ops | **Horloge réellement arrêtée durant les cinq secondes** d'une révision de trajet V144 et journal lisible via `warOuterTravelLedgerV145` | Décomptage consolidé avec halte V137 et détour V143 ; les identifiants de passages viennent de `WarRulesV6` ; aucun résultat, ennemi caché ou arrivée précipitée |
| Infiltration | **Sécurité de secteur à deux gardes cohérente** : écoute sur le plus proche des gardes physiques ; sabotage discret interdit si l'un des deux est proche ; patrouilles empêchées d'occuper la même case | Réactions d'un tour, vrais murs W3, anciennes sauvegardes sans second garde toujours autorisées. Les gardes ne sont pas des personnages de film reconstitués |
| RTS multi-escouades | **Relève de poste physique** : `commandWarRtsPostHandoverV145`, deux équipes vivantes près du même objectif W3, maintien du progrès acquis et un tour adverse normal | L'ancien groupe cesse d'être attaché au poste. Une relève par titulaire, aucune progression gratuite, aucun RAV fictif et aucune conquête de territoire V85 |

Le RTS reste un mode additionnel ; le gameplay de la chasse principale demeure orienté **Dynasty-Warriors-like**, non AVP Extinction.

## Code et QA

- `app/game/systems/clanWarInterposeV145.ts` et `clanWarTravelLedgerV145.ts` : nouvelles mécaniques.
- Modifications ciblées de `clanWarOperationsV115.ts`, `clanWarAssaultContactV141.ts`, `clanWarOuterRouteProgressV140.ts`, `clanWarRtsSquadsV133.ts` et deux panneaux React.
- CI `.github/workflows/clan-war-v145.yml` : `tests/clan-war-four-modes-v145.test.mjs`, toutes les régressions V115–V144, TypeScript et ESLint.
- Un **avenant Excel V145** retrace les exigences, les procédures QA et les dépendances. Les sources historiques de 1 200 variantes, 24 scripts W3, 12 cartes et 36 dossiers W5 restent dans leurs PR d'origine ; pas de confusion entre fiche design et niveau réellement jouable.

## Non achevé

**Restent ouverts :** campagne V85 et garnisons persistantes, serveur multijoueur, équilibrage de grande ampleur, sessions navigateur/manette, assets photographiquement ou stylistiquement fidèles aux films/comics/PHG, géographie 1:1 certifiée, et production complète des 1 200 variantes. Les tests automatisés ne prouvent pas ces éléments.

## Suivi V145 intégré et tests CI

Le fichier **`docs/clan-war-v145/Yautja_Guerres_Clans_Avenants_Production_V144_V145_2026-11-01.xlsx`** est un véritable classeur binaire. Il comporte **16 feuilles** : les huit onglets V144 conservés et huit nouveaux onglets V145. Le fichier V143 (73 feuilles) demeure dans la PR #53 et est **référencé, non recopié**. Les 1 200 variantes CW120 restent des dossiers *design-only*, sans prétendre que toutes leurs scènes soient créées.

Le tableau de bord est calculé par formules et suit **48 exigences** V145 (**8 validées en CI ciblée, 12 prototypes partiels, 28 à développer**), **32 scénarios QA** (**8 ciblés, 24 manuels**) et **12 interactions inter-modes**. La CI complète lance trois nouveaux tests binaires `tests/clan-war-production-v145.test.mjs` pour contrôler le nombre de vraies feuilles, les identifiants uniques, la conservation V144 et les formules.

**Code vérifié** : [CI 41253288465](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41253288465), **168/168 tests**, TypeScript et ESLint verts. La validation du **dernier commit intégrant le fichier XLSX** reste distincte et est à faire avant fusion.

## Autre livraison V145 conservée

Le [suivi de la branche PR75](README_PR75.md) et son classeur distinct sont conservés. Leurs résultats restent attachés aux commits historiques cités.
