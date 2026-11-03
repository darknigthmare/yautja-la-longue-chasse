# Guerre des clans V116 — théâtres régionaux, récupération et provenance

## Six théâtres de la Bible V6

Le jeu possède désormais une couche de terrain tactique partagée par l'infiltration et le RTS.
Ce n'est **pas** une reproduction officielle de planètes ou d'architecture de film :
les six régions W3-KR sont les géographies de la Bible V6 reconstituée pour ce projet.

| Région | Territoires sources | Profil d'exercice | Obstacle / couvert |
| --- | --- | --- | --- |
| W3-KR01 | W3-K01–K06 | Hauteurs et escaliers | Paroi / bloc rocheux |
| W3-KR02 | W3-K07–K12 | Citernes et conduites | Réservoir / muret |
| W3-KR03 | W3-K13–K18 | Piliers et racines | Racine / socle |
| W3-KR04 | W3-K19–K24 | Pontons et chenaux | Eau infranchissable à pied / pile |
| W3-KR05 | W3-K25–K30 | Forges et rails | Machine / caisse |
| W3-KR06 | W3-K31–K36 | Plaines et colonnes | Colonne / dalle |

Les géométries sont déterministes par territoire. Chaque carte conserve une route
praticable entre extraction (1,4), relais de sabotage (7,1) et objectif militaire
(7,3). La génération conserve les emplacements initiaux des unités et ajoute au
maximum deux murs supplémentaires après vérification des chemins. Le profil K02
garde les quatre obstacles de l'étude historique du canyon.

La simulation refuse les pas à travers les murs, calcule le mouvement à partir
d'un chemin praticable et bloque une visée si un obstacle opaque est entre
observateur et cible. L'interface affiche les murs, couverts et le nom de la
région. Les sprites actuels sont schématiques : pas de certification visuelle 1:1.

Sources et tests :
- app/game/systems/clanWarMissionTerrainV116.ts
- app/game/systems/clanWarOperationsV115.ts
- app/game/ClanWarOperationsV115.tsx
- tests/clan-war-terrain-v116.test.mjs

## Médecine de terrain W3-U18

Le modèle produit seulement des blessures **légères d'exercice**. Une personne
blessée ne peut redevenir apte gratuitement, sans médecin, ou par la fermeture
puis la réouverture de l'écran.

Un soigneur W3-U18 doit avoir été recruté, être apte, présent et libre.
Le membre blessé et son équipe sont affectés avec le médecin à un soin identifié.
Les RAV d'entretien de W3-U18 sont débités une seule fois au lancement. Deux
traitements simultanés au maximum. Chaque équipe demeure indisponible durant
45 secondes d'exercice et le résultat est calculé à l'échéance, même si le
panneau a été fermé entre-temps. Une annulation ne rembourse pas le matériel
engagé et ne guérit pas le membre. Les identités et XP restent intactes.

L'archive V115 conserve les traitements en cours et leurs reçus optionnels.
Le lecteur vérifie les dates, membres, équipes, coûts, affectations et l'absence
de doublons. L'ancien format sans traitement demeure lisible.

IMPORTANT : la fiche source W3-U18 décrit des soins et une stabilisation sur
le terrain, pas une résurrection ni une guérison instantanée de blessure grave.
Les 45 secondes représentent un choix explicite de prototype. L'intégration
physique au système de porteurs, transport de corps, hôpital et camp n'est
pas prétendue accomplie.

Sources et tests :
- app/game/systems/clanWarOperationsV115.ts
- app/game/ClanWarOperationsV115.tsx
- tests/clan-war-medical-v116.test.mjs

## Références de lore et limites de continuité

Les ancrages de fidélité restent séparés, œuvre par œuvre :

- Aliens vs. Predator: Three World War (Dark Horse, 2010) représente un ancien
  clan rival utilisant des Aliens contre d'autres forces. C'est un précédent
  pour un conflit interclan de grande ampleur, PAS une pratique de toutes les
  tribus Yautja ni une justification pour importer les lieux de cette œuvre
  dans Korthas. Sources : avpgalaxy.net/literature/avp-comics/ et
  atomicavenue.com/atomic/series/34048/1/Aliens-vs-Predator-Three-World-War
- Predator: Bad Blood (Dark Horse, 1993–94) présente une traque de renégat.
  Cette narration peut orienter des mandats de poursuite ou de preuve,
  pas être convertie automatiquement en bataille RTS canonique.
  Source : avpcentral.com/predator-bad-blood
- Aliens vs. Predator: War (Dark Horse, 1995) explore la présence de Machiko
  Noguchi avec le clan de Top-Knot puis son départ. Une mission inspirée de
  la loyauté ne doit pas déplacer des personnages ni fusionner les chronologies.
  Source : avpcentral.com/aliens-vs-predator-war-comic

Les Outer Ops de Metal Gear Solid: Peace Walker inspirent la structure
expédition/rapport. Elles ne sont pas une source du lore Yautja.
Référence de gameplay : gamespot.com/articles/metal-gear-solid-peace-walker-extended-hands-on/1100-6260945/

## À distinguer dans les rapports de production

Une fiche documentaire n'est pas un gameplay terminé : les 108 fiches de
mission W3/W5 et les douze chapitres répertoriés sont un corpus de référence,
pas 108 scènes physiquement jouables. Les missions de la PR #29 restent un
exercice autonome distinct de la campagne, du multijoueur et des planètes V85.

Restent ouverts : sprites et animations authentifiés, niveaux avec élévation,
fluides et montures, pathfinding multi-unités à grande échelle, vraies
infra­structures médicales et convoyeurs, conséquences diplomatiques, système
de clans solo/MP et passerelle transactionnelle vers la progression principale.
