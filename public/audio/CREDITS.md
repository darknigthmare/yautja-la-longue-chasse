# Crédits audio V54

Effets et boucle du vaisseau adaptés de Kenney :

- Interface Sounds — https://kenney.nl/assets/interface-sounds
- RPG Audio — https://kenney.nl/assets/rpg-audio
- Sci-fi Sounds — https://kenney.nl/assets/sci-fi-sounds

Ces packs sont distribués sous CC0-1.0 : https://creativecommons.org/publicdomain/zero/1.0/
Les textes de licence des archives sont dans `licenses/`. Les correspondances originales, empreintes et traitements sont dans `provenance-v54.json`.

Les motifs trophy/victory/defeat sont des créations procédurales originales du projet, sans échantillons tiers. Les fichiers de ce lot ne sont pas des sons officiels Predator ou Alien vs Predator. Aucun soutien des auteurs ou ayants droit de la franchise n'est impliqué.

Le lot V54 laissait les musiques, les voix et d’autres ambiances à produire. Une écoute artistique du mix reste nécessaire ; les tests techniques ne constituent pas une approbation subjective.

## Retour du Berceau (R2‑M027)

`sfx/armor-repair/berceau.wav` est un effet original généré par `node scripts/build-cradle-return-audio.mjs`. Il combine la fermeture de la pince, la décontamination et le verrouillage final. Le délai initial laisse le Medicomp audible. Source procédurale mono en PCM 24 kHz, sans échantillon tiers.

Les pistes `music/cradle-return/MUS-15-retour.mp3` et `music/ship/MUS-02-veille.mp3` sont deux compositions instrumentales originales à partir de la bible de campagne. « Retour » suit une progression de la mineur vers do majeur sur 90 s à 64 BPM. « Vaisseau, veille » est une boucle de 180 s à 60 BPM, avec un bourdon moteur, un arpège et le rappel du motif. Les masters PCM mono 24 kHz se régénèrent avec `node scripts/build-cradle-return-audio.mjs --masters <dossier>`. Les versions intégrées sont encodées en MP3 mono à 48 kb/s avec lamejs. La recette du Berceau vérifie leurs empreintes à partir du manifeste. [Source de l’encodeur](https://github.com/zhuker/lamejs/tree/582bbba6a12f981b984d8fb9e1874499fed85675)

## Thème d’accueil et surfaces planétaires

`music/menu/mus-01.ogg` est une composition originale de trois minutes à 72 BPM en ré mineur. Le motif descendant et la texture grave suivent la fiche MUS-01 de la Bible. La synthèse stéréo est régénérable avec `scripts/generate-menu-theme-mus01.mjs`.

Les pistes `ambience/*/surface-v173.ogg` sont huit boucles originales de 18 secondes. Les paramètres de vent, de relief et de résonance sont définis par milieu dans `scripts/generate-planet-ambiences-v173.mjs`. Le programme encode en Vorbis stéréo à 24 kHz et vérifie les canaux, la durée et le raccord PCM. Les deux créations utilisent uniquement de la synthèse.
