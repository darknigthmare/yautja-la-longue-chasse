# Accessoires physiques OPS-B01 et OPS-B02

Deux nouveaux PNG transparents complètent le lot initial de 13 images du
8 novembre 2026. Ils ont été demandés par l'implémentation des incidents pour
remplacer deux instances de consoles déjà présentes dans le vaisseau de clan.
Leurs images ne créent ni mur, ni pièce, ni obstacle supplémentaire.

| Exigence | Asset et clé | Instance existante | Point prévu | Taille maximale d'affichage | Collision existante |
| --- | --- | --- | --- | --- | --- |
| OPS-B01 | `sealed-isolator.png` / `sealedIsolator` | `berth-terminal`, hangar | (1060, 560) | 110 × 210 | 80 × 35 |
| OPS-B02 | `twin-circuit-relay.png` / `twinCircuitRelay` | `council-terminal`, conseil | (350, 550) | 105 × 205 | 80 × 30 |

Les chemins runtime sont
`public/game/clan-ship/incidents-v1/sealed-isolator.png` et
`public/game/clan-ship/incidents-v1/twin-circuit-relay.png`.
`app/game/clanShipIncidentArt.ts` expose `CLAN_SHIP_INCIDENT_ART` avec les clés
du tableau. Le manifest complet est `manifest.json` dans ce dossier, copié à
côté des PNG publics.

## Conception et provenance

Les deux appareils sont de nouvelles adaptations originales pour le jeu,
générées séparément avec `image_gen.imagegen`. L'isolateur a deux leviers
mécaniques distincts ; le relais a deux cartouches et conduits distincts.
Les plaques supérieures sont sombres et vides. **Aucun texte, voyant actif ou
état de panne n'est peint dans le sprite.** Le code d'incident possède les états,
les étiquettes et les voyants. Une pose mécanique dessinée ne prouve pas une
animation de levier ni un résultat de réparation.

La direction métal sombre/bronze usé est issue de l'inspection des ressources
du projet : l'armurerie v23 et `clan-ship/props/berth-console-v1.webp`.
Le relais `homeworld/v54/compact-relay.png` a également été inspecté : sa
silhouette est celle d'une construction et ne remplit pas le besoin de petit
appareil à deux circuits. L'équipe d'intégration a donc confirmé le besoin des
deux nouvelles silhouettes. Les images de référence n'ont pas été soumises
comme entrées à ces deux appels : les prompts décrivent le style et les formes
après cette revue visuelle. Les prompts exacts et chemins des sorties retenues
se trouvent dans `prompts/` et `generation-jobs.json`.

## Contrôles

Les deux fichiers mesurent **876 × 1796 px** en RGBA et représentent ensemble
**4 547 428 octets runtime**. Leur alpha couvre 0 à 255. Les contrôles confirment
un contenu visible non vide, une transparence effective, aucun pixel de bord
visible à alpha > 8, et des images décodées distinctes des 13 précédentes.
Les sources conservées et les PNG runtime sont identiques aux sorties natives
de génération. Aucun PNG antérieur n'a été écrasé.

| Asset | Bornes visibles (x, y, largeur, hauteur) | Pivot (x, y) |
| --- | --- | --- |
| Isolateur | (41, 15, 760, 1760) | (421, 1774) |
| Relais | (62, 25, 740, 1743) | (432, 1767) |

Le pivot est le centre inférieur des bornes visibles, calculé sans modifier les
pixels. Il reste une heuristique à vérifier en scène. Préserver le ratio natif
dans le rectangle maximal d'affichage ; ne pas étirer l'image pour le remplir.

L'inspection des sorties vérifie la présence des appareils entiers, les deux
commandes/circuits et l'absence de texte ou lumière d'état. La revue artistique
humaine, le contact au sol, la perspective et les recouvrements dans le jeu
restent distincts : `humanArtValidation: false`, `sceneValidation: pending`,
`canonicalFidelity: not-claimed`. Aucun clip animé n'est fourni.

Reproduire la vérification depuis la racine du dépôt, avec Python/Pillow :

```sh
python production/excel-bible-20261108/art/incidents/verify-incidents.py
```

Le script ne modifie pas les images ; il régénère les métadonnées de ce lot et
le nouveau catalogue d'incident. L'intégration et la QA fonctionnelle des
incidents sont suivies séparément par leurs scènes et systèmes de jeu.
