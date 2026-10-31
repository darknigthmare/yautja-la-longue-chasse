# V136 — Quatre game modes développés en parallèle

## Portée des changements de code

L'objectif est d'améliorer **simultanément** les quatre gameplays de Guerres des clans déjà accessibles dans la Bible V6. La V136 est empilée au-dessus de la V135, sans écraser la PR du gauntlet holographique. Toutes les mécaniques supplémentaires sont des règles **originales du jeu**, pas des affirmations de canon Predator/AVP.

| Mode | Réalisation V136 | Précondition réelle | Limite |
|---|---|---|---|
| **Assaut latéral** | `orderWarAssaultHoldV136` : tenue d'une position défensive pendant 3 ticks, l'unité riposte à sa portée au lieu d'avancer | Membre de formation V6 réellement déployée, vivant, x ≤ 25 près du bastion, dépense **15 AP** | **Une fois par équipe et par mission**. Sans recrutement, RAV ou gain de territoire |
| **Outer Ops** | `supplyWarOuterMissionV136` : ravitaillement complémentaire de mission (+4 capacité *d'exercice* lors des 3 rounds) | Mandat en route, effectifs libres de blessures mortelles, première moitié du voyage, **2 RAV** disponibles | Une livraison, sans modifier trajet, identité, délais ou résultat avant échéance |
| **Infiltration/sabotage** | `hide` : dissimulation dans un couvert physique W3, récupération limitée d'énergie et baisse de vigilance si hors du regard | Une des cases `terrain.cover`, non consommée, action d'un tour, patrouille pas adjacente | Une utilisation par couvert; les gardes adjacents détectent toujours le chasseur |
| **RTS tactique multi-escouades** | `commandWarRtsOverwatchV136` : veille en ligne de vue propre, tir de réaction lorsqu'une cible approche | Formation encore active, arme en portée, RAV disponibles au moment du tir, aucun ordre de veille déjà émis | Un tir réel par ordre, **1 RAV seulement lorsqu'il y a une cible**, expiration en 2 ticks, mouvement/ralliement annule la veille |

Les actions assaut, Outer Ops et infiltration passent par les interfaces **`ClanWarOperationsV115.tsx`** ; la veille RTS s'ajoute dans **`ClanWarRtsSquadsV133.tsx`**. Les anciennes sauvegardes libres V115 restent au format `version:1`, avec des champs facultatifs nouveaux et contrôles stricts au chargement. Les W3 ne sont **pas** attribués à des planètes Terriennes, et la chronologie canonique des œuvres reste distincte du lore inventé pour le jeu.

## Tests et données

`tests/clan-war-four-modes-v136.test.mjs` contient des parcours de validation isolés par game mode : dépense AP/RAV, trois tours de tenue, reçu unique, route et échéance Outer Ops inchangées, recharge dans un vrai couvert, garde adjacente, impossibilité d'obtenir un tir de veille sur une unité invisible ou éloignée, absence de téléportation, rejet sans altération et contrôle de l'archive V115. La CI `.github/workflows/clan-war-v136.yml` exécute également les régressions V115, V133, V134, V135, TypeScript et ESLint.

Le suivi Excel V136 conserve l'historique V130–V135, les 1 200 dossiers V120, les 24 scénarios W3, les 12 cartes W3 et les 36 missions W5. Des onglets séparés détaillent les préconditions, l'intégration, les corrections, les tests et les chantiers restants pour chaque mode.

## Fonctionnalités encore non réalisées

**Niveau prototype** : aucun serveur multijoueur ou coopératif, aucune campagne de clans V85 persistante/annexion réelle, aucun village de Gunnison reproduit sur une planète extraterrestre, aucune guerre totale multi-région achevée, aucune scène de film 1:1 certifiée, aucune collection de 1 200 missions jouables. Les différences de terrain terrestre/extraterrestre sont couvertes par le catalogue et les règles de cohérence précédents, non par des niveaux filmés finis.

Les tests automatisés ne remplacent ni les tests navigateur/jeu continu, ni la validation manette/mobile, ni une certification d'assets par œuvre et continuité. La PR reste en **draft** jusqu'à ce que les dépendances de la chaîne soient correctement fusionnées et les étapes de QA complémentaires réalisées.
