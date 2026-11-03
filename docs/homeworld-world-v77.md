# Homeworld V77 — intégration et reprise

Ce lot remplace le passage de rendu extérieur de `HomeworldHub`, sans créer de deuxième jeu ou de carte indépendante. Les deux cartes et les 28 sections de la discussion ChatGPT sont des concepts originaux d'implantation. Elles ne constituent pas un plan officiel de Yautja Prime et n'autorisent aucune affirmation de fidélité canonique 1:1.

## Modèle joué

Les 43 bâtiments, leurs identifiants de services, leurs vrais intérieurs et les sources natives V76 restent conservés. Les 98 itinéraires civils, 74 modules extérieurs et points de progression sont associés à un étage physique. Le spatioport, sa navette, ses portes, ses habitants et ses props se déplacent ensemble de +6500 X, à la limite droite du monde de 10400×6400 unités.

| Niveau | Élévation | Surface et accès |
|---|---:|---|
| 0 | 0 | Districts ordinaires, spatioport oriental, sentier côtier occidental et quai volcanique au sud-ouest |
| +1 | 520 | Conseil, enceinte des règles et terrasse de desserte ; escalier ou ascenseur |
| +2 | 1080 | Cour d'audience ; escalier depuis +1 |
| -1A | -360 | Rue descendante ; rampe depuis 0 |
| -1B | -720 | Galeries basses ; escalier depuis A et rampe depuis C |
| -1C | -1080 | Ateliers inférieurs ; rampe depuis A |

Les collisions et l'accès aux portes concernent seulement le niveau actuel. Les sols ajoutés remplacent les anciens recouvrements entre districts : aucune collision n'est retirée ou réduite pour rendre un passage possible. Le moteur conserve les tests du corps entier et les parcours QA conservent leur marge de 12 unités et leur échantillonnage de segments tous les 4 unités.

Les sept raccords sont intégrés au véritable mouvement, avec durée bornée, interpolation continue de XY et de l'élévation, pause et perte de focus. Le départ exige de marcher jusqu'au palier. Une carte consultée sur un autre niveau n'y déplace jamais le joueur. Entrer dans une pièce puis ressortir conserve le vrai étage et l'approche de sa porte.

L'escalier natif du Conseil possède deux appuis mesurés : 0 `(4500,2900)` et +1 `(4500,2720)`. L'image conserve une seule échelle et ses deux sockets natifs. Les paliers disposent de terrain séparé avec une bordure de soutien de 8 unités ; les rails restent solides. Son implantation précédente coupait visuellement le lodge : la capture et le diagnostic de rejet sont préservés. Le contrôle actuel exige que sa silhouette peinte entière, avec une marge de 24 unités, ne coupe aucun bâtiment du niveau 0 ou +1.

Le sentier côtier conserve `leviathan-coast`. Le quai entre les deux statues conserve `thermal-caves`. Le skiff exige l'autorisation actuelle, le vrai quai et les quatre coins du support du chasseur dans le pont peint. Son trajet dure 12 secondes ; il n'octroie aucun accès ou gain avant la confirmation du callback de région. Le bateau est une image native fixe déplacée ; le passeur réutilise un civil existant. Aucun clip d'action dédié n'est annoncé.

## Sauvegarde additive

`HomeworldProgress.locationV77` est facultatif. Il contient `version:1`, `layoutRevision:1`, `ownerCreatedAt`, `levelId`, `exterior:{x,y}`, `interiorId` et `local:{x,y}|null`. Le module pur `homeworldCheckpointV77.ts` évite une dépendance cyclique entre le normaliseur de sauvegarde et le modèle de ville.

Une sauvegarde ancienne sans ce champ reste lisible et apparaît au vrai quai oriental. Un champ futur est refusé par les guards d'import. Un propriétaire différent, un étage inconnu, une position extérieure non praticable, un intérieur inexistant, un point local bloqué ou une ancre éloignée de la vraie porte ne sont pas restaurés. La reprise physique ne crée aucune preuve, relation, visite, marque, arme ou reconnaissance de rang.

La reprise d'une pièce utilise ses coordonnées locales et son étage extérieur. Les écritures sont demandées aux transactions existantes du propriétaire de partie. Une pause, une carte ou une simple lecture de sauvegarde ne peut fabriquer une progression. La couche C'ntlip possède ses propres guards et états additifs ; elle partage les vrais intérieurs et la même transaction, sans remplacer la localisation.

## Points de montage

- `HomeworldHub.tsx` : réhydratation initiale, refs étage/transit/skiff, passage extérieur `HomeworldWorldSceneV77`, carte `HomeworldWorldMapV77`, moteur et écritures de localisation.
- `homeworldWorldV77.ts` : modèle géographique, sols, bâtiments/routines mappés, collisions par niveau, moteurs de raccords et skiff.
- `homeworldNavigationV77.ts` : routes sur les vrais sols/collisions et graphe borné de raccords.
- `homeworldWorldCodexV77.ts` : transformation des coordonnées des anciens éléments extérieurs ; pièces locales intactes ; anciens portails côte/canyon remplacés par leurs vrais docks. Aucun import de l'agrégateur dans ce module.
- `homeworldConnectorArtV77.ts` et `HomeworldLavaSceneV77.tsx` : sources natives, appuis et sockets mesurés. L'état artistique n'est pas une calibration 3D.
- `useHomeworldReducedMotionV77.ts` : préférence système transmise au flux décoratif de lave ; elle n'altère pas les durées de trajet ou les sauvegardes.
- `scripts/homeworld-navigation-browser-v77.mjs` : helper importable sur le vrai GameClient ; déplacement par clavier public, aucun setter d'acteur ou de sauvegarde en cours de parcours.
- `scripts/verify-homeworld-world-v77.mjs` : sept parcours, palier et pause en hauteur, carte sans écriture, vue mobile, sources natives/SHA HTTP, préférence de mouvement réduit, sauvegarde et reprise dans une vraie pièce.

## Contrôles et limites

Les tests de modèle couvrent les sept itinéraires, les 43 portes, dix retours régionaux, 98 parcours civils, six étages, tous les intérieurs repris, la propriété de sauvegarde, les sockets et sources natives, les socles solides, les rails et le pont complet. Les tests historiques de callbacks conservent leurs refus de quota, propriétaires remplacés, contexte suspendu, NPC erroné et dialogues périmés ; leurs fixtures utilisent maintenant les vrais étages.

Le premier essai navigateur est conservé dans `work-local/v77/qa/world-local` ; son rejet de ratio correspond à la quantification CSS Chrome. Le second diagnostic conserve les dimensions exactes. Le script vérifie désormais l'uniformité des dimensions CSS puis les seuls budgets démontrés : sérialisation à six chiffres significatifs et quantum de mise en page 1/64 px. La visibilité de la silhouette alpha dans le vrai viewport reste obligatoire.

La validation navigateur finale du candidat corrigé est encore à réaliser au moment de ce document. Un build réussi, un test de modèle, une capture relue et une publication sont des faits distincts.

Reste partiel : six raccords ont encore une géométrie de passage intégrée sans leur image native finale ; les façades privées du palais et du Conseil ne sont pas toutes dessinées ; les huit couches artistiques demandées ne sont pas terminées ; les montures/faunes et la totalité des NPC n'ont pas toutes leurs planches natives d'action. Les 28 sections ne sont donc pas annoncées terminées par ce premier lot jouable.

## Suivi des 28 sections de la discussion

« Intégré » signifie que le code et ses contrats existent dans le vrai jeu ; cela ne remplace pas la validation navigateur finale ou la publication. Ce tableau concerne le lot city-world, pas les résultats encore en cours des autres agents.

| Section | État du lot | Ce qui reste |
|---:|---|---|
| 1 — Objectif global | Premier ensemble intégré | Refonte artistique complète et ville dense entière |
| 2 — Direction artistique | Sources préservées, originals/adaptations explicités | Architectures spécifiques et références canoniques supplémentaires |
| 3 — Architecture | 43 bâtiments et pièces natives réutilisés sur leur vrai niveau | Conseil et palais privés spécifiques, davantage de tissu urbain |
| 4 — Verticalité | Six niveaux et sept raccords jouables intégrés | Images natives finales de six raccords |
| 5 — Bas-quartiers | A/B/C reliés, collisions et reprise par niveau | Décors et population propres plus denses |
| 6 — Faune et cages | Pas d'achèvement revendiqué ici | QA et fichiers dédiés du lot faune |
| 7 — Montures | Incomplet | Montures natives, actions, appuis et intégration jouable |
| 8 — Spatioport | Ensemble oriental déplacé avec ses sources et services | Architecture monumentale et trafic aérien supplémentaire |
| 9 — Passage lave | Quai, deux statues, skiff et passeur intégrés | Clips dédiés et contrôle navigateur final de traversée |
| 10 — Côte | Vrai sentier occidental lié à la région existante | Paysage côtier spécifique plus riche |
| 11 — Autres régions | Dix régions conservées, huit raccords natifs et deux docks | Nouvelles ambitions de décor de chaque région |
| 12 — Densité | Anciens props/routines conservés, nouveaux sols continus | Centaines de structures et groupes urbains demandés |
| 13 — Parallaxe | Six plans physiques, éléments natifs indépendants | Les huit couches artistiques à vitesses distinctes ne sont pas réalisées |
| 14 — Intérieurs | 43 vrais plans locaux, proportions/portes/reprise conservées | Pièces privées additionnelles et habillage spécialisé |
| 15 — Population | 98 routines natives associées à leur vrai étage | Toutes les catégories et toutes les planches d'action ne sont pas terminées |
| 16 — Vie ambiante | Marche civile conservée, flux de lave à horloge commune | Décollages, montures et séquences natives supplémentaires |
| 17 — Caméra | Projection commune, zoom interpolé pendant l'élévation | Relecture finale desktop/mobile et futurs plans lointains |
| 18 — Level design | Routes corps entier, portes et retours testés | Tout le contenu artistique et narratif prévu à long terme |
| 19 — Lisibilité | Niveau, palier, porte et carte intégrés | Relecture des captures et variété des façades spécifiques |
| 20 — Carte | Carte des six étages et raccords, lecture sans téléportation | Habillage artistique et toutes les vues de biome |
| 21 — Performance | Culling des native assets, broadphase conservatrice, routes mises en cache | Mesure de charge de la future ville de centaines de structures ; aucun pooling/streaming intégral annoncé |
| 22 — Assets | Sources V76 immuables, quatre nouvelles images natives contrôlées | Liste d'art manquant ci-dessus ; pas de faux clip reconstitué |
| 23 — Collisions | SAT, supports complets, niveaux, rails, socles, pont entier et 98 routines testés | Relecture navigateur de la couche visuelle et tous futurs assets |
| 24 — Audio | Système existant conservé | Aucun nouveau lot audio de quartier livré par city-world |
| 25 — Pas de faux contenu | Limites et fichiers manquants explicites | Aucun bouton/texte ne certifie à lui seul un espace fini |
| 26 — QA obligatoire | Modèles et harness historiques validés | Sept parcours et captures réelles du candidat final, autres QA agents |
| 27 — Livraison | Fichiers de production, script importable, tests et ce contrat | Build/publication et captures finales sous responsabilité root |
| 28 — Priorités | Audit puis topologie/niveaux/spatioport/raccords réellement montés | Faune/montures, huit couches et complétion artistique au-delà de ce premier lot |
