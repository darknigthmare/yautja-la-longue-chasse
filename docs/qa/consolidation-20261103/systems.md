# Consolidation systèmes — reprise du 3 novembre 2026

## Correction

La PR79 (routes V156) avait remplacé huit empreintes de tour dans la fixture historique V105. Les capsules de preuve V107 à V112 exigeaient les octets originaux et refusaient donc la préparation de la migration V111.

La fixture `tests/fixtures/clan-war-front-legacy-v105.json` est rétablie depuis le commit historique `59bcc32929b1d3f6ee6e967da8cab8c561ca6f1d`, avec son SHA256 original `5ffd9d2be6f20ca8e4086db59a2ddcf2caca17372654a6bdad612fe3e55226e1` (6 577 octets). Les résultats V156 existants sont conservés dans `tests/fixtures/clan-war-front-routes-v156.json`, avec leur propre provenance. Aucun manifeste ni archive de preuve historique n’est réécrit.

Le test actuel compare les trente états initiaux aux preuves V104 inchangées, puis les tours résolus aux preuves V156. Il limite explicitement les tours différents aux huit mondes dont les routes ont été complétées : Nivalis, Uranth, Améthys, Salarka, Vénéfra, Boralis, Dunara et Viridia. Les résultats ne sont pas recalculés pour fabriquer de nouvelles attentes.

## Vérifications

Les commandes, empreintes et périmètres exacts figurent dans [systems.json](systems.json).

- Migration V111 et convoyage : **23 tests réussis, aucun échec ni test ignoré**, code de sortie 0. La migration utilise réellement les sources V110 historiques et protège également le refus de lecture/écriture par l’ancien client.
- Bestiaire, routes V156, géométrie V157, chromatiques et compatibilité planètes V103/V115 : **101 tests réussis, aucun échec ni test ignoré**, code de sortie 0.
- TypeScript complet sans cache incrémental : code de sortie 0.
- ESLint sur les 127 fichiers JS/TS modifiés par les branches intégrées : code de sortie 0, aucun défaut bloquant. L’unique import inutilisé signalé a été supprimé et son fichier revérifié sans avertissement.
- La comparaison des entrées partagées modifiées des neuf manifestes historiques présents ne relève plus de différence. Les six manifestes utilisant la fixture restaurée conservent leur empreinte exacte.

## État de l’intégration

La branche locale `codex/systems-all-prs-20261103` contient les PR **27, 62, 64, 73, 79, 81, 83 et 94**. Cela ne déclare pas leur fusion sur le `main` distant.

Le parcours `scripts/qa-alien-base-archive-v1.mjs` a compilé son banc React mais n’a pas pu lancer Chromium : binaire Playwright 1243 absent. Les recherches dans `/usr`, `/opt`, `/root/.cache` et les espaces de travail n’ont pas trouvé de navigateur déjà installé. Aucun résultat navigateur ni validation visuelle n’est donc revendiqué. Le banc existant utilise des images substitutives pour vérifier les panneaux, filtres, liens et absence d’écriture de sauvegarde ; il ne qualifie pas l’apparence des assets ni le gameplay.

Le build final et les validations des interactions avec les autres groupes de PR doivent porter sur la branche combinée.
