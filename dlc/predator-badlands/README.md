# DLC — Predator: Badlands

Dossier dédié aux livrables de cette conversation, dans **Yautja — La Longue Chasse**. Le prototype d'origine a été créé comme DLC autonome d'Aliens: Tantalus Frontier ; ses intitulés historiques sont conservés.

## État réel de la PR

**Import partiel. Ne pas le présenter comme un transfert de toutes les images.** Le transfert automatisé de l'archive complète a été bloqué. Cette PR contient **35 fichiers originaux**, dont les **18 SVG**, les sources des deux campagnes, le lanceur modulaire, les deux codex, les manifestes, les notices et les tests historiques. Le jeu principal et ses sauvegardes ne sont pas modifiés.

Les **7 captures PNG** et le ZIP original ne sont pas encore dans Git. Le rapport visuel historique est préservé, mais ses images ne peuvent donc pas s'afficher sur un checkout de cette PR. Elles restent toutes dans le paquet complet de récupération ci-dessous.

La **v0.2.0** annoncée précédemment n'a pas pu être récupérée dans cette session et n'est **pas incluse**. Aucun fichier v0.1 n'a été renommé pour le faire passer pour une v0.2.

## Jouer depuis les sources déposées

Ouvrir `v0.1.0/JOUER_PREDATOR_BADLANDS.html`, en conservant `src/` et `styles/` à côté. Cette entrée utilise les sources séparées et ne dépend pas des captures PNG manquantes.

Le HTML tout-en-un original n'est pas committé comme doublon des sources. Il est reproductible **octet pour octet**, sans téléchargement, avec :

```sh
python3 dlc/predator-badlands/tools/build_standalone.py
```

La commande crée `v0.1.0/JOUER_PREDATOR_BADLANDS_STANDALONE.html` (67 354 octets), refuse les sources modifiées et refuse d'écraser un fichier différent. `--check` vérifie la reproduction en mémoire sans écrire. SHA-256 attendu : `f8be31ce49b3a1a6c7aa40c7cce0f974216e76ae16ab308e2c9d1b2e6b52f3f6`.

## Archive complète de récupération

[Paquet complet dans le Drive du propriétaire](https://drive.google.com/file/d/1hAjCv4l_32d0GGzIDjBTkRUGiwlUs0_i/view).

Ce paquet contient le dossier `dlc/predator-badlands/`, les **43 fichiers originaux**, dont **18 SVG et 7 PNG 1440 × 900**, le standalone original déjà construit, les codex, le rapport visuel, les tests et le ZIP original. L'accès Drive reste celui du propriétaire ; aucune permission publique n'a été ajoutée. Ce paquet n'est pas un fichier committé dans la PR.

Paquet d'import : **2 816 483 octets**, SHA-256 `c388eb34f0d49944538773ba70fc896712432a2db2e9f186a02d72cf316205e9`.

ZIP original : SHA-256 `65fba89f2148ee36cea58bafde3f93066f5a1883dea02f10dfef95350194b320`.

## Vérifications

```sh
node dlc/predator-badlands/v0.1.0/tests/test_badlands.mjs
python3 dlc/predator-badlands/tools/build_standalone.py --check
```

**198 assertions de données réussies localement.** Dans l'archive complète locale : les 42 empreintes du manifeste original, les 43 fichiers, les 25 images, 10 références HTML et la syntaxe des 2 JavaScript ont été vérifiés. Le standalone a été reconstruit puis comparé à l'original. Ces résultats ne prouvent pas la présence des PNG dans cette PR.

`v0.1.0/SHA256SUMS.txt` est le manifeste historique complet : son contrôle intégral signale donc les PNG manquants sur cette branche, ainsi que le standalone avant reconstruction. Aucun test navigateur n'a été rejoué pour cet import ; les résultats de `v0.1.0/tests/browser-smoke.json` sont historiques.

## Portée et précautions

Ce dépôt ne raccorde pas encore les campagnes aux menus ou sauvegardes natifs de Yautja. **Ne pas exécuter les installateurs Tantalus historiques sur ce dépôt** : ils ciblent un autre hôte et peuvent remplacer son dossier DLC. Ils sont préservés uniquement comme sources de la livraison.

Les SVG restent des placeholders stylisés ; aucune certification visuelle 1:1 n'est revendiquée. Les affirmations de fidélité présentes dans les documents historiques ne constituent pas une nouvelle vérification du lore. L'inventaire des éléments présents, reconstruisibles et manquants figure dans `IMPORT_STATUS.json`.
