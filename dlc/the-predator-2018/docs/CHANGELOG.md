# Changelog — v0.5.0-candidate.1

## Gameplay

- Ajout des chaînes d’objectifs multi-phases par type de micro-zone.
- Ajout de vagues de renfort finies et budgétées.
- Ajout des dangers environnementaux et de leurs effets de gameplay.
- Ajout de la cohésion humaine et des ordres Suivre / Concentrer / Tenir.
- Ajout du momentum Predator et de ses bonus de pression/énergie.
- Ajout de rôles tactiques aux ennemis et de télégraphes pour les boss.
- Ajout de la maîtrise des événements miroir Humains/Predator.

## Intégration

- Protocole hôte v2 bidirectionnel.
- Nouvelles commandes hôte : snapshot, start, resume, pause, difficulty, squad-order.
- Nouveaux événements : room-enter, objective-phase, reinforcement-wave, boss-telegraph, squad-order, mirror-complete et command-ack.
- Miroir de reprise conservé en sessionStorage et toujours isolé des sauvegardes principales.

## Sauvegardes

- Nouvelle clé v5.
- Migration v4/v3/v2 → v5.
- Conservation des records, honneurs, micro-zone, cohésion, momentum, ordre et maîtrise miroir.

## QA

- 146/146 contrôles Node.
- 52/52 scènes Chromium.
- 14/14 scénarios interactifs.
- 0 erreur runtime.
