# V130 — Registre complet de production de la guerre des clans

## Livrable de suivi

Le classeur [Yautja_Guerres_Clans_Plan_Production_V130_2026-10-30.xlsx](./Yautja_Guerres_Clans_Plan_Production_V130_2026-10-30.xlsx) est un **plan de production et une grille QA**, non une attestation que le contenu est terminé.

Il comprend 17 feuilles :
- **00_PILOTAGE** : indicateurs calculés par formules et statuts des six chantiers.
- **ASSAUT, OUTER_OPS, INFILTRATION, RTS** : 84 tâches précises par gameplay, règles, limites, critères de validation et besoins visuels.
- **SYSTEMES_COMMUNS, MULTIJOUEUR, ROADMAP_GLOBALE** : 41 exigences supplémentaires, 125 au total ; 77 urgences P0 pour lesquelles l'acceptation doit être vérifiée.
- **MISSIONS_1200** : tous les IDs réels CW120, 4 modes × 3 familles × 100, avec provenance, géographie, statut et obstacles de production. Les 44 champs de conception restent dans l'export V120 ; ce registre ne réécrit pas leurs histoires.
- **W3_24_RTS** : 24 scripts V129 et 72 objectifs physiques, monde, grille, escorte, étape et preuve attendue d'un *vrai* RTS multiunités.
- **CARTES_W3_12** : les 12 cartes W3 et leurs tailles issues de la Bible V6, dont l'environnement orbital de MAP12 et les galeries chauffées de MAP10.
- **W5_CAMPAGNES_36** : 36 missions scénarisées W5 à réaliser dans 12 campagnes, séparées des scènes W3.
- **QA_ACCEPTATION** : 161 vérifications traçables aux tâches et aux cartes/missions source.
- **LORE_CONTINUITE, CHAINES_PR, SOURCES, LEGENDE_ET_MODE** : garde-fous et provenance.

## Situation constatée au 30 octobre 2026

| Mode | Prototype vérifié au niveau du code | Reste pour livrable final |
| --- | --- | --- |
| Assaut latéral | déploiement AP, base, attaques spéciales expérimentales | 300 scènes authorées, IA de défense, vrais sprites, gestion de fronts, accès et repli |
| Outer Ops | délégations à durée, rappel différé, rapports et équipes persistantes dans l'exercice | routes matérielles, identité campagne V85, effets vérifiés, serveur asynchrone |
| Infiltration/sabotage | furtivité, alarme et sabotage prototypes | 300 cartes jouables, PNJ réactifs, preuves/honneur, évacuation de secours complète |
| RTS | 12 études de cartes, 24 scripts W3 avec 72 étapes physiques en simulation d'un chasseur | commande de multiples escouades, logistique, occupation, diplomatie et campagnes W5 |
| Multijoueur | protocole de lobby, preuve PvP locale 9×6 | serveur autoritaire, synchronisation réseau, anti-rejeu distant et coop/PvP réel |

**Ce que V130 ne fait pas :** il ne crée pas 1 200 niveaux jouables, ne livre pas 6 000 PNJ, n'affecte aucune récompense de campagne, ne certifie aucun asset film/comic 1:1 et ne transforme pas le duel local en jeu en ligne.

## Priorité et règles 1:1

1. **P0** : contrats et archivage V6/V85, exactitude géographique, budget PC/RAV, idempotence, scènes traversables, extraction et preuves de réussite, climat/énergie, contrôle des identités.
2. **P1** : doctrines W3-CL, accords W3-DIP, variantes visuelles du roster, confort manette/clavier, écran de mission, habillage et extensions multi-clients.
3. **P2** : polissage, personnalisation et modes de présentation secondaires.

Les sites de Predator 2 (Los Angeles), AVP-R (Gunnison) et AVP (Bouvet) appartiennent à **la Terre**. Les mondes de Predators et Badlands restent extraterrestres. Les lieux réels d'hommage CW120 sont des contextes de **fiction**, jamais des scènes canoniques attestées. Le modèle métrique WGS84 et la carte Natural Earth 1:110 millions ne constituent pas une reconstitution des rues.

Les planètes W3 Korthas, Vesh-Kar, Namarra, Oruun, Sahr-Keth et Ilyss sont des mondes propres à la Bible du jeu. Leur contenu inventé doit être identifié « original jeu », et non rattaché artificiellement au canon d'un film. Les coûts AP et délais de prototype ne deviennent pas des règles canoniques Predator.

## Chaine de branches et contrôle de cohérence

PR #29 (quatre modes) → #34 (1 200 fiches) → #36 (Terre/biomes/IA) → #37 (métrique et PvP local) → #38 (12 cartes) → #40 (24 scripts source) → **cette PR V130**.

Le test `tests/clan-war-production-v130.test.mjs` ouvre le **fichier XLSX réellement commité**, parcourt son ZIP OpenXML et vérifie la concordance de ses 1 200 IDs avec `clanWarVariantAtlasV120.ts`, des 24 IDs RTS, des 12 cartes, des 36 W5 et des 125 tâches. Il verrouille aussi la provenance W3 : une fausse entrée portant le bon ID mais provenant d'un autre onglet ne peut remplacer « Scénarios RTS ».

Des résultats CI verts confirment uniquement ces contrôles ; ils ne lèvent pas les blocages de conception/production consignés dans le classeur.
