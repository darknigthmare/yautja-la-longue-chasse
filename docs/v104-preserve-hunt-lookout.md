# V104 — Vharuun, expédition des Balises

L’expédition des Balises ajoute un quatrième secteur réellement traversable à Vharuun, la **Crête des Balises**, et un relevé à réaliser depuis sa route haute avant de retourner au point d’extraction. Vharuun et cette extension sont des créations originales du jeu. Le suivi atteint **4 secteurs sur 80 proposés**, avec **les huit combattants existants sur les cent visés**.

Le chantier poursuit `PRESERVE-EXPANSION-80` du [registre V99](v99-workstreams-source.json), la [première expédition V66](v66-game-reserve-delivery.md) et les [interceptions V98](v98-preserve-hunt-interceptions.md). Ces sources publiques ne nomment pas de quatrième secteur et ne fournissent pas sa carte : la Crête des Balises et son objectif sont une adaptation V104 déclarée, sans reconstitution d’une fiche privée ni attribution de lore canonique.

## Choisir le terrain

Depuis le menu principal, ouvrir Game Reserve Planet, accepter l’avertissement de spoilers et choisir **« Expédition des Balises · quatre secteurs et relevé du poste haut »** avant de lancer une nouvelle sortie. Le choix existe également dans l’entrée Game Reserve du dossier de campagne, lorsque ses conditions d’accès sont réunies. Le mode libre possède son profil local indépendant ; il n’accorde aucune récompense à une campagne.

Le choix initial reste **« Première expédition · trois secteurs »**. Reprendre une sortie conserve son terrain enregistré. Pour choisir un autre format lorsque cette sortie existe, ouvrir la confirmation de nouvelle expédition ; annuler conserve le document précédent. Une sauvegarde incompatible reste protégée.

## Terrain et objectif

Le terrain V2 mesure 6 400 × 540 unités. Le secteur ajouté occupe 4 800–6 400 ; cinq plateformes raccordent le Camp des Trophées au poste haut et trois nouveaux couverts interrompent réellement la vision et les projectiles. Les onze plateformes et six couverts historiques sont conservés à leurs coordonnées dans les deux formats.

Le relevé demande de rejoindre physiquement le poste, à x 5 840 et y 280, puis de maintenir Interagir pendant **120 ticks actifs, soit deux secondes**. Il exige le contact avec la plateforme, une position à 30 unités au maximum et l’absence de déplacement ou de blessure pendant le canal. Un saut, une perte de proximité ou le relâchement interrompt également le travail. La pause ne consomme aucun tick.

Le carnet conserve le tick et la position du relevé. Il affiche les quatre secteurs, la progression locale et le retour restant à effectuer. Les deux groupes humains poursuivent leur collecte, leurs réparations et leurs évasions pendant ce déplacement. Le relevé n’achève pas automatiquement l’expédition : il faut revenir à pied à l’extraction initiale et y terminer l’action de retour. Une sortie close distingue un relevé rapporté, un relevé abandonné après une défaite et un relevé non effectué.

## Sauvegardes historiques

Les checkpoints V1 gardent la paire `version: 1` / `reserveId: "vharuun-first-expedition"`, le monde de 4 800 unités, les bornes 40–4 760 et les secteurs 0–2. Leur factory et leur terrain ne sont pas convertis.

Les nouvelles sorties utilisent la paire `version: 2` / `reserveId: "vharuun-lookout-expedition"`, des bornes 40–6 360, quatre secteurs et le champ `lookout`. La normalisation refuse les mélanges de version et d’identité, les preuves partielles, futures ou placées hors du poste. Le garde de progression interdit les transitions entre formats, la suppression ou la réécriture d’un relevé, son ajout antidaté, les visites perdues et les régressions historiques des blessures, prises, pièces et évasions.

Les imports de campagne, emplacements manuels et archives intégrales conservent le checkpoint avec son format exact. Les checkpoints futurs restent protégés. La preuve structurée suit le contrat historique des sauvegardes du jeu ; elle n’authentifie pas cryptographiquement un document réécrit manuellement.

## Art réutilisé

Le rendu utilise les dix fichiers raster natifs déjà employés par V66 : fond de jungle, branches, plateformes industrielles, fougères, paroi mécanique, chasseur, silhouette de vaisseau et trois atlas humains. La paroi du poste est un réemploi explicite ; le marqueur de relevé est un élément fonctionnel de HUD. Aucun PNG nouveau, combattant supplémentaire, cycle d’animation du chasseur ou remplacement de prop final n’est annoncé par ce secteur.

## Validation

- Les suites Preserve V66, V98, V99 et le nouveau modèle V104 passent **48 vrais sous-tests**, zéro ignoré. Les huit cas V104 incluent une marche depuis l’extraction, des sauts entre les branches, le relevé et le retour physique. Leur fixture déclare les huit humains déjà abattus ; elle ne revendique pas une victoire de combat jouée.
- Trois tests supplémentaires vérifient les imports réels, sauvegardes manuelles, archives intégrales et protections V1/V2/futur. Le relevé du test de persistance est une fixture structurée distincte ; le test de traversée obtient son relevé par les pas réels du moteur.
- Le lint strict des fichiers runtime et tests concernés passe sans avertissement.
- `scripts/qa-preserve-lookout-v104.mjs` passe **25 contrôles sur le serveur Next de développement local**, avec dix captures réellement ouvertes et 425 échantillons de route. Il couvre aussi le relais réel du dossier de campagne vers une sortie V2, dans une fixture adulte historique explicitement déclarée. Les sources Preserve restent identiques avant/après.
- La même recette passe **25 contrôles sur le build Next compilé local** `KfYVJdIUFim-1m9MRRQ6_`, runtime gelé `a974424b`, avec **dix nouvelles captures réellement ouvertes**, 428 échantillons de marche/sauts et aucune erreur JavaScript. Le relevé est obtenu au tick 1 688, à x 5 841,6 / y 280 ; le retour physique se termine au tick 3 281 à x 115 / y 438. Le relevé et les quatre visites restent identiques après rechargement et clôture. Les empreintes des sources Preserve avant/après correspondent. Cette portée est déclarée `PASS_CIBLE` dans le [rapport portable](v104-preserve-hunt-validation.json), qui conserve les reçus SHA, observations des captures et états réels.

Les deux recettes navigateur reprennent les mêmes 25 contrôles ; elles ne forment pas 50 contrôles uniques. Le parcours complet de géométrie commence à l’extraction avec les huit humains déjà abattus dans une fixture déclarée, puis utilise les commandes réelles pour marcher, sauter, relever et rentrer. Les trois contrôles d’entrée en campagne utilisent une autre fixture adulte historique et restent distincts des trois tests d’import/slots/archives. Aucune victoire de combat, progression narrative jouée ou publication/CDN n’est déduite de ces recettes locales.

```sh
node --experimental-strip-types --test --test-concurrency=1 \
  tests/game-reserve-v66.test.mjs tests/game-reserve-campaign-slots-v66.test.mjs \
  tests/game-reserve-tactical-v98.test.mjs tests/game-reserve-interception-review-v98.test.mjs \
  tests/game-reserve-supply-denial-v99.test.mjs tests/game-reserve-logistics-review-v99.test.mjs \
  tests/game-reserve-lookout-v104.test.mjs tests/game-reserve-lookout-persistence-v104.test.mjs

YAUTJA_QA_BASE_URL=http://127.0.0.1:3100 \
  YAUTJA_PRESERVE_V104_OUTPUT=outputs/qa-preserve-v104/production \
  node scripts/qa-preserve-lookout-v104.mjs
```

Les autres secteurs, combattants, portraits, animations et objectifs du chantier restent ouverts. La durée cible historique de 20–35 minutes et une fidélité officielle 1:1 ne sont pas certifiées par ce lot.
