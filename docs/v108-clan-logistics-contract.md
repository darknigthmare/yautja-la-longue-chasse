# Convoi des six ouvrages V108

Une seule opération locale d’exercice conserve les six chantiers, les mêmes récupérateurs U19, deux coques différentes et leurs pilotes civils, deux montures préexistantes, un bidon et une cellule. Le terrain de 1000 × 600 relie les rives par un détour terrestre au sud et par un chenal parcouru avec le même skiff. Il ne correspond ni à K01 ni à un territoire CON-T des planètes historiques.

Le lot progresse sur la continuité physique, l’approvisionnement, les contrats, les retraits et la reprise durable. Les six ouvrages restent **partiels pour la campagne** : aucune acquisition réelle de navire, arrivée militaire dans un monde, identité ennemie, annexion, XP ou récompense de campagne n’est créée.

## Cellules originales

Classeur `docs/suivi-production/classeurs/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, SHA256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`, inchangé.

| Ouvrage | Structures de guerre | Pièces RAV | Entretien | Travail | Équipe opératrice |
| --- | --- | ---: | ---: | ---: | --- |
| Quai léger W3-S09 | C14:K14 | 16 | 2 | 3 tours | U25 · Unités de guerre D30:H30 |
| Aire de montures W3-S10 | C15:K15 | 12 | 2 | 3 tours | U21 · D26:H26 |
| Écran W3-S13 | C18:K18 | 18 | 3 | 3 tours | U27 · D32:H32 |
| Duel W3-S14 | C19:K19 | 8 | 1 | 2 tours | U08 · D13:H13 |
| Écoute W3-S15 | C20:K20 | 10 | 1 | 2 tours | U05 · D10:H10 |
| Escale W3-S18 | C23:K23 | 22 | 3 | 3 tours | U26 · D31:H31 |

U19 reprend D24:H24 : trois membres, 3 PC, 10 RAV de recrutement, 2 RAV par tour et 2 tours d’intégration. Un second U08 distinct doit également être recruté et intégré avant d’accepter le duel. Chaque volontaire conserve ses identifiants ; revenir en réserve ne recrée aucune personne et ne rembourse pas son recrutement.

Règles de guerre C12:D14 : plafond PC, stock situé et chaîne logistique ; C24:D24 : kit, supports et opérateurs ; C29:D29 : accords bornés ; C33:D34 : même coque/manifeste et reprise sans double transaction. Les prix, délais, puissances et logistiques du classeur restent des propositions de conception (Méthode de guerre C13:D13), sans certification canonique.

R2-M021 reste distinct : Campagne commune D26:J26 et Scènes de dialogue V6 H597:J597 exigent Blooded, moyens et accord réellement réunis, droits remis et entrée dans la coque. Le runtime V89 reçoit toujours `authority: null` ; ce convoi ne fabrique aucun provider d’acquisition. Le catalogue de 54 coques n’accorde pas 54 propriétés.

## Hypothèses finies de l’exercice

Le front débute avec **120 RAV au dépôt et 480 dans la soute du skiff**, soit 600 au total. Ce budget partagé remplace les démarrages indépendants de cet exercice V108 ; il ne vient pas d’une campagne ou d’une conversion inventée de clanMarks. La somme des lieux, recrutements, kits et consommations reste 600. Une réservation de kit ne redevient disponible qu’après retour matériel d’un kit non travaillé ; un chantier commencé ne se rembourse pas à distance.

Le plafond du dépôt est 120, celui des casiers 40, le portage U19 20 et celui d’un opérateur 6. La soute est bornée à 480. Ces enveloppes sont des unités d’exercice, sans équivalence de masse ou de tonnage canonique. Les mouvements locaux ne font pas avancer le tour ; intégration, attente, travail et événements de service le font. L’entretien des équipes provient du portage, d’un dépôt ou casier à portée, ou de la cargaison du transport quand elles sont embarquées. Un ouvrage terminé consomme son propre casier même si son opérateur est parti ; une pénurie suspend son effet.

Chaque première embauche débite le coût V6 et attend son intégration. Les contrats de service sont bornés à douze tours après intégration ; l’expiration coupe le service de l’opérateur. Les personnes restent sur place et peuvent ramener leurs charges. La paie continue tant que leur contrat n’a pas été clos au dépôt. Une reprise de contrat demande le retour de la même personne ; le plafond 12 PC n’est jamais dépassé et oblige à organiser la réserve.

Le bidon initial contient six eaux ; les soins en consomment deux à chaque geste. Les deux montures ont une fatigue persistante et un gabarit de 24 unités qui refuse la fente praticable à un piéton. Reprendre/rendre le même bidon conserve l’eau déjà consommée. La cellule initiale a quatre charges ; une interception réelle d’une sonde inerte consomme une charge, le rail adjacent demeure ouvert. Reprendre la cellule coupée et la ramener au dépôt ne la recharge pas.

Le skiff traverse en douze étapes avec le même pilote, sa soute et l’éventuel manifeste U19. L’aller et le retour respectent la fenêtre de courant modulo 4 : 0–1. Une arrivée physique précède le débarquement. La navette est une autre coque prêtée avec un autre pilote, trois places et quatre carburants ; chaque départ en consomme un. Ses seize étapes relient surface et escale orbitale distinctes. L’approche retour attend un service au sol effectif avant l’atterrissage.

Le duel se limite à trois touches d’exercice et à un coffre déjà présent. Signatures, contact, esquives par déplacement, interruption par sortie/tiers et transfert du coffre restent des états séparés. Renégocier conserve les touches ; aucun clan ni tiers n’est lié par cet accord.

L’écoute réutilise les vrais WAV de machinerie et de scanner V107, leurs SHA et leur portée/occultation sur ce nouveau terrain. L’interface exige au moins 0,25 seconde réellement lue par HTMLMedia avant de conserver une prise. Comparer deux prises distinctes demande le retour à la station tenue. Faune, météo, identité et distance adverses restent inconnues ; aucune voix ni nouvelle ambiance n’est fabriquée.

## Persistance et frontières

Contexte `linked-physical-logistics-v108`, version 1, protocole `v108-linked-r1`, clé dédiée `yautja.clan-logistics.v108.exercise.v1`. Le modèle, récursivement immuable, n’accepte que les objets qu’il a produits. Chaque intention porte une révision ; répéter exactement la même transaction ne la rejoue pas, réutiliser l’ID avec une autre intention est refusé.

Une seule archive contient l’état et au plus 10 000 commandes acceptées. L’import est limité à 4 Mio et rejoue tout depuis la dotation initiale avant de comparer exactement le checkpoint. Une version future, des RAV ajoutés, un champ supplémentaire ou un historique incohérent sont refusés sans mutation. Les personnages, couches, positions, cargaisons, travaux, consommations et résultats sont repris ensemble.

Les écritures s’exécutent sous un Web Lock, comparent les octets observés et vérifient leur relecture avant d’avancer l’interface. Un quota, une lecture impossible ou une archive modifiée ailleurs conservent le dernier état confirmé ; aucune archive incompatible n’est remplacée par défaut. L’import fichier invalide immédiatement l’ancien brouillon, bloque l’import pendant lecture et ignore toute lecture devenue obsolète après annulation ou nouvelle sélection. Importer arrête les mouvements et les médias.

Aucune écriture dans SaveGame, aucun changement aux planètes, aucune migration des carnets V87–V107. Les artefacts V107 ne sont pas modifiés. Le seul point d’entrée ajouté est l’onglet « Convoi des six ouvrages » dans la Bible V6.

## Vérifications

`tests/clan-logistics-v108.test.mjs` couvre les sources/coûts, les identités et la conservation, le plafond PC, les délais, six constructions avec les mêmes porteurs, le retour d’un kit, la traversée, l’énergie conservée après retrait, les gabarits, l’expiration, le replay et les échecs/conflits de persistance. Les sondes de modèle ne remplacent pas la recette navigateur.

`scripts/qa-clan-logistics-v108.mjs` joue les contrôles normaux, les déplacements et les fichiers audio sur une production compilée. La recette termine les six opérations, les retours physiques et une reprise à la septième étape d’un vol, puis vérifie les imports et le mobile. Les preuves finales doivent identifier exactement le commit, le BUILD_ID, les fichiers avant/après, les captures PNG et leurs SHA. Un rodage préflight n’est pas une validation publiée.
