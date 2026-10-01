# V70 — Temple, routes et services du clan

Ce lot poursuit la campagne et la vie du monde natal. Les lieux et dialogues nouveaux sont des créations originales du clan du jeu, pas des reproductions canoniques certifiées 1:1. Les assets, sauvegardes et missions publiés auparavant restent conservés.

## Contenu jouable

- **Temple des Trois Ombres, acte I — L’Ouverture** : neuf salles physiques reliées par des portes réversibles, terrasses, contrepoids mobile, trois configurations, préparation en triade, protection des survivants humains et combat contre un drone. Quinze preuves ordonnées, retour et rapport au maître. Le chapitre suit les demandes structurées de la conversation jeunesse, après les chapitres V68 et V69 réellement accomplis. Saar et Vek restent les compagnons établis. Young Blood est conservé ; ce premier acte ne termine pas le rite Blooded.
- **Architecture modulaire native** : une nouvelle image OpenAI transparente fournit six modules distincts — pilier, arche, escalier, porte, contrepoids et console — intégrés avec des rectangles, échelles et points de contact mesurés. L’image source reste intacte. Les personnages et le drone utilisent leurs bitmaps existants, sans prétendre livrer de nouvelles planches complètes d’animation.
- **Dix villages** : quarante postes de préparation locale, avec trois gestes guidés propres au biome. Les coffrets natifs reposent sur les tables mesurées ; la population et les routines V69 sont conservées. Les résultats de ces petits services sont temporaires dans la session : ils n’ajoutent ni objet, salaire, soin gratuit, rang ou preuve de chasse sauvegardée.
- **Navigation à pied** : dix routes depuis la cité et dix plans locaux, soit cent quatre-vingts approches villageoises. Les tracés utilisent les collisions réelles et les conditions d’accès existantes. Lire un atlas ne téléporte pas, ne découvre pas un lieu et ne déverrouille pas la Réserve.
- **Commanditaires** : motifs, briefings, consignes de terrain, retour au guide, remise et remerciements adaptés aux huit chapitres annexes V69. Les dix-huit actions et récompenses existantes restent inchangées. Un rapport abandonné ne s’affiche plus comme acquis après reprise ; une ancienne instruction des Piliers décrit maintenant le vrai timing d’avertissement.

## Persistance et cohérence

La sauvegarde globale passe de 10 à 11, avec migration préservant les anciens champs. Les versions futures sont protégées. Les quinze frontières de preuve du temple, les salles, le contrepoids et les coups du combat sont enregistrés immédiatement ; une écriture refusée fige la scène et conserve le même argument pour réessai. Les sauvegardes manuelles, propriétaires remplacés et lectures incertaines sont couverts.

Le garde humain conserve son image originale, mais ses bottes sont désormais ancrées à leur support alpha réel : l’ancienne marge transparente le faisait flotter de 21,60 unités. Sa hauteur peinte reste inférieure à celle du jeune Yautja. Les numéros de l’atlas local ne subissent plus l’écrasement de la projection du sol. Les captures diagnostiques restent conservées avant correction.

Une ancienne arrivée de région ou de corniche à l’état `at-city` ne remplace plus le chapitre actif lors d’une reprise d’archive. Sans chapitre actif, elle ramène directement à la cité. Un export pendant un refus d’écriture de jeunesse annonce explicitement qu’il contient la dernière progression confirmée ; l’action encore en attente reste dans la scène pour réessai et n’est pas annoncée comme sauvegardée dans cet export.

L’accès au poste de Réserve conserve son vrai prérequis : enquête autonome des Marches puis du Verre, distincte des rapports de faune villageois. Ce dossier sensible reste inaccessible à une jeunesse encore sans autorisation autonome. La présentation des missions doit expliquer cette différence, sans convertir un relevé de faune en enquête accomplie.

Le codex [homeworld-navigation-codex-v70.json](homeworld-navigation-codex-v70.json) décrit routes, approches, activités, salles, surfaces, portes et modules. Les mesures et règles des villages sont consignées dans [homeworld-village-codex-v70.json](homeworld-village-codex-v70.json).

Image : [temple-modules.png](../public/game/homeworld/v70/temple-modules.png), 1536×1024 RGBA, 2 390 561 octets ; SHA-256 `5490c9a2f87c6fe4b57364c72fc207362bf3d5d3f7ae335a4057136cf861ef93`. Le [prompt et la provenance](v70-generation/temple-modules-prompt.md) sont conservés. Il s’agit d’une architecture originale adaptée au jeu.

## Validation et publication

Les rapports de compilation, régression et navigateur sont renseignés à mesure de leur exécution. Les diagnostics de la première compilation ne servent pas de preuve visuelle finale. Un premier passage global a révélé six erreurs techniques de liens et jonctions dans le dossier temporaire de I: ; les vingt-quatre tests de ces trois fichiers repassent intégralement sur le NTFS du projet, sans modifier les protections ni exclure de test. Une nouvelle passe globale reste nécessaire sur la source finale.

La nouvelle passe complète sur la source gelée après tous les correctifs passe **2 312/2 312**, sans échec, annulation ou exclusion, en 754 191,6508 ms. Les compilations finales portable/vinext et Next/webpack passent, TypeScript est sans erreur et le contrôle du CSS compilé de The Pit passe. Le lint global ne contient aucune erreur et conserve trois avertissements préexistants sur les images.

Le temple final passe **21 tests ciblés** (inclus dans la suite globale), **9 contrôles navigateur et 43 captures inspectées**, sans erreur JavaScript ou HTTP. L’export sous quota est effectivement téléchargé et parsé : signe 0 confirmé dans le JSON, signe 1 encore en attente dans la scène ; le réessai enregistre ensuite exactement le signe 1. Les menus passent **12 scénarios et 18 captures** ; l’atlas passe **12 contrôles et 5 captures**, avec dix routes tracées et une approche réellement marchée au clavier. Ces prérequis de jeunesse sont issus de fixtures jouées dans les modèles précédents, pas de prologues annoncés comme rejoués dans ce navigateur.

La publication V70, le commit exact, Vercel READY, HTTP et les recettes publiques ne sont pas déclarés accomplis avant vérification.

## Travail encore distinct

Les six salles profondes prévues, chasses qualifiantes des camarades, reine, œufs, purge et véritable Blooding restent à produire. Le drone local ne les remplace pas. Les expéditions autonomes, le développement ultérieur de la campagne et les anciens objectifs The Pit, arènes, sprites, DLC et animations ne sont pas tous déclarés achevés par ce lot.
