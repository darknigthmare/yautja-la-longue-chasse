# Compagnons — modules et acteurs du 8 novembre 2026

Ce lot livre **13 nouvelles images PNG individuelles** : 10 modules vides et
3 acteurs entiers. Les fichiers de jeu sont des copies exactes des sources
sélectionnées, sans recadrage, recoloration, miroir, redimensionnement ni retouche
par code. Les 13 PNG représentent **31 823 017 octets** dans `public/` ; une copie
source identique est conservée dans ce dossier. Chaque image ne fournit qu'une
pose ou un état natif. **Aucun cycle animé n'est livré par ce lot.**

Les modules répondent aux familles et contraintes de résidence décrites dans
`docs/campagne/COMPAGNONS_ET_ALLIES_PREMIUM.md` (§5.3, ALL-03, ALL-05, QA-C28) et
aux identités de `docs/campagne/CATALOGUE_COMPAGNONS.md`. Les trois acteurs
permettent d'afficher les identités C2 déjà décrites dans le catalogue :
**Brèche ORG-01**, **Lance-Fendue ORG-16** et **Opale ORG-13**.

## Livraison

| Image | Clé runtime | Dimensions natives |
| --- | --- | --- |
| Alcôve de chasseur | `hunterAlcove` | 1920 × 819 |
| Baie de maintenance synthétique | `syntheticBay` | 1536 × 1024 |
| Chenil blindé | `armoredKennel` | 1774 × 887 |
| Cabine humaine adaptée | `humanCabin` | 1920 × 819 |
| Perchoir arboricole | `arborealPerch` | 1024 × 1536 |
| Bassin amphibie | `amphibianBasin` | 1920 × 819 |
| Refuge sombre | `darkNest` | 1536 × 1024 |
| Atelier de Serekh | `serekhWorkshop` | 1536 × 1024 |
| Maintenance de Dra’Kel | `drakelMaintenance` | 1536 × 1024 |
| Socle d’Ossuaire | `ossuaryDock` | 1536 × 1024 |
| Brèche | `breche` | 1536 × 1024 |
| Lance-Fendue | `lance-fendue` | 1024 × 1536 |
| Opale | `opale` | 1024 × 1536 |

Les modules sont dans `public/game/companions/quarters-v1/`, avec les sources
dans `sources/` et le catalogue `app/game/companionQuarterArt.ts`.
Les acteurs sont dans `public/game/companions/actors-v1/`, avec les sources
dans `actors/sources/` et le catalogue `app/game/companionPilotArt.ts`.
Les deux manifestes, `manifest.json` et `actors/manifest.json`, donnent les
chemins exacts, empreintes SHA-256, poids, alpha, dimensions, pivots et exigences.

**Éclisse est un import existant distinct**, conservé dans le second catalogue.
Ses 627 508 octets et son dessin provenant de la PR #119 ne sont pas comptés
parmi les 13 nouvelles générations. Son origine est décrite dans
`../compagnons/eclisse-import.json` et son empreinte est vérifiée de nouveau par
`actors/verify-actors.py`.

## Direction artistique et références

Les modules sont des adaptations originales de la bible du jeu : métal noirci,
bronze usé, éclairage ambre discret, accents cyan ponctuels, cadrage entier
destiné à la vue du vaisseau. Aucun occupant n'est peint dans ces images.
L'armurerie existante
`production/ship-interior-25d-20261105/art/source/armory-rack.png` a servi de
référence de matière ; la nouvelle alcôve a ensuite servi de référence commune
aux autres familles. Les dix modules ne sont pas de simples recolorations.

Les images des trois personnages sont des **propositions originales**, fondées
sur leurs fiches. Brèche reprend l'anatomie de référence d'un Hell-Hound de 2010,
avec une référence photographique de l'accessoire publiée par Propstore :
[fiche de l'accessoire](https://uk.propstoreauction.com/view-auctions/catalog/id/78/lot/18431/index.html)
et [photographie utilisée](https://uk.propstoreauction.com/images/lot/4058/40580_0.jpg).
La photographie est un apport anatomique ; elle n'est pas copiée dans les assets
runtime. Lance-Fendue utilise l'ancien instructeur du projet comme référence
de matière et d'espèce, avec une identité distincte demandée dans le prompt.
Le visage, les vêtements et les détails d'Opale constituent une interprétation
originale de sa fiche ; la bible ne fournit pas un portrait définitif.

`generation-jobs.json`, `actors/generation-jobs.json` et les dossiers `prompts/`
conservent les demandes exactes, les sources utilisées et les sorties retenues.
`reference-provenance.json` donne les empreintes des trois références initiales.
La baie synthétique a reçu une seconde génération de détourage par l'outil image ;
sa première candidate est identifiée dans le manifeste de génération. Seule la
sortie finale sélectionnée est publiée. Aucune retouche de pixels n'a suivi.

Brèche regarde vers la gauche ; Lance-Fendue et Opale vers la droite. Le sens
est consigné dans le manifeste des acteurs. Le catalogue runtime n'impose aucun
miroir et ne prétend fournir toutes les orientations.

## Contrôles et limites

Les contrôles techniques des 13 images ont réussi : décodage PNG, pixels
visibles non vides, transparence effective, aucun pixel de bord à alpha supérieur
à 8, images distinctes, égalité des empreintes source/runtime. Les dimensions et
bornes visibles sont mesurées dans les pixels natifs. Le pivot fourni est le
centre horizontal des bornes visibles au dernier pixel visible inférieur.
**Ce pivot est une heuristique, pas une validation du contact au sol.**

Une inspection visuelle des sorties a vérifié la présence de la silhouette
entière, de l'équipement principal et du cadrage. Elle ne vaut pas approbation
artistique humaine. L'angle caméra, l'échelle réelle, les recouvrements dans les
pièces, les appuis au sol et les traits distinctifs, notamment la crête de
Brèche, restent à examiner en scène. Tous les champs `humanArtValidation` sont
`false`, `canonicalFidelity` reste `not-claimed` et les acteurs restent
`motionStatus: static-draft`.

L'intégration fonctionnelle de résidence et la QA en jeu sont suivies séparément
dans `../compagnons/`. Une image générée ne termine ni le recrutement, ni la
quête du personnage, ni ses déplacements, ni les animations, ni la revue 1:1.
Le module doit rester conditionné à un compagnon recruté, affecté au vaisseau
concerné et dont l'installation est achevée. Un allié déployé conserve son module
mais son acteur disparaît. Les huit services de base restent distincts.

## Reproduire les mesures et ouvrir l'aperçu

Depuis la racine du dépôt, avec Python/Pillow :

```sh
python production/excel-bible-20261108/art/verify-assets.py
python production/excel-bible-20261108/art/actors/verify-actors.py
node production/excel-bible-20261108/art/render-preview.mjs --html-only
```

Les deux premiers scripts ne modifient pas les pixels. Ils réécrivent les
manifestes et catalogues à partir des PNG présents et renvoient une erreur si
un fichier manque ou qu'un contrôle échoue. Le troisième crée `preview.html`,
avec des chemins relatifs portables. Il affiche les 13 sorties sur deux fonds,
à 240 px maximum, et n'effectue aucun contrôle navigateur dans ce mode.

Pour une capture de cet aperçu dans un environnement autorisant Chromium :

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node production/excel-bible-20261108/art/render-preview.mjs
```

Le script utilise `playwright-core`, dépendance verrouillée du dépôt.
L'essai navigateur de cette session a échoué au lancement de Chromium
(`socket() failed: Operation not permitted`). Aucune capture n'a été produite
et aucun passage navigateur réussi n'est revendiqué. L'HTML est disponible ;
la capture de l'aperçu et la validation réelle en scène restent séparées.

Guide de production appliqué : `docs/GAMEDEV_AGENT_GUIDE.md` et
`create-game-assets` au commit amont
`19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9`.
