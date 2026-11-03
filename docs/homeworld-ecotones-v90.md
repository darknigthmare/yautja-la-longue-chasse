# Sols naturels du Homeworld — lot V90

11 octobre 2026. L'ancien `HomeworldOutskirtsV71` n'était plus monté par le Hub.
Ses six matériaux V75 et quatorze zones de transition existaient dans le codex,
mais n'apparaissaient plus dans la scène jouée. V90 raccorde réellement les six
cellules du PNG d'origine à `HomeworldWorldSceneV77`, en gardant les limites de
la cité à étages actuelle.

Onze patches sont montés : sept débouchés régionaux au niveau `0` et quatre
formations du plateau. Trois candidats restent explicitement refusés : Storm
Chain (`+1`), Cold Crown (`+2`) et Forbidden Reserve (`+1`). Les quarante-deux
formations naturelles V85 sont toutes dessinées au niveau `0` ; aucune copie
artificielle n'est créée aux étages supérieurs pour atteindre le nombre 14.
Ces trois débouchés, leurs déplacements et leurs permissions demeurent présents.

## Implantations actuelles

Les patches régionaux prennent les véritables seuils/arrivées V77 ; les quatre
patches non régionaux prennent l'appui mesuré d'une formation V85 existante.
Les règles des sources V75 ne sont ni réécrites ni traduites une seconde fois.
Rayons, alpha, matériau, note, identifiant et PNG sont conservés.

| Patch V75 | Origine historique X ; Y | Implantation V90 X ; Y | Niveau / statut |
| --- | --- | --- | --- |
| Marches de Cendre | 500 ; 2290 | 7000 ; 2290 | 0 / monté |
| Désert de Verre | 3850 ; 5530 | identique | 0 / monté |
| Jungle des Piliers | 2900 ; 180 | identique | 0 / monté |
| Marais Lumineux | 6540 ; 2080 | identique | 0 / monté |
| Chaîne des Tempêtes | 4140 ; 90 | identique | +1 / refusé, pas d'épaule naturelle sur cet étage |
| Côte du Léviathan | 500 ; 1030 | 260 ; 2230 | 0 / monté |
| Grottes Thermiques | 4600 ; 4350 | 460 ; 3600 | 0 / monté |
| Couronne Froide | 5750 ; 230 | identique | +2 / refusé, pas d'épaule naturelle sur cet étage |
| Ruines de la Première Cité | 720 ; 230 | identique | 0 / monté |
| Réserve Interdite | 6580 ; 3370 | identique | +1 / refusé, pas d'épaule naturelle sur cet étage |
| Drain occidental | 0 ; 1400 | 190,25 ; 1930 | 0 / monté |
| Abri septentrional | 2800 ; -100 | 3040 ; 111 | 0 / monté |
| Alluvions méridionales | 3300 ; 5900 | 3740 ; 5660 | 0 / monté |
| Crête orientale | 7280 ; 3100 | 7900 ; 3450 | 0 / monté |

Le rendu teinte seulement l'intersection d'une ellipse alpha avec la véritable
union des formations V85. Les 156 polygones de sol public sont tous exclus,
ainsi que les boîtes peintes exactes du pad et de la navette. Les rues restent
pavées ; les bras de lave, le ciel, les façades et les props ne deviennent pas
un sol opaque. Le SVG demeure limité à la fenêtre de caméra ; ses textures ont
une origine fixe dans le monde, sans déplacement du motif à chaque image.
Les JSX des polygones immuables sont réutilisés lorsque la caméra bouge.

L'ancien calcul des terrasses V85 est extrait sans changement de géométrie dans
`homeworldNaturalSupportsV85.ts`. Son ancien export de scène reste disponible.
Ni les 392 sprites naturels actifs, leurs échelles, leurs collisions, leurs
sources, les sols physiques, les sauvegardes ni les conditions de voyage ne
sont modifiés. Aucune nouvelle animation n'est revendiquée.

Les six fenêtres du PNG natif `1254×1254` restent de `418×627` pixels, projetées
depuis `260×390` unités : une seule échelle uniforme avant la projection
`Y×sin(35°)`. SHA256 conservé :
`b144ee16a08881cce91b7652c8f2d8801e6c51c25e441e6586d407857c7b6307`.
Le fichier source a été inspecté visuellement : six matériaux de roche, cendre,
gravier et humus, sans légende imprimée. Sa périodicité n'est pas certifiée ;
les raccords doivent encore être observés dans le jeu réel.

## Codex et preuves locales

Les quatorze fiches du codex actif reprennent les mêmes coordonnées, altitudes
et ancrages que le renderer. Les liens de rue historiques utilisent leur vrai
identifiant `street:…` lorsque le sol V77 conserve cette fiche. Tous les liens
de ces patches sont résolus. Les trois refus restent consultables dans un
espace documentaire `authoring:ecotones-v90` ; ils ne décrivent pas un sol peint.
Les deux grandes enveloppes V71/V75 sont également identifiées comme
documentaires, plutôt que comme un rectangle réellement présent dans la cité.
Leurs catalogues historiques ne sont pas modifiés.

Sept tests dédiés vérifient les sources, la projection, les véritables seuils,
les refus, le clipping de tous les sols publics et le JSX réellement monté.
Un maillage d'admission de 32×32 exige au moins 16 échantillons dans la zone
centrale alpha ; il rejette une intersection vide ou minuscule. Un contrôle
distinct dans les caméras d'arrivée réelles `1440×850` et `410×640` exige pour
chaque patch monté au moins 24 échantillons exposés espacés de 16 pixels.
Le petit format contient 149 à 766 points exposés selon le patch : une partie
de son matériau possède donc un vrai support naturel dans le champ visible.
Ces maillages sont des contrôles géométriques discrets, pas des observations
des pixels par un navigateur ou une preuve de fluidité sur mobile.

Régression ciblée initiale : huit suites / 37 tests PASS, aucun échec ni omission
(`work-local/v90/qa/homeworld-ecotones-regression-v90.log`, 59 951 ms). Elle couvre
les sept trajets entre niveaux, les 43 portes et dix retours régionaux depuis le
port, les 98 routines civiles avec leur corps entier, les fondations natives,
le rendu serveur, les sources et les liens du codex. Lint et `git diff --check`
ciblés sont passés. Après la distinction des deux enveloppes documentaires,
trois suites / 17 tests sont rejoués avec succès, sans échec ni omission
(`homeworld-ecotones-final-v90.log`, 11 313 ms), avec lint ciblé à nouveau passé.
Ces 17 contrôles font partie des 37 tests distincts, ils ne s'y ajoutent pas.
Le résultat est remis à l'agent principal pour son contrôle global et sa
publication ; aucun build global, commit, push ou déploiement n'est effectué
par cet agent.

Cinq archives JSON QA ont été produites via `defaultSave`, `exportSave`,
`parseSaveImport`, `createHomeworldCheckpointV77` et
`resolveHomeworldLocationV77`. Les propriétaires sont distincts, aucun état de
campagne réel n'est utilisé. Elles servent uniquement à l'import UI d'une
session locale de test. Le rang Blooded y est un setup adulte historique
(`prologue:null`), pas un rite gagné ; aucune complétion de chapitre humain
n'est revendiquée. Leurs arrivées sont validées par le sol civique actuel.
Rapport : `work-local/v90/qa/ecotone-fixtures-synthetic-v90.json`.

Les textures et l'implantation constituent une adaptation originale compatible
avec le plateau volcanique du jeu, sans carte officielle ni prétention 1:1.
Ce lot ne remplit pas les régions entières, ne génère pas de nouveaux sprites,
ne termine pas les trois épaules supérieures absentes et n'efface pas les
échecs historiques de la régression complète V89.
