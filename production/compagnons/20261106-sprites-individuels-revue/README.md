# Compagnons — PNG individuels de travail

Date : 6 novembre 2026.
Destination demandée : PR #116, `darknigthmare/yautja-la-longue-chasse`, branche `claude/bible-de-campagne`.

## État réel

Ce dossier contient **39 fichiers PNG individuels**, chacun avec **un seul corps entier et une seule vue**, dans dix sous-dossiers d'identité. Les textes, cadres, portraits et autres personnages des planches ne sont pas incorporés aux fichiers de sprite. Dimensions : 80 × 96 pixels, sans agrandissement des pixels sources.

**Ce sont des brouillons : la fidélité artistique 1:1 demandée n'est pas obtenue ni certifiée.** Le générateur a continué à produire des planches non conformes. Les PNG de ce dossier sont des extractions individuelles de l'une de ces sorties, et non de nouvelles illustrations haute définition validées. Des signatures d'identité manquent, notamment la lance réparée de Ka'Reth et certains équipements. Les détails sont consignés par fichier dans `MANIFEST.json`.

La vue de dos d'Amara a été écartée : elle montrait un corps Yautja au lieu d'une humaine. Serekh/Amengi, Keth, Rhazor, Korr-Ma et les personnages hors catalogue mal interprétés n'ont pas été ajoutés à ce lot. Aucun héros canonique n'est présenté comme fidèle à son œuvre.

## Publication

**Aucun fichier de ce lot n'a été publié sur GitHub et la PR n'a pas été modifiée par cette passe.** Le connecteur disponible ne comporte que des opérations de lecture, et aucun accès Git authentifié utilisable n'est présent. Le patch joint est uniquement un fichier local : ce n'est pas un commit distant.

## Usage

Ces fichiers restent dans `production/compagnons/...`, hors de `public/`, pour une éventuelle revue. Ne pas les enregistrer comme ressources de production, ne pas activer un PNJ, ne pas modifier le recrutement ou les sauvegardes. Les références d'identité sont celles de `docs/campagne/CATALOGUE_COMPAGNONS.md` ; elles priment sur les noms et annotations erronés des planches générées.

Chaque fichier représente une vue statique. Quatre vues ne constituent pas un cycle de marche. Les pivots sont provisoires. Aucun parcours en jeu, contrôle de collision ou test d'animation n'a été effectué. Les champs `humanValidated`, `loreFidelityValidated`, `approvedForRuntime` et `inGameTested` restent `false`.

## Contrôle technique

Exécuter `python verify.py` depuis ce dossier. Le contrôle vérifie le nombre de fichiers, les identifiants, les empreintes, le décodage, les dimensions, la transparence, le contenu non vide et les marges. Il ne valide ni le lore ni la qualité artistique.
