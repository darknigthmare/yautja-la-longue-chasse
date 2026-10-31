# V134 — Gauntlets Yautja : intégration sauvegarde et arsenal à calques

> **Champ réel livré** : code de déblocage / persistance V13, fichiers d'assets **V134 en blockout**, pipeline PNG et preuve de complétude vérifiable. **Aucun gauntlet n'a encore reçu la validation artistique 1:1.**
> Travaux empilés sur PR #42 ; ne pas confondre une PR ouverte avec le contenu de `main`.

## 1. Matériel de référence et périmètre du Jungle Hunter

Le computer gauntlet du **Jungle Hunter de Predator (1987)** se porte sur l'avant-bras gauche ; l'étude de sa façade montre cinq bandes de glyphes rouges sur un boîtier sombre, accompagnées d'une portion latérale/rabattable de coque. Le rendu implémenté est une **interprétation technique** des volumes tant que les mesures de tournage ne sont pas homologuées.

Sources à vérifier lors de la revue :
- Film original : https://www.20thcenturystudios.com/movies/predator
- Vue de poignet : https://www.avpcentral.com/images/predator-technology/predator-wrist-gauntlet.jpg
- Galerie des photogrammes : https://www.avpgalaxy.net/predator-movies/predator/gallery/blu-ray-captures/
- Figurine licenciée NECA avec gantelet ouvrable : https://store.necaonline.com/products/predator-ultimate-jungle-hunter-7-scale-action-figure

Niveau de fiabilité : **l'existence, le côté porté, la disposition générale et la présence de cinq zones lumineuses sont référencés** ; les proportions, inscriptions, micro-rayures, fixations, textures 1:1, pivot exact et animation restent **non validés**. Le projecteur militaire de guerre des clans est une invention fonctionnelle du fan game, pas un événement précis du film de 1987.

## 2. Sept SVG indépendants + export PNG

Répertoire utilisé réellement par `JungleHunterLayeredV134.tsx` :
`public/game/assets/v134/gauntlets/jungle-hunter/`

| Pièce | Source | Usage |
| --- | --- | --- |
| Avant-bras et fixation | `01-arm.svg` | Ancrage et peau |
| Coque et support mécanique | `02-housing.svg` | Enveloppe noire / métal |
| Affichage rouge à cinq rangées | `03-display-glyphs.svg` | Symboles de **travail**, non reproduction homologuée |
| Charnière | `04-hinge.svg` | Axe visuel entre coque et panneau |
| Couvercle ouvrable | `05-lid.svg` | Ouverture/fermeture réelle en CSS |
| Émetteur | `06-emitter.svg` | Matériel de projection fictif |
| Faisceau | `07-beam.svg` | Effet visuel original du mode guerre |

Tous les calques partagent un espace `540×290`, conservent leur transparence et ont une source remplaçable indépendamment. L'UI holographique et la fiche d'armurerie utilisent **exactement le même composant** ; l'ancienne vue ne change pas.

Commandes :
```sh
node scripts/export-gauntlet-png-v134.mjs --check
node scripts/export-gauntlet-png-v134.mjs outputs/gauntlet-v134
node scripts/audit-gauntlet-completeness-v134.mjs outputs/gauntlet-v134
```

Le pipeline basé sur `sharp` exporte sept images PNG transparentes `1080×580`, plus un composite d'aperçu et un manifeste SHA256. La CI publie le résultat dans un artefact pour revue, sans déclarer les images comme des PNG de film 1:1.

## 3. Quarante-quatre études de gauntlets : connexion à de vraies preuves

Les 44 lignes portant `challenge:<id>` dans la V132 possèdent désormais un `GauntletStudyV134`. Le contrat est *déterministe à partir de l'ID* et stable malgré un changement d'ordre du catalogue :
- une mission existante du jeu parmi huit chasses autorisées, avec nombre minimal de victoires ;
- un rang réellement calculé par la campagne ;
- un nombre minimal de scans, venant des statistiques réelles ;
- au moins un trophée physique gagné sur la même mission et la qualité demandée ;
- pour les études les plus exigeantes, le rite d'atelier réellement archivé sur ce trophée.

L'étude doit ensuite être **validée explicitement dans l'armurerie**. Elle crée un reçu *idempotent*, puis le jeu confirme l'enregistrement via `persistSocialProgress` avant de permettre l'équipement. Aucun gain n'est accordé par la consultation du fichier JSON, par un résultat de guerre libre V85/V115, par l'ouverture d'une fiche ou par un rang seul.

Ces dossiers sont des **travaux de reconstitution au Homeworld** ; la planète d'une chasse originale du jeu n'est jamais décrite comme le lieu réel d'un film ou d'un gauntlet historique. Tous les gauntlets aux références encore incomplètes restent des **substituts artistiques provisoires**, même lorsque leur étude est gagnée.

## 4. Sauvegarde V13 et protection des anciennes archives

Le jeu passe de `SAVE_VERSION=12` à `SAVE_VERSION=13` avec une migration additive. La nouvelle section facultative du `SaveGame` est :
```json
{
  "gauntletV134": {
    "version": 1,
    "ownerCreatedAt": "<ID de la sauvegarde du chasseur>",
    "equippedId": "jungle-hunter",
    "claimedStudies": []
  }
}
```
Le propriétaire doit correspondre à la sauvegarde ; les recettes inconnues, dupliquées ou appartenant à un autre chasseur sont refusées. Les versions futures de ce module sont refusées en lecture, plutôt que réécrites par une ancienne application.

Les anciennes sauvegardes V12 sont relues **sans attribution automatique** des 44 études et sans suppression de leur progression. La préférence locale V133 reste lisible pour un ancien chasseur dont la section V134 est absente ; après une sélection au comptoir, `gauntletV134` devient la source de vérité.

La section V134 étant incluse dans la sauvegarde de campagne, **l'export/import standard permet de la retrouver sur un autre appareil**, à l'inverse de la simple clé localStorage V133. Cette propriété repose sur les fonctions `exportSave` / `parseSaveImport` de la base. Elle doit encore être vérifiée par un véritable aller-retour navigateur sur deux profils/appareils avant de déclarer le parcours e2e achevé.

## 5. Tests et fermeture des manquants

| Sujet | Code | Restant pour la fin de production |
| --- | --- | --- |
| Basculer deux présentations sans recréer le front | V131 / V132 | Vérification navigateur / contrôles manette |
| Équiper le modèle sur trois vues du personnage et les guerres | V133 | Rendu visuel et alignement armure |
| Débloquer les 44 études avec des preuves réelles | V134 | Équilibrage des seuils sur les sauvegardes et expérience joueur |
| Conserver les preuves dans la campagne V13 | V134 | Tests e2e de migration, import/export multi-appareils |
| Sept calques Jungle Hunter | V134 | Revue photogrammes 1:1, pivots et textures |
| Les autres gauntlets | Catalogue V132 | Références individuelles, art et rig propre au propriétaire |
| Hologrammes spécifiques aux quatre modes | V133 | QA performance, résolution mobile, lisibilité |
| Audio des dix familles | V133 | Réglages acoustiques, balance et mixage en jeu |
| 54 gauntlets certifiés 1:1 | **0** | 54 revues individualisées nécessaires |

Fichiers structurants : `app/game/systems/gauntletCampaignV134.ts`, `app/game/save.ts`, `app/game/types.ts`, `app/game/systems/useHunterGauntletV133.ts`, `app/game/ClanWarGauntletLockerV132.tsx`, `app/game/JungleHunterLayeredV134.tsx`.

Tests directs : `tests/clan-war-gauntlet-research-v134.test.mjs`, `tests/clan-war-gauntlet-assets-v134.test.mjs`. La CI compacte effectue source checks, typecheck ciblé, lint, export PNG et audit de 54 états. Les builds complets, la revue des sprites, les captures en vraie scène et la validation de droits demeurent des étapes indépendantes.

Le classeur complet de suivi est `docs/Yautja_Gauntlets_V134_Arsenal_Clans.xlsx` (17 onglets), avec les 44 études, l'inventaire des sources, les états code/assets et 25 cas QA V134.

**Condition de fusion :** conserver la PR en brouillon tant que la revue des calques 1:1 et le parcours navigateur n'ont pas été acceptés. L'existence d'un test au vert n'autorise pas la mention « fidélité 1:1 terminée ».
