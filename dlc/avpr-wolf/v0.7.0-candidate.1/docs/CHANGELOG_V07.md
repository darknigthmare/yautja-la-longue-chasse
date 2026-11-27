# CHANGELOG — AVP:R WOLF v0.7.0-candidate.1

## Gameplay

- Ajout d'une chaîne de chasse temporisée (6,5 s) sur les actions Wolf pertinentes : nettoyage, scan, parade, esquive de pounce, kills, Power Punch et phases clés du Predalien.
- Multiplicateur de score progressif plafonné à +75 % ; subir des dégâts casse immédiatement la chaîne.
- Ajout de `bestChain` au bilan final et au débrief de chapitre.
- Ajout d'un système de trauma persistant et de charge acide.
- La mobilité est légèrement réduite avec un trauma élevé ; le Medicomp réinitialise le trauma et la charge acide.
- Les checkpoints enregistrent/restaurent désormais l'état de blessure et la chaîne de chasse.
- Correction des statistiques de précision : seules les attaques réellement à distance comptent comme tirs, avec `rangedHits` séparé des coups de mêlée.

## IA

- Mémoire d'alerte de 4,2 s après impact ou contact : le cloak ne remet plus instantanément un ennemi en état neutre.
- Rôles de meute Xénomorphe déterministes : hunter / flank-up / flank-down.
- Flanking multi-plans quand plusieurs Xénomorphes sont simultanément présents.
- Compteur de flancs subis dans le rapport de chasse.

## Predalien

- Télégraphe visuel avant attaque spéciale.
- Phase équipée : charge télégraphiée.
- Après retrait volontaire de l'équipement : dard caudal télégraphié.
- Une lecture/esquive réussie augmente le score et le compteur d'esquives du boss.
- Les cinq phases canoniques restent verrouillées : gauntlet damage → gear shed → inner jaw rip → final grapple → mutual fatality.

## Fidélité

- Correction de la première mêlée hospitalière : 3 Xénomorphes au total avant le segment shuriken, et non 4 dans l'ancienne simulation.
- Implémentation : 2 cibles au Plasma Pistol puis 1 cible au Cleaner Fluid ; la séquence suivante conserve 2 kills au shuriken.
- Aucun nouveau lieu ni survivant jouable ajouté.

## Présentation

- Nouvelle métrique HUD `CHAÎNE`.
- Débrief de chapitre non bloquant : rang, honneur, traces, salles parfaites et meilleure chaîne.
- Télégraphe circulaire autour du Predalien avec libellé CHARGE ou DARD CAUDAL.
- Bilan final enrichi : précision, chaîne max, flanking et attaques spéciales du boss évitées.

## Sauvegarde / QA

- Nouvelle clé : `tantalus.avpr.wolf.v07`.
- Migration automatique depuis v0.6, v0.5, v0.4 et v0.3.
- 94 tests ciblés.
- Routes complètes : Cinéma 45/45 et Unrated 47/47.
