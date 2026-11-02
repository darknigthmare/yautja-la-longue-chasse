# Preserve V6 — intégration isolée du 2 novembre 2026

Quatre grandes traques originales sont jouables : Vharuun, Avar’Kesh, Khar-Duun et Iskhel. Chacune comporte 12 secteurs/19 200 unités, 24 adultes armés, six groupes/appareils/postes et 48 lots finis. Le moteur, les menus campagne/libre, le HUD, le carnet, les dangers et la sauvegarde admettent explicitement V6.

La sélection part de `03cf51b` et reprend PR82 `904cfa12` corrigée par PR84. Les plateformes, couverts, identités, décor et ordre de dessin V1–V5 restent exactement ceux de 03cf ; les déplacements de géométrie et la nouvelle décoration legacy contenus dans 82 sont exclus. Aucune sauvegarde ancienne n’est convertie.

## Vérifications

- **98/98 cas legacy** : 96 sur le moteur courant et deux anciennes assertions futur V4/V5 dans leurs vrais contextes publiés (V107 `711724e8`, V108 `515964be`). Leurs corps d’assertion restent inchangés ; les APIs et helpers de sauvegarde sont explicitement historiques. Les fixtures compressées et leurs empreintes sont sous `tests/fixtures/preserve-v6-history-20261102`.
- **15/15 cas physiques V6** : six vrais postes atteints par le simulateur, dangers, 48 lots conservés, départs échelonnés et art natif. Le seizième cas de la source concernait uniquement la décoration legacy exclue ; sa préimage intégrale reste conservée sous `tests/fixtures/preserve-v6-source-20261102`.
- **19/19 nouveaux cas** : parité exacte des états sérialisés/traces/terrains/dessin V1–V5 contre03cf ; V6 dans les slots, archives intégrales et refus/retry de quota ; frontières de version et identités croisées strictes.
- Types complets, lint produit/support, build Next production et deux générations déterministes : **PASS**.
- Vrai navigateur Next compilé : **24/24 contrôles**, **77 textures originales HTTP200**, **13 captures**, aucune erreur HTTP/console/JavaScript et octets source stables avant/après. Build `U2Sh9aPxw6W2ypYtmJq-w`, serveur local3116. Les nouvelles captures Canvas montrent les mondes sans overlay ; le carnet mobile est réellement défilé.

Le rapport navigateur complet compressé conserve les fixtures, entrées/sorties et toutes les empreintes des sources. `validation.json` décrit précisément les versions et les limites ; `INDEX.json` inventorie les pièces publiées. Les refus initiaux sont séparés dans `diagnostics` : ressources absentes du checkout clairsemé, liaison initiale incomplète d’un helper historique, et revalidation304 qui remplaçait dans le collecteur une précédente preuve200. Les ressources ont été matérialisées depuis 03cf ; aucune erreur HTTP n’a été masquée.

## Rejouer

```sh
node --test --test-reporter=tap --test-concurrency=1 tests/game-reserve-*.test.mjs
node node_modules/next/dist/bin/next typegen
node node_modules/typescript/bin/tsc --noEmit --incremental false
YAUTJA_NEXT_DIST_DIR=.next-dev-preserve-v6-20261102 node node_modules/next/dist/bin/next build --webpack
YAUTJA_NEXT_DIST_DIR=.next-dev-preserve-v6-20261102 node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3116
```

Fournir ensuite au driver `scripts/qa-preserve-grand-hunts-v6.mjs` `YAUTJA_QA_BASE_URL`, le vrai `YAUTJA_QA_BUILD_ID`, `CHROMIUM_EXECUTABLE_PATH` et une nouvelle sortie datée `YAUTJA_PRESERVE_V6_OUTPUT`. Le driver ne remplace aucun moteur, image ni résultat gagné. `scripts/build-preserve-history-v6-20261102.mjs` reproduit les fixtures depuis les objets Git historiques exacts ; il nécessite ces objets et ne modifie aucun checkout ou certificat.

## Limites maintenues ouvertes

La durée de 20 à 35 minutes, une victoire contre les 24 adultes, l’équilibrage complet, les FPS et la validation artistique/canonique finale restent à qualifier. Les parcours complets de six postes utilisent une fixture déclarée d’adultes déjà à terre ; ils prouvent les accès et les relevés, pas une victoire de combat. Le navigateur exerce réellement les quatre entrées saines, le clavier, un danger, la sauvegarde/reprise, le quota, le mobile, l’extraction, le refus V7 et le callback campagne.

Les certificats/gel/XLSX R7 publiés restent intacts et historiques. Ce build ne comprend pas encore les modifications des agents chasse et banques Homeworld ; le runtime combiné devra être vérifié après intégration.
