# Homeworld V82 — bilan d’implémentation non vérifié

Ce document décrit le lot développé après V81 (`ba96b77`). Il ne constitue ni un rapport de QA, ni une certification de jouabilité, de fidélité canonique ou de publication. Conformément à la consigne de poursuivre et publier sans vérification, aucun test, audit, lint, compilation de validation locale, parcours navigateur ou contrôle de publication V82 n’est annoncé ici. Les résultats et captures antérieurs de V81 ne valident pas les ajouts V82.

## Treize placements intérieurs, sans treize nouveaux sprites

Le lot ajoute **13 instances indépendantes** : quatre au mausolée, quatre à l’entraînement et cinq à la mémoire. Il réemploie huit instances de mobilier natif V72 et cinq instances du coffre diagonal natif V76. Ce ne sont pas treize nouvelles images ou animations. Les PNG historiques, leurs métadonnées et les anciens identifiants de mobilier sont conservés.

Les coordonnées suivantes sont des positions locales sur le plan du sol, non des pixels d’écran. L’échelle est uniforme. Chaque suffixe est précédé de l’identifiant de sa pièce puis de `-v82-`.

| Pièce | Suffixe de l’instance | Source native | Position x ; y | Échelle | Usage local |
| --- | --- | --- | --- | --- | --- |
| Mausolée | register-lamp | resin-lantern V72 | 180 ; 65 | 0,45 | Veille du mobilier de consultation existant. |
| Mausolée | sealed-maintenance-containers | sealed-jars V72 | 510 ; 78 | 0,36 | Contenants fermés de conservation. |
| Mausolée | west-preparation-case | chest-diagonal V76 | 182 ; 298 | 0,50 | Rangement latéral de préparation des supports. |
| Mausolée | east-preparation-case | chest-diagonal V76 | 416 ; 298 | 0,50 | Rangement latéral des accessoires de consultation. |
| Entraînement | preparation-containers | sealed-jars V72 | 226 ; 136 | 0,50 | Réserve de préparation des exercices. |
| Entraînement | preparation-standard | clan-banner V72 | 508 ; 100 | 0,28 | Marque originale de la travée de préparation. |
| Entraînement | west-vestibule-case | chest-diagonal V76 | 201 ; 316 | 0,42 | Rangement du vestibule des aspirants. |
| Entraînement | east-vestibule-case | chest-diagonal V76 | 398 ; 316 | 0,42 | Rangement fermé des accessoires d’exercice. |
| Mémoire | west-register-containers | sealed-jars V72 | 224 ; 76 | 0,48 | Réserve associée au registre existant. |
| Mémoire | east-record-containers | sealed-jars V72 | 494 ; 75 | 0,45 | Réserve latérale de consultation. |
| Mémoire | west-record-standard | clan-banner V72 | 224 ; 196 | 0,45 | Repère local de la travée des registres. |
| Mémoire | consultation-desk | register-desk V72 | 148 ; 319 | 0,46 | Poste décoratif de préparation d’une consultation. |
| Mémoire | east-consultation-case | chest-diagonal V76 | 420 ; 422 | 0,40 | Rangement latéral du vestibule. |

`homeworldPublicFittingsV82.ts` ajoute ces données à la dernière étape du modèle intérieur. Il ne remplace aucun ancien meuble et ne change ni dimension de pièce, cloison, service, porte, point d’apparition ou point de sortie. Le mausolée conserve ses huit emplacements muraux, alimentés uniquement par les trophées possédés. Un coffre fermé n’accorde ni trophée, dossier, preuve, équipement ou rang ; le bureau décoratif ne crée pas un deuxième service des archives.

Les nouveaux éléments sont montés dans `HomeworldInteriorSurface.tsx`. Le meuble V72 utilise son rectangle d’appui réel derrière le pivot avant. La vue V76 utilise ses appuis asymétriques natifs. Ces mêmes helpers sont branchés au contrôle de collision du corps, au placement du dessin et aux fiches du codex. La projection du sol, l’échelle uniforme, le tri en profondeur et l’atténuation existants sont réemployés. Aucune rotation ou déformation CSS ne fabrique une orientation absente du PNG.

`homeworldPublicFittingsCodexV82.ts` fournit une fiche par instance et une fiche d’ensemble par pièce ; `homeworldContextCodexV71.ts` les agrège et les associe aux intérieurs et sorties correspondants. Elles exposent usage, position, support, pivot, échelle, orientation, source et SHA préservé. Leur état est explicitement `implemented-not-verified`. Le branchement d’une collision ne prouve pas que tous les passages restent fluides : la circulation corporelle, la lecture visuelle et les recouvrements de ces nouveaux placements restent non contrôlés.

## Nouveaux passages OpenAI : sources et parcours distincts

Les sources finales de l’escalier des galeries, de la rampe diagonale de maintenance et du portique adulte des délégations ont maintenant été générées et copiées, en complément de `acropolis-stair.png` et `industrial-ramp.png`. Le lot dispose ainsi de **six sources structurelles pour sept connecteurs** : la source du Conseil V77 conservée et cinq sources V82. La rampe industrielle possède deux instances, ateliers et descente des bas-quartiers ; elle ne compte pas comme deux illustrations différentes. L’enregistrement final des sources et de leurs appuis appartient au module coordonné `homeworldConnectorArtV82` / `homeworldConnectorSupportsV82`.

Les identifiants des sept connecteurs, paliers, étages, durées, permissions narratives et sauvegardes restent issus du modèle V77. Les deux centres de palier peints sont des sockets pixels explicites. Leur placement utilise une translation et une échelle uniforme positive, sans rotation, miroir ou étirement séparé pour forcer un dessin incompatible sur un trajet. Les contours natifs des paliers sont fournis au terrain et au rendu par le même module d’appui.

Une cabine native distincte a également été copiée et montée dans le rendu réel et le préchargement. Le portique fixe ne contient pas une deuxième cabine peinte. Pendant le transit existant de cinq secondes, les huit premiers pour cent servent à l’embarquement avant la montée ; la cabine, le moteur du protagoniste et la caméra partagent ensuite la même fraction de progression. Le PNG de cabine est traduit entre les paliers : il ne s’agit pas d’un clip natif à plusieurs images.

Au repos, la cabine est présentée à l’étage courant du joueur. Cela ne constitue pas une simulation persistante de la mécanique de l’ascenseur, d’une cabine continuant à circuler hors écran ou d’un service indépendant du transit du protagoniste. Le corps, l’approche des paliers, l’embarquement et les transitions n’ont pas été contrôlés en jeu. Le suivi détaillé reste dans `docs/homeworld-connectors-v82.md` et le registre d’art du lot ; disponibilité des sources, branchement au rendu et QA sont trois états distincts.

## Compléments extérieurs coordonnés

Deux dessins natifs de quartiers lointains supplémentaires enrichissent les silhouettes industrielles et portuaires. Ils constituent des plans de décor distincts ; ils ne créent ni portes, terrains parcourables, nouvelles régions accessibles ou découvertes de campagne. Leur présence ne certifie pas la perspective ou la densité de toute la cité.

Le lot coordonné comprend aussi la relocalisation de 24 accessoires historiques et quatre piédroits associés à deux soutènements. Les quatre volumes maçonnés sont désormais branchés au rendu ; ils ne doivent donc pas être présentés comme des sprites OpenAI supplémentaires. Leur géométrie et leur collision ont un propriétaire structurel explicite. Les joints, contacts, solidités et usages corporels restent non vérifiés, comme ceux des treize ajouts intérieurs.

## Cadre royal et Conseil déjà introduits en V81

Le palais conserve son enveloppe extérieure 1100 × 700 et son complexe public utile 1068 × 668 : vestibule des délégations, garde, grande chambre d’audience, galerie des marques et annexe des porte-parole. Le Conseil possède une enveloppe nominale 850 × 500 et un intérieur public 818 × 468 : vestibule, réserve des registres, recueillement et chambre des représentants. Les volumes natifs orientés utilisent leurs appuis mesurés ; leur boîte englobante ne doit pas être confondue avec leur hull de collision.

Les passages monumentaux V81 sont définis séparément à 200 unités. Deux gardes du palais et trois silhouettes contextuelles du Conseil utilisent des identités natives existantes. Ces présences sont anonymes, stationnaires et non interactives : aucune nouvelle patrouille, discussion animée, cinématique royale ou mission n’est annoncée. Les services, la table C’ntlip, les conditions de progression et les identifiants persistants sont conservés. La course Homeworld V81 utilise un multiplicateur de 1,8 et cadence les dessins de marche existants ; ce n’est pas une nouvelle plaquette native de course.

La composition représente la cité originale du jeu et ses clans alliés. Elle n’établit pas un roi universel des Yautja, une carte officielle de Yautja Prime, des emblèmes officiels ou une architecture reproduite 1:1. Les anciennes façades remplacées restent archivées ; les fiches natives actives décrivent leurs propres sources et volumes.

## Travaux encore distincts ou manquants

- Les suites résidentielles privées, étages royaux non produits et cinématiques du palais ne sont pas simulés par ces ailes publiques.
- Les meubles supplémentaires n’ajoutent pas d’action de consultation, collecte, récompense, exercice, rituel, conversation ou accès royal. Toute nouvelle action doit être produite avec ses règles narratives, sans transformer un décor en service implicite.
- Ce lot ne livre ni nouvelle faune, ni domestication, ni comportement d’animaux, ni nouvelles animations sociales. Les espèces et routines existantes ne sont pas certifiées par cette note.
- Les silhouettes et dimensions sont des compositions graphiques originales avec métrologie locale. Aucun modèle CAD calibré, plan canonique complet, validation de perspective 3D ou fidélité canonique 1:1 n’est fourni.
- Les six sources structurelles et le dessin séparé de cabine ne livrent pas des clips natifs multi-image. Les autres variantes et animations demandées restent des travaux distincts ; la translation de cabine ne remplace pas une animation dessinée de mécanisme.
- Les modifications d’usage extérieur et de soutènement sont décrites dans `docs/homeworld-usage-lot-v82-unverified.md`. Les quatre piédroits sont branchés au rendu, mais leur intention et leurs données ne remplacent pas une inspection en jeu des accès, joints et solides visibles.
- Les parcours clavier, manette et tactile, la lisibilité à distance de jeu, les sauvegardes et la stabilité après ce lot restent non vérifiés. Ce document ne déclare ni commit V82 effectué, ni déploiement READY observé, ni contrôle du jeu publié.
