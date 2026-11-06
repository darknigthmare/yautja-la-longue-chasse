# Predator (1987) — Chasseur / Proie

DLC autonome **V0.3.0 « Film jouable »**, issu de cette conversation, pour le dépôt
**Yautja : La Longue Chasse**. Ce dossier rassemble les sources, les deux campagnes,
les documents, les sept PNG originaux et les trois archives historiques complètes.
Il ne raccorde pas le prototype aux menus ou au moteur du jeu principal.

## Jouer

Ouvrir [`v0.3.0/JOUER_PREDATOR_1987.html`](v0.3.0/JOUER_PREDATOR_1987.html)
dans un navigateur, ou utiliser le lanceur `.bat` sous Windows. Aucun téléchargement
à l'exécution ni dépendance supplémentaire n'est nécessaire au standalone.

**Contenu des données :** 16 chapitres humains, 12 chapitres Jungle Hunter,
36 secteurs. La V0.3 conserve le déplacement multi-plans, les dossiers terrain,
les maîtrises, la pression de traque, les pièges et les états de duel du prototype.
Ce sont les systèmes de la version récupérée, pas de nouvelles fonctionnalités
produites pendant cet import. Aucune V0.4 n'a été fournie ou inventée.

## Organisation

- `v0.3.0/` : pack actif, 33 fichiers, comprenant le jeu HTML, sources, codex,
  rapport illustré, tests, scripts, installateurs et **sept PNG 1280 × 720**.
- `archives/` : les ZIP V0.1, V0.2 et V0.3, **octet pour octet**, avec leurs SHA-256.
  Chacun conserve ses 33 fichiers d'origine ; le nom de racine V0.1 utilisé dans
  les anciens ZIP n'a pas été réécrit à l'intérieur des archives.
- `qa/IMPORT_INVENTORY.json` : provenance, empreintes de chaque fichier importé
  et corrections d'empaquetage explicites.
- `qa/IMPORT_VALIDATION.json` : résultats de cette intégration, distincts des
  preuves historiques livrées dans les ZIP.
- `tools/import_archives.py` : import borné et vérification reproductible.

Le nom mal encodé de la prévisualisation de canopée devient
`captures/05_predator_canopee.png`. Ses octets PNG restent identiques.
Le README du pack indique maintenant V0.3 et la bonne clé de sauvegarde.
Le validateur lit le nombre réel de tests TAP au lieu de conserver « 16 » en dur.
Les fichiers de gameplay, le standalone et les sept images ne sont pas modifiés.

## Vérification

Depuis la racine du dépôt :

```sh
python3 dlc/predator-1987/tools/import_archives.py --check-only
```

Cette commande ne télécharge ni ne modifie les fichiers du dépôt. Elle vérifie
les trois archives, leurs CRC et leurs empreintes, les sept PNG, le contenu des
campagnes et tous les fichiers déclarés. Dans une copie temporaire, elle reconstruit
le standalone à l'identique, exécute les **18 tests Node**, contrôle la syntaxe du
moteur et relance le validateur. Python 3 et Node 22 sont les outils utilisés pour
cette vérification ; aucun `npm install` n'est nécessaire pour ce pack.

Pour reconstruire une copie depuis les ZIP du propriétaire, sans réseau :

```sh
python3 dlc/predator-1987/tools/import_archives.py --archive-dir /chemin/des/ZIP
```

Un fichier déjà présent mais différent est refusé, jamais écrasé silencieusement.
Les URL publiques épinglées dans l'importeur servent au transport initial ; le jeu
et les contrôles après import n'en dépendent pas.

## Limites et fidélité

Les sept PNG sont des **prévisualisations originales historiques**, pas des
captures prouvant une partie exécutée. Les illustrations et graphismes du prototype
ne sont pas certifiés visuellement 1:1. Les scènes, équipements et descriptions
proviennent du registre existant ; leur fidélité au film n'est pas réauditée ici.
Les raccords reconstruits et événements hors champ restent des adaptations.
Aucun média officiel n'est ajouté par cette importation.

Le succès des tests de données et de logique ne constitue ni une validation
artistique, ni un test navigateur, ni un build complet de Yautja. Le fichier
`v0.3.0/VALIDATION.json` reste un document **historique**. Le statut de cette passe
est celui de `qa/IMPORT_VALIDATION.json`.

Le script `v0.3.0/scripts/generate_content.py` est l'ancien générateur V0.1 avec un
chemin absolu : il est conservé pour provenance, **ne pas l'utiliser pour le build
actuel**. Les installateurs historiques visent `private-dlc/predator-1987/` et peuvent
remplacer une copie déjà installée ; sauvegarder celle-ci avant leur utilisation.
L'import GitHub ne les exécute que dans une fixture temporaire de test.

**Aucun changement de menu, sauvegarde principale, dépendance ou déploiement.**
La fusion de la PR et le raccordement natif restent des opérations distinctes.
