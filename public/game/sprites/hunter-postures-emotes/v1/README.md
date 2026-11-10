# Yautja — Postures, rugissement et victoires · V2.1

## Contenu

Le pack contient **288 dessins source distincts** : les 96 transitions V1 et les 192 dessins ajoutés en V2. La révision **V2.1 corrige la lecture et les ancrages** ; elle ne compte ni les répétitions ni les sorties inversées comme de nouveaux dessins.

| Action | Entrée | Maintien animé | Sortie dédiée |
| --- | ---: | ---: | ---: |
| Accroupi sur une branche | 16 | 16 | 16 |
| Embuscade contre le tronc | 16 | 16 | 16 |
| Affût ouvert sur le tronc | 16 | 16 | 16 |
| Provocation — rugissement sans masque | 16 | 16 | 16 |
| Victoire — combistick et trophée levés | 16 | 16 | 16 |
| Victoire — trophée présenté près du visage | 16 | 16 | 16 |

- `frames/` : les 288 PNG individuels de 314 × 314 pixels.
- `atlases/` : les 18 planches originales de 1254 × 1254 pixels.
- `import_atlases/` : les 18 planches d’import de 1272 × 1272 pixels, avec des cellules de 318 × 318 et deux pixels transparents autour de chaque dessin.
- `stances/` : six copies de la dernière image d’entrée, exclues du total de 288 dessins.
- `animations.json`, `playback.json`, `anchor_measurements.json`, `import_atlases.json` : découpe, ancrages, durées et ordres de lecture.
- `contact_registration.json` : mesures des appuis, déplacements appliqués et limites de la correction V2.1.
- `runtime_atlases/` : six manifestes natifs de revue, en statut `draft`, et leur index de lecture.
- `sources.json`, `prompts.json`, `v1_baseline.json` : sources retenues, consignes de génération et empreintes de conservation.

## Lecteur et vidéos

Ouvrir `preview.html` avec le dossier `atlases/` à côté, ou servir le projet et consulter `/game/sprites/hunter-postures-emotes/v1/preview.html`. Le pack téléchargeable séparé fournit aussi un lecteur autonome.

Le lecteur permet pause, vitesse, fond, inspection image par image, maintien fixe ou animé et sortie dédiée ou réversible. **« Stabiliser les appuis » est activé par défaut** ; le désactiver montre le placement V2 pour comparer. Les modes « Entrée uniquement » et « Sortie uniquement » s’arrêtent sur leur dernière image. Lecture ou Recommencer relance une séquence arrivée à son terme. Les cycles complets et les maintiens continuent à boucler.

Deux vidéos distinctes sont fournies :

| Vidéo | Lecture | Dessins source distincts visibles |
| --- | --- | ---: |
| `Yautja_Postures_V2_1_Apercu.mp4` | Réglage conseillé : sorties réversibles | 192 |
| `Yautja_Postures_V2_1_Sorties_Dediees.mp4` | Revue de toutes les sorties dessinées séparément | 288 |

Chaque vidéo dure 11 secondes, sur deux pages de trois actions. Les transitions jouent à **16 i/s** et les maintiens à **10 i/s**. Le conteneur à 80 i/s répète exactement les images pour représenter ces deux cadences ; il n’ajoute aucun dessin ni interpolation. Les PNG restent les ressources de référence.

Le maintien conseillé suit **1 → 16 → 2**, puis revient à 1 : 30 positions de lecture pour 16 dessins, soit trois secondes. La sortie réversible relit les 16 dessins d’entrée en sens inverse.

## Corrections des appuis

Les 144 images du rugissement et des deux victoires utilisent maintenant un pivot horizontal mesuré sur les deux pieds. La mesure considère les huit rangées de pixels terminant à la ligne d’appui déjà repérée, sur toute la largeur du PNG, avec un seuil alpha de 128/255. Le milieu des deux composantes est recalé sur celui de la première image d’entrée de la même action.

`pivot.x = ancien pivot.x + milieu mesuré − milieu de référence`

Les pivots verticaux, les images et leur échelle restent identiques. Le lecteur et les manifestes appliquent la correction par déplacement au rendu. Les valeurs de placement antérieures restent accessibles dans les métadonnées de comparaison.

| Séquence | Étendue horizontale avant, selon le pied | Après correction, selon le pied |
| --- | ---: | ---: |
| Victoire au trophée — entrée | 26,16 à 26,83 px | 0,58 px |
| Victoire au trophée — sortie | 26,96 à 27,92 px | 0,91 px |
| Victoire au combistick — sortie | 13,19 à 14,12 px | 0,66 px |

Ces chiffres décrivent des centroïdes de silhouettes de pieds, avec des pivots fractionnaires. Le rendu vidéo arrondit les déplacements au pixel entier : le résidu y atteint environ 1,34 pixel au maximum pour ces trois séquences. Le rapport fournit les deux méthodes de calcul. Les anciennes mesures dans une zone horizontale limitée masquaient une partie du déplacement ; elles sont remplacées par ces mesures sur toute la largeur.

Le rugissement modifie aussi l’écartement dessiné des pieds. Le recalage stabilise leur milieu, mais ne supprime pas ces changements de pose. Il ne modifie pas l’anatomie, le dessin des accessoires ou l’échelle entre planches.

## Import et lecture native

Les planches brutes gardent leurs pixels et leurs traces alpha. Les variantes d’import ajoutent une garde de deux pixels entièrement transparents sur les quatre côtés de chaque cellule ; le contenu RGBA intérieur est identique. Le pivot d’import vaut `pivotSource + (2,2)`.

Les six manifestes `runtime_atlases/*.draft.json` suivent `HunterSpriteAtlas`. Chacun conserve les clips dédiés d’origine et ajoute `<action>_exit_reversible`. L’index `defaultPlayback` indique les clips d’entrée, de maintien, de sortie réversible et de sortie dédiée alternative. Les 24 clips contiennent **468 références de lecture pour 288 dessins source**, sur 18 pages. Les durées utilisent 80 ticks par seconde : 5 ticks par dessin de transition, 8 par dessin de maintien.

## Statut de revue

Le lot reste **draft**, conformément au contrat du projet qui réserve `validated` à une revue artistique humaine. Les ressources sont préparées pour l’import, sans association automatique au roster. Les raccords de proportions, d’anatomie, d’équipement, d’orientation et d’occlusion doivent encore être examinés dans la scène cible. Une correction d’ancrage ne constitue pas une validation de fidélité ou de fluidité en jeu.

La vérification du JavaScript du lecteur est effectuée dans un environnement simulant le DOM et l’horloge ; elle ne vaut pas essai dans un navigateur. Les aperçus vidéo sont composés hors navigateur.

## Réexport

Avec Node.js, `sharp`, `ffmpeg` et `ffprobe` disponibles :

```bash
node art-source/hunter-postures-emotes/v1/export_sprites.cjs
node art-source/hunter-postures-emotes/v1/build_runtime_manifests.cjs
node art-source/hunter-postures-emotes/v1/render_preview.cjs
node art-source/hunter-postures-emotes/v1/render_preview.cjs --dedicated
```

Le premier script reconstruit les métadonnées, les variantes d’import et les lecteurs à partir des planches originales et des ancrages. Les empreintes V1 protègent les 96 anciens PNG. Le deuxième reconstruit les manifestes natifs en brouillon. Les deux dernières commandes produisent les aperçus conseillés et dédiés. Aucun de ces scripts ne régénère les dessins.
