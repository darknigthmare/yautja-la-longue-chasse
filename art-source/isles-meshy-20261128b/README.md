# The Isles · modèles Meshy du 28 novembre 2026, second lot

Dix-huit modèles 3D pour les transports et la faune de The Isles : douze véhicules et six animaux, générés sur décision du propriétaire du projet. Les descriptions sont originales et ne reprennent aucune marque, aucun logo ni aucune livrée de compagnie existante. Le premier lot du jour est dans `art-source/isles-meshy-20261128`.

- **Outil** : Meshy CLI 0.4.0. Géométrie en text-to-3d (preview, environ 8 000 triangles), texture en refine 2k sans cartes PBR. Aucun rigging : les véhicules n'en ont pas besoin et les animaux sont animés par le code.
- **Compte** : celui du propriétaire, par la clé enregistrée dans l'environnement.
- **Crédits consommés** (champ `consumed_credits` des tâches) : 19 × 20 (preview) et 22 × 10 (refine), soit 600. Le détail : 18 modèles à 30, une seconde géométrie pour le ferry (20) et une seconde texture pour quatre véhicules (4 × 10).
- **Licence** : les modèles relèvent des conditions du plan Meshy du compte. À vérifier avant une diffusion commerciale.

| Modèle | Rigging | Description (`models.json`) | Remarque |
| --- | --- | --- | --- |
| metro | non | voiture de métro gris acier, bande turquoise unie | |
| train | non | locomotive diesel de voyageurs, vert sombre et bande crème | seconde texture : la première portait un numéro |
| train-fret | non | wagon de marchandises rouge rouille à parois nervurées | seconde texture : la première portait un marquage ; la forme est celle d'un wagon tombereau plutôt que d'un wagon plat avec conteneur |
| bus | non | bus urbain jaune pâle à bandeau gris | seconde texture : la première portait un faux lettrage |
| camion | non | semi-remorque, cabine bleu sombre, remorque fermée blanche unie | |
| pickup | non | pick-up tout-terrain sable, poussiéreux | relief de flanc de pneu sans mot lisible |
| ferry | non | petit ferry blanc et marine | seconde géométrie (`promptEssai1` garde la première description) ; la forme est celle d'une vedette à passagers avec un pont à voitures court, et un petit fanion rouge uni |
| bateau | non | bateau de pêche côtier bleu et blanc | petit fanion uni sur la timonerie |
| avion | non | biréacteur de ligne blanc sans marquage | |
| avion-brousse | non | hydravion monomoteur à ailes hautes, crème à filet rouge | l'envergure dépasse la longueur du fuselage |
| helicoptere | non | hélicoptère civil léger orange | seconde texture : l'immatriculation a disparu, il reste un petit signe de trois caractères sous la cabine |
| telepherique | non | cabine de téléphérique rouge à toit gris | |
| ours-brun | non | ours brun debout sur ses quatre pattes | |
| loup | non | loup gris debout | |
| cerf | non | cerf mâle à bois | |
| lion | non | lion mâle à crinière | |
| buffle | non | buffle africain | |
| requin | non | requin de récif en nage | |

Chaque dossier contient :
- les réponses des tâches (`task_*.json`) ;
- l'aperçu (`preview.png`) ;
- le modèle texturé (`model.glb`) ;
- pour train, train-fret, bus et helicoptere, `preview-essai-1.png` : l'aperçu de la première texture, écartée. Le fichier `model.glb` est celui de la seconde.

Le dossier `20261128_144730_ferry_01a222a0` ne contient que la première géométrie du ferry, écartée avant texture ; `state.json` la consigne sous `ferry-essai-1`.

`state.json` garde les identifiants des tâches, ce qui évite de relancer un travail déjà payé. `texturePrompt` (dans `models.json` et `state.json`) est la consigne de texture envoyée pour la seconde texture, et `refineEssai1` l'identifiant de la première.

Orientation : comme dans le premier lot, l'avant d'un modèle en jeu est +Z. Les six animaux sont générés ainsi. Les douze véhicules ont leur avant vers -X ; le registre `app/game/data/islesModelsV1.json` leur donne `yaw` = 1,5708. La valeur `length` de `models.json` est celle du registre : elle s'applique à la plus grande dimension horizontale du modèle (l'envergure pour avion-brousse).

Les fichiers du jeu sont produits par `node scripts/build-isles-models-v1.mjs`, qui traite les deux lots :
- textures intégrées réduites à 1024 px en JPEG, géométrie inchangée ;
- sortie dans `public/game/isles/models/` (12,5 Mo pour les 18 fichiers de ce lot, de 0,47 à 0,85 Mo chacun), avec `manifest.json` ;
- `--check` vérifie que les fichiers publiés correspondent aux sources et que ceux de ce lot restent sous 1,2 Mo.
