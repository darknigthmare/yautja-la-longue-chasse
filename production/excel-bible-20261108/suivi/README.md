# Suivi consolidé Excel et bible — 8 novembre 2026

Le fichier courant est **Yautja_Suivi_Excel_Bible_20261108.xlsx**. Il rapproche les
déclarations des classeurs d’origine, les cartes de la bible V6, les critères des
annexes de campagne et les preuves de la passe du 8 novembre. Les originaux
restent intacts ; leur ancien statut n’est pas remplacé.

L’[avenant vivant de campagne](../../../docs/campagne/AVENANT_EXCEL_BIBLE_20261108.md)
explique le raccord du Berceau et sa reprise exacte, les accords et quartiers
des compagnons, les deux incidents du Clan Ship, la provenance des nouvelles
images et les limites de chaque livraison.

## Couverture des sources

| Objet observé | Volume | Interprétation |
| --- | ---: | --- |
| Classeurs d’origine | 108 | Tous lus ; SHA-256 conservé |
| Feuilles, copies comprises | 2 896 | Inventaire complet des classeurs |
| Contenus de feuilles distincts | 824 | Les copies identiques ne sont pas réadditionnées |
| Observations de statut ouvertes retenues | 11 111 | Lignes des suivis de famille et avenants sélectionnés |
| Sujets Excel regroupés | 8 625 | Un même ID dans un même domaine conserve toutes ses observations |
| Déclarations de suivis de famille courants | 6 148 | Portée documentaire, pas preuve de manque actuel |
| Déclarations d’avenants historiques | 2 477 | Historique conservé et clairement identifié |
| Cartes et scènes de la bible V6 | 4 304 | Contenu de conception, hors index et dédoublement des répliques |
| Documents Markdown de campagne | 37 | Texte principal, annexes, catalogues et rapports datés conservés |
| Documents et manifestes inventoriés | 73 | Markdown et JSON avec chemin et empreinte |
| Blocs de bible et annexes | 4 257 | Unités de lecture, dont 1 680 dans le texte principal ; pas un nombre de fonctionnalités |
| Règles et recettes des annexes | 118 | Compagnons 38, Warp 40, Berceau 28, mobilité 12 |

Ces volumes se chevauchent. Ils ne s’additionnent pas en nombre de fonctionnalités
manquantes, et aucun taux global de jeu terminé n’en est déduit.

## Lire les huit feuilles

- **Avancement** présente la couverture des sources et les comptages de preuves
  par phase pour les lots de cette passe.
- **Livraison** précise ce qui a été produit, intégré, testé par scénario,
  parcouru dans le navigateur et soumis à une revue artistique humaine. Chaque
  preuve a une portée et une limite explicites.
- **Ouverts Excel** conserve les critères, anciens statuts et cellules d’origine
  de chaque sujet. Les filtres distinguent domaine et portée documentaire.
- **Bible V6** conserve chaque carte/scène et les références repérées dans le code
  ou les données. Ces références facilitent la navigation ; elles ne démontrent
  pas qu’une scène est jouable.
- **Bible campagne** conserve les 37 documents : rites L, fiches R2 révisées,
  décisions, équipement, musique, catalogues de compagnons, Warp, mobilité,
  planètes/tribus, Berceau et rapports datés. Ses blocs sont des unités de lecture
  qui recoupent les cartes V6, pas un nombre supplémentaire de fonctionnalités.
- **Recettes bible** conserve les critères complets des quatre annexes, avec la
  qualification actuelle et les preuves disponibles.
- **Sources** répertorie les 108 fichiers, leur portée et leur empreinte.
- **Méthode** décrit la déduplication, la sélection et le sens des phases.

Les éléments générés ne deviennent pas automatiquement intégrés ou validés. Une
preuve de tests de modèle ne clôture pas une recette de rendu ou une session
humaine. Les contrôles alpha et pivots ne certifient pas la fidélité artistique.

## Rapprochements antérieurs documentés

Les anciennes lignes `AUDIO`, `DUNGEON` et `BROWSER` du château de Wolf restent
visibles avec leur déclaration d’origine. Elles sont rapprochées des modules
audio/mandat, du journal de 32 tests audio et du rapport navigateur `c77c4ea3`
conservés dans `production/wolf-castle-arrival-20261104/qa/`. Ce rapport antérieur
atteste 32 contrôles, dont le mandat royal et sa remise unique. L’audit présent
n’affirme pas avoir rejoué ces parcours. L’écoute humaine du mixage et la revue
artistique restent distinctes.

## Données et génération

Les fichiers JSON sont la base reproductible du classeur :

- `excel-inventory.json` : fichiers, feuilles, empreintes et portée.
- `excel-open-register.json` : sujets et observations des sources.
- `bible-requirements.json` : cartes/scènes V6 et critères des annexes.
- `bible-campagne-revisee.json` : 37 textes de campagne et inventaire de 73
  documents/manifestes, avec rubrique, identifiant natif et lignes source.
- `actions-prioritaires.json` : critères de réalisation transmis aux chantiers,
  dont les quinze `OPS-B01..15` du Clan Ship et les 56 exigences sources V112.
- `qualification-courante.json` : preuves nouvelles et rapprochements actuels,
  séparés des déclarations originales.
- `verification-classeur.json` : calculs vérifiés, scénarios de formule,
  références de prévisualisation et empreinte du livrable.

La base auditée est `254b4b972af3c32cb078da3744241b2c0ea2f46c`. Les sources sont
extraites avec la bibliothèque standard Python, puis le XLSX est créé avec
`@oai/artifact-tool`. Aucun classeur d’origine n’est réécrit.

```bash
python scripts/audit-excel-bible-20261108.py
python scripts/build-excel-bible-register-20261108.py
```

Pour l’auteur du classeur, copier
`scripts/build-excel-bible-workbook-20261108.mjs` dans un répertoire temporaire
inscriptible, y relier `node_modules` au runtime fourni, puis lancer avec le Node
fourni et `--repo-root <chemin-absolu-du-dépôt>`. Le script vérifie les empreintes
des sources, recalcule les formules, teste les différentes qualifications,
produit les aperçus et exporte le fichier courant. Les cellules de phase sont
modifiables dans Excel avec une liste de choix ; reporter toute modification
manuelle dans `qualification-courante.json` avant une génération ultérieure.

Après l’export, exécuter le contrôle indépendant :

```bash
python scripts/verify-excel-bible-workbook-20261108.py
```

Il relit le fichier en ZIP/XML sans le modifier, compare intégralement les
identifiants et critères des sujets Excel, cartes V6, blocs de campagne et
recettes, contrôle les qualifications et les caches des formules, puis vérifie
à nouveau les empreintes des 108 originaux et des 73 documents/manifestes.
Le résultat est ajouté à `verification-classeur.json`. Les aperçus de chacune
des huit feuilles sont conservés dans `apercus/`.

La passe finale compare **95 233 cellules**, dont tous les critères et blocs
des quatre corpus. Les **38 formules** exportées possèdent leurs résultats
en cache ; aucune cellule d’erreur n’a été trouvée. Les dix aperçus couvrant
les huit feuilles ont été relus. Ce contrôle porte sur le classeur.

## Limites conservées

Les suivis historiques, critères de conception et preuves automatiques n’autorisent
pas à déclarer que tout le jeu est fini. Les fonctions sans preuve propre, les
essais sur appareils physiques, les parcours humains, les sessions d’écoute et
la revue artistique restent explicitement à réaliser ou à qualifier.
