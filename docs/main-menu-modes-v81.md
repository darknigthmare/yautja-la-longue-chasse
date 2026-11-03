# Accès aux modes depuis le menu principal — V81

Les boutons **The Pit** et **Game Reserve Planet** utilisent le vrai `CampaignFrontEnd`. Aucune page parallèle ni campagne artificielle n’est créée pour les ouvrir.

## Paliers et spoilers

- The Pit : ancien parcours adulte conservé, ou rite narratif Blooded vérifié.
- Reserve : ancien parcours adulte conservé, ou contrat narratif existant `reserve-hunt` satisfait : Blooded, coordonnées acquises et vaisseau personnel disponible dans une annexe appartenant à la campagne.
- Le rang éditable du profil ne remplace pas les reçus de la chronique. Une annexe de vaisseau absente, ancienne, incompatible ou appartenant à une autre campagne ne devient pas une preuve par son fallback.
- Avant ces paliers, un dialogue annonce les spoilers. Annuler/Échap/B ramènent au bouton d’origine ; Tab reste dans le dialogue. Le bouton d’accès anticipé constitue la confirmation explicite.
- Après les paliers, le raccourci monte le GameSession existant et garde ses contrôles de propriétaire, checkpoints et erreurs d’écriture. Quitter revient au menu principal après confirmation de l’autosauvegarde normale.

## Profil libre séparé

L’accès anticipé ne monte jamais GameSession. Les règles, combattants, stages, chroniques et scène Reserve existants sont réutilisés, avec les réglages de l’appareil.

Toutes les écritures du profil libre passent par `yautja-main-menu-bonus.v81.`. Cela concerne les résultats/runs The Pit, les checkpoints des chroniques et l’expédition de Vharuun. Le propriétaire interne stable du profil libre n’autorise aucune écriture dans les annexes du propriétaire de la campagne.

Le catalogue des cinq parties, les dix sauvegardes manuelles/deux autos, les rangs, armes, rites, vaisseaux et progrès de campagne restent intacts. Le collecteur d’archives du compte existant exclut ce préfixe : les données du profil libre sont locales et ne sont pas synchronisées. Un replay de duel peut rester disponible durant la visite ; aucune nouvelle promesse de synchronisation de replay n’est faite.

Un fichier libre incompatible/futur est conservé. Une nouvelle expédition remplace uniquement l’expédition libre et nécessite sa propre confirmation. Les écritures refusées ne sont pas annoncées comme réussies. Un autre onglet qui remplace l’expédition libre entraîne un refus plutôt qu’un écrasement silencieux.

## Vérification de ce lot

`tests/main-menu-modes-v81.test.mjs` couvre les paliers, leur résistance aux champs de profil falsifiés, la preuve du vaisseau en lecture seule, les clés du profil libre, une vraie mutation du système de sauvegarde The Pit, l’exclusion par le vrai collecteur cloud, les deux confirmations et leur annulation. Les anciens tests de menu et de checkpoints Reserve restent applicables.

`scripts/verify-main-menu-modes-v81.mjs` est une recette du jeu compilé, sans modification d’une sauvegarde utilisateur. Elle crée de nouveaux contextes navigateur, examine le menu et les confirmations en desktop/mobile, ouvre une chronique libre, déplace réellement le joueur dans Reserve, vérifie les retours et compare les données de campagne avant/après. Les captures doivent ensuite être regardées : l’existence de la recette ou le succès des tests unitaires ne constitue pas une preuve visuelle.

Par défaut, la recette utilise le serveur local compilé `http://localhost:4204` et un nouveau dossier sous `work-local/v81/qa`. Une exécution publique exige l’alias exact, `V81_EXPECTED_SOURCE_SHA`, `V81_PUBLIC_READY_AT`, `V81_PUBLIC_DEPLOYMENT_ID` et un `V81_QA_OUTPUT` explicite. Le contrat partagé `public-qa-contract-v81.mjs` vérifie les deux reçus réels de publication, READY, la relation SHA/HEAD et l’alias avant toute connexion/naviguation publique. Les sources des consommateurs, des modèles de fixtures et de la recette sont ensuite comparées au commit publié : les hashes disque bruts et Git LF restent séparés. Les erreurs brutes restent au rapport ; seul un abandon documenté de la navigation racine peut être filtré par ce contrat. Les captures locales et publiques ne sont jamais réutilisées l’une pour l’autre.

Cette demande n’ajoute pas de nouveaux combattants, stages ou secteurs Reserve. Elle rend les modes déjà intégrés accessibles depuis le menu et protège l’histoire lors d’un accès anticipé.
