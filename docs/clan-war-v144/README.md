# V144 — Quatre modes de guerre des clans poursuivis en parallèle

**PR empilée sur #53 (V143)**. Les anciennes PR de la chaîne V115–V143 ne sont pas écrasées et la PR parallèle #42 du gauntlet reste indépendante.

## Ajouts codés

| Mode | Nouveau comportement de gameplay | Coût, contraintes et limites |
|---|---|---|
| **Assaut latéral** | `commandWarAssaultBaseScreenV144` : un groupe vivant réellement revenu près du bastion protège celui-ci d'un seul choc ennemi, jusqu'à **6 PV** | **16 AP** et une utilisation par équipe ; écran au maximum **3 ticks**, jamais de soin, d'armure canonique ou de renfort fictif. La protection ne s'active que si une véritable attaque touche le rempart pendant que le défenseur est présent |
| **Outer Ops** | `commandWarOuterPaceV144` : marche forcée choisie en première partie de trajet, retour avancé de **8 secondes**, résistance d'exercice **+2** à la résolution | **3 RAV** réellement dépensés, aucun renseignement ennemi gagné, aucun rapport anticipé sans arrivée. Exclut halte V137 et incident V143 pour ne pas manipuler plusieurs horloges ; rappel ultérieur reste possible. Contrôle strict des archives |
| **Infiltration/sabotage** | `warStealthReinforcementV144` et `warStealthSecondGuardStepV144` : apparition d'un **second garde de simulation après une alerte réelle**, sur une cellule traversable de l'environnement W3, et déplacement physique indépendant | Jamais d'apparition dans un mur, sur le joueur ou sur le garde initial ; un pas maximum par tour, deux lignes de vue indépendantes. Une archive V115 sans second garde reste compatible. La position du renfort hors du champ de vision demeure invisible dans l'interface |
| **RTS multi-escouades** | `commandWarRtsSwapV144` : deux formations **adjacentes, vivantes** échangent leurs véritables cases en **un seul tick** ennemi | Aucun RAV ni recrutement gratuit ; porte sans courant, danger imminent, escorte portée, poste tenu et occupation adverse interdisent l'ordre. Le mouvement annule les postures de veille / de couvert pour les deux formations |

Ces nouveaux systèmes sont des **mécaniques originales du jeu** utilisant les acteurs/terrains de la Bible V6 et W3, et non des éléments certifiés comme canoniques dans les œuvres Predator. Le mode principal prévu demeure de type **Dynasty Warriors**, avec quatre game modes complémentaires (l'assaut latéral, les Outer Ops, l'infiltration et le RTS).

## QA et traçabilité

Le fichier `tests/clan-war-four-modes-v144.test.mjs` teste les quatre modes, les coûts AP/RAV, les durées, les patrouilles sur plusieurs régions, les rejets et la compatibilité V115. `.github/workflows/clan-war-v144.yml` ajoute ces tests aux régressions V115–V143, à TypeScript et ESLint.

Le classeur V143 canonique de **73 onglets** reste dans la PR #53 : `docs/clan-war-v143/Yautja_Guerres_Clans_Suivi_Production_V143_2026-10-31.xlsx`. Un registre complémentaire **V144** est ajouté dans cette PR avec les exigences et tests nouveaux, une matrice inter-modes et les liens à l'historique sans prétendre dupliquer ni réécrire les 73 feuilles historiques. Il distingue spécifications, comportements testés et QA navigateur/manette encore à conduire.

**Toujours ouvert** : intégration campagne V85 persistante, 1 200 missions jouables de bout en bout, vrai multijoueur coop/PvP serveur, décor et sprites cinéma/PHG 1:1, tests manette/navigateur, qualité de la carte planétaire. La CI ciblée ne valide pas ces chantiers.
