# Badlands v0.2.0 — reconstruction du 6 novembre 2026

Cette version est une **nouvelle reconstruction fonctionnelle à partir de la v0.1 récupérée**. Elle n'est pas une récupération octet pour octet de la v0.2 annoncée précédemment. La v0.1 originale n'est pas modifiée.

## Contenu

69 scènes : 25 Weyland-Yutani et 44 Dek. Les 46 scènes héritées sont conservées dans leur ordre ; 23 raccords de gameplay sont identifiés par `bridge: true`, `canonLock: false` et un avertissement visible. Ils ne constituent pas de nouvelles scènes canoniques du film. Les références historiques sont conservées, sans nouvelle certification du lore.

Quatre plans de profondeur, caméra latérale, saut visible, portée et plan des attaques, munitions et rechargement finis, délais entre attaques, deux soins maximum lorsqu'un kit est disponible, boss en trois phases de cadence avec signal de préattaque, escorte conditionnée à la position des compagnons, relais à activer dans l'ordre, collecte sur quatre plans, sorties explicites et recommencement complet après défaite.

Les sauvegardes sont séparées par campagne et par emplacement manuel/automatique, avec secours `.bak`. La migration depuis la v0.1 conserve son entrée originale. Position, santé, ennemis, ressources, énigmes et progression sont sérialisés. L'échec du stockage est signalé à l'écran. Les ressources sont réinitialisées au changement de scène selon le paquet d'équipement de cette scène, pas gérées comme une économie globale de campagne.

Les 18 SVG historiques sont réutilisés par le rendu et le codex. Le retrait du fond opaque et les pivots sont des traitements du rendu ; les fichiers SVG d'origine restent inchangés. Thia portée suit le joueur ; Bud n'est pas ajouté avant son apparition prévue par les données. Les silhouettes restent des placeholders, pas de nouveaux sprites HD ou une fidélité visuelle 1:1 validée.

## Jouer

Depuis un checkout, construire le tout-en-un hors ligne :

```sh
python3 dlc/predator-badlands/tools/build_v02.py
```

Puis ouvrir `JOUER_PREDATOR_BADLANDS_STANDALONE.html` dans un navigateur. Les 18 SVG et les sources sont inclus dans ce HTML ; aucun téléchargement réseau n'est nécessaire au jeu. Le fichier déjà construit est fourni dans le paquet complet de la conversation. Pour le lanceur modulaire, servir l'ensemble du dossier DLC : il réutilise les données et SVG de `../v0.1.0/`.

A/D ou flèches : déplacement. Q : plan. Espace : saut. F : attaque. E : interaction. V : arme. R : rechargement. H : soin. Échap : pause. Les mêmes actions sont disponibles sur les boutons tactiles.

## Vérifications réellement exécutées

```sh
node dlc/predator-badlands/v0.1.0/tests/test_badlands.mjs
node --test dlc/predator-badlands/v0.2.0/tests/test_core.mjs
python3 dlc/predator-badlands/tools/build_v02.py --check
python3 dlc/predator-badlands/v0.2.0/tests/test_browser.py
```

198 assertions historiques rejouées ; 88 tests du nouveau moteur, dont l'objectif et la sortie de chacune des 69 scènes ; 86 contrôles Chromium, dont 69 chargements et des interactions clavier/tactiles réellement exécutées. Aucune erreur JavaScript relevée dans ce parcours.

**Limite des tests navigateur :** la politique de cet environnement interdit les navigations externes. Aucun contrôle de sécurité n'a été désactivé. Le standalone est rendu en mémoire dans Chromium (`about:blank`). Les tests de reprise emploient un adaptateur `Storage` déclaré et ne certifient pas une sauvegarde disque sur une origine HTTP réelle. Le comportement sans stockage a aussi été testé. Ce parcours ne remplace pas une partie humaine complète des deux campagnes.

Six captures du rendu sont fournies dans le paquet complet. Leur absence éventuelle de GitHub est explicitée dans le manifeste racine, jamais masquée par un statut « complet ».

## Limites restantes

Pas d'intégration aux menus/sauvegardes natifs de Yautja ; pas de déploiement ; pas de nouveaux bruitages, doublages ou cinématiques 1:1 ; pas de validation artistique humaine. Les événements hérités et les positions des acteurs restent à confronter au film scène par scène. La version vise la récupération et la jouabilité du prototype.
