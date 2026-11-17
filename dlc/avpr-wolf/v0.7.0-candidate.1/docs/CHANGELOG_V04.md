# Changelog — AVP:R Wolf v0.4.0-candidate.1

## Passe production visuelle
- 4 sprite-sheets animées séparées : Wolf masqué, Wolf démasqué, Xénomorphe et Predalien.
- États : idle, marche, attaque, plasma et blessure pour Wolf ; idle/marche/attaque/blessure pour les xénomorphes.
- FX temps réel : plasma, sang acide, sang Yautja, Cleaner Fluid, Medicomp, mines, shuriken, Razor Whip, cloak shimmer, caméra shake.
- Décors enrichis par thème : monde Yautja, vaisseau, forêt, égouts/ruche, centrale, piscine, rues, magasin, hôpital/maternité, cage d’ascenseur, toit.
- Ambiances : pluie, vapeur, brouillard, étincelles et flash de la frappe finale.

## Fidélité AVP:R
- Duel final corrigé : le wrist gauntlet est endommagé, puis Wolf retire volontairement son équipement et son biomask avant le corps-à-corps.
- Le Predalien ne peut toujours pas mourir lors des rencontres intermédiaires.
- Fabrication puis perte du Plasma Pistol conservées.
- Accident du shuriken et issue nucléaire toujours verrouillés.
- Les 2 scènes propres à l’Unrated restent séparées du montage cinéma.

## UX / intégration
- HUD d’état de l’équipement de Wolf.
- Contrôles tactiles élargis : cloak, Cleaner Fluid, mine, Medicomp.
- Cartographie de route enrichie avec type de fidélité par nœud.
- Migration automatique de la sauvegarde `tantalus.avpr.wolf.v03` vers `tantalus.avpr.wolf.v04`.
- Standalone v0.4 embarquant les quatre sprite-sheets en data URI.
