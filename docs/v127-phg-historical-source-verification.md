# V127 — Motifs historiques PHG (Aurora, Terror, Slice, Virus)

## Statut
Quatre textures 2D originales, inspirées de noms officiels et de captures de menus, sont inscrites dans l'atlas `public/game/assets/v127/phg-historical/atlas.webp` (1024×1024, quatre régions de 512×512), empreinte SHA-256 `8be3538f63b9ff4b990361f603d57f91040f3039c4c9c45486409224c17b4e2c`.

**Ce ne sont pas les cartes UV/PBR issues de Predator: Hunting Grounds, et les couleurs ne sont pas certifiées pixel à pixel 1:1.** Toutes les matières partagent les mêmes masques de silhouette transparents du rig Yautja ; aucune peau ne change la géométrie d'un biomask, d'un anneau ou d'une armure.

## Références
- Patch 2.08, 27 octobre 2020 : motifs Terror, Slice, Virus pour 8 classes ; Mottle Grape pour les mêmes 8 ; Mottle Dread pour Scout, Hunter, Berserker seulement. https://forum.predator.illfonic.com/t/patch-notes-2-08/15883
- Patch 2.39, 19 avril 2022 : Aurora et Predlocks Tank (niveau original 500), nouvelle teinte Exiled, sans information publiée sur ses pixels. https://forum.predator.illfonic.com/t/patch-notes-2-39/27316
- Patch 2.40, 28 juin 2022 : predlocks Tank abaissés au niveau 150 ; nouveau biomask Tank au niveau 87. https://forum.predator.illfonic.com/t/patch-notes-2-40/28174
- Capture de menus : Gator Virus, Classic Slice et Raptor Nuke (https://forum.predator.illfonic.com/t/female-predator-nuke-skin-and-waves-skin/19720), Raptor Fierce (https://forum.predator.illfonic.com/t/alpha-predator-customizations/12074) et Wolf Tension (https://forum.predator.illfonic.com/t/how-to-fix-skin-bug-for-wolf-predator-without-asking-illfonic/27024).

Les niveaux sont des données de PHG original et n'affectent pas la progression de notre fan-game. Les quatre matières V127 sont des **études sélectionnables**, pas des textures officielles. Les 34 dossiers d'audit visuel restent ouverts, même lorsque l'identité d'un motif est connue.

## Contrôle de qualité
Le test V127 doit vérifier : les 4 IDs distincts autorisés, l'empreinte de l'atlas, la sélection d'une seule tuile sur le canal peau, le masque RGBA original, le passage CSS/Canvas, l'absence de changement de stats/sauvegarde, et les restrictions de classes documentaires. Les captures de références ne doivent pas être copiées dans le dépôt : le code ne transporte que leurs URL.
