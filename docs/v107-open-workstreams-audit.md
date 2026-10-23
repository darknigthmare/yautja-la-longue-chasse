# Audit des chantiers ouverts V107

Base : V106 au commit `92e7c824fd80d6b8152855b3d66560448f8c48c0`. Les **77 lignes ouvertes** sont toutes répertoriées dans le [registre détaillé](v107-open-workstreams-audit.json). L’audit ne promeut aucune validation V107.

| Famille | Lignes | Travail restant | Preuves minimales |
| --- | ---: | --- | --- |
| The Pit : quatre identités/visuels à établir, deux références partielles et les kits | 7 | 4 dossiers avec visuel/incarnation encore à établir ; 2 références V79 déjà présentes mais une seule pose native droite ; 1 agrégat kits recouvrant actions/campagnes/variantes. | Références V79 et SHA existants ; une pose droite et une icône dérivée ne prouvent ni vue gauche native, ni animations, ni kit terminé. |
| Guerre de clans : six ouvrages physiques | 6 | Quai, montures, confinement, duel consenti, sons situés et navire orbital. | Cellules V6 C:K exactes ; modèle séparant portée source et adaptation de la simulation libre. Existence et déplacement réels de la cargaison, monture, navire ou participants ; stocks, capacités et énergie vérifiés. |
| Enforcers : dixième variante de 18 groupes | 18 | 18 PNG de variante 10 réellement absents de la ligne suivie ; une fiche n’est pas une soumission image. | Ligne et fiche du master V6.13 exactes ; prompt soumis et reçu de génération reliés au fichier réel. PNG natif, transparence et silhouette vérifiées, SHA/dimensions et emplacement public concordants. |
| Preserve : secteurs et combattants | 2 | 4/80 secteurs et 8/100 combattants hérités :76 secteurs et92 combattants restent visés, sans noms source inventés. | Contrat de terrain, raccords, collisions, couvertures, objectifs et retour à l’extraction réellement jouables. Chaque combattant possède identité, rôle, comportement, combat et visuels ; un compteur ou clone renommé ne suffit pas. |
| Provenance Enforcers : reçus et traces | 2 | 21 reçus finaux V6.13 non retrouvés ;36 traces V6.10 sans PNG récupéré. | Reçu natif réellement récupéré, identifiant de génération et paramètres effectivement soumis. Correspondance vérifiée entre reçu, fichier image et SHA ; attribution nominative sans déduire une soumission du seul prompt planifié. |
| Feral/Scar : douze actions sans liaison | 12 | 4 projections,2 spéciaux à entités (mine/shuriken),6 conclusions avec partenaire. | Cellules V54 et cibles exactes ; dessins natifs droite/gauche admis, sans miroir ni victime peinte doublant une victime autonome. Vraies entités, saisies ou séquences synchronisées ; hit-confirm, garde, esquive/rupture, interruptions, coût et issue vérifiés. |
| Feral/Scar : seize étapes de campagne | 16 | Deux routes de 8 étapes, avec alliés/opposants, blessures, choix et fin alternative distincts. | Cellules D:K exactes de08_CAMPAGNES ; acteurs, équipement, connaissance et stages réellement disponibles. Entrées, transitions, refus, échecs/reprises et sortie jouables ; aucun objet/allié recréé pour jouer une scène. |
| Feral/Scar : quatorze contraintes de variantes | 14 | 7 contraintes par personnage : incarnation, masque/visage, équipement, dommages, directions et camouflage. | Cellules C:I exactes de14_VARIANTES ; source d’incarnation et armes autorisées par chapitre. Vraies vues natives des deux sens et états masque/arme/armure ; aucune tête inventée ou transformation pixel attestée comme1:1. |

Le dossier `PIT-KITS-COMPLETS` recouvre les actions, campagnes et variantes : les 77 lignes ne sont pas 77 livrables indépendants. Les 40 liaisons source de V106 restent distinctes de deux personnages complets.

## Homeworld : suivi complémentaire indispensable

Aucune ligne Homeworld ne figure dans les 77 entrées ; cela ne clôt pas la ville. Le catalogue cible contient **354 besoins artistiques**. Son bilan V81 (313 variantes nécessaires, 40 absents, 1 animation absente) est historique : il faut le réconcilier avec les assets récents avant de publier un nouveau taux. Les gestes professionnels et sociaux, les variantes architecturales et les accès/voyages conditionnels restent des familles séparées.

Le véritable classeur V6 est disponible : `docs/suivi-production/classeurs/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`,2 101 543 octets, SHA256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`. Il correspond exactement au corpus source V85. Les nouvelles preuves peuvent citer ses cellules originales, sans réécrire les constats historiques d’absence. Le corpus contient 730 scènes de conception, 6 059 répliques et 1 494 options sur plusieurs modes ; les 177 identifiants `D6-W-` ne mesurent pas une couverture de jeu.

Pour chaque opération : vérifier les cellules originales, les objets et personnes présents, les préconditions, le consentement et la connaissance ; jouer les refus et interruptions ; vérifier positions/charge/occlusion, sauvegarde/reprise et refus d’écriture ; puis exécuter une recette production avec captures et SHA. Un texte de dialogue ou une silhouette statique ne livre pas un geste physique.

## Sources réellement retrouvées

Le master V6.13, son manifeste et sa réconciliation sont présents localement. Le manifeste déclare 36 PNG natifs, 15 reçus retrouvés, 21 reçus manquants et 0 PNG V6.10 récupéré : retrouver le manifeste ne récupère pas ces artefacts manquants. Aucun original V3 ou V54 n’a été trouvé dans le scan local ; leurs extractions épinglées restent les références disponibles.

Les détails, 77 IDs et exigences par ligne sont dans le JSON. Les classeurs historiques et leurs capsules ne sont pas modifiés.

## Deux références The Pit déjà intégrées

`add-last-hunt-super` correspond déjà à `user-last-hunt-super` : pose droite native 1024×1536, SHA `a3a6bae74c1c6609bb4f29ba7a3a46ed5ed0b64b633e6ba4812fe003bc46b603`. `add-avp-classic` correspond déjà à `user-avp-classic-2000` : pose droite native 1145×1374, SHA `04a93516a65155301eeb0ea8484cde6a7da349b582598965920806c8cee5a227`. Leurs métadonnées, sources publiques, pages et icônes dérivées sont détaillées dans le JSON et `docs/v79-reference-hunters-art.md`. Le rendu gauche reste un miroir provisoire, les poses sont statiques et le profil de duel est partagé. Ces deux lignes restent partielles, sans annoncer leur incarnation absente ni leur clôture.
