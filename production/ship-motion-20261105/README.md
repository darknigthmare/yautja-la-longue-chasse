# Cinématique — perspectives du vaisseau, reprise du 5 novembre 2026

## Résultat intégré dans ce lot

Cette reprise complète les huit vues individuelles du vaisseau classique déjà
générées et ajoute deux effets indépendants de réacteur. La version applicative
de la branche devient **1.5.2**. La base distante est la tête `a7f830c` de la
PR cinématique #114 ; ce travail constitue un ajout à cette base.

| Besoin | Ressources et comportement |
| --- | --- |
| Approche | Trois-quarts avant puis vue avant légère, raccord au profil |
| Inclinaison orbitale | Vue dorsale légère puis accentuée, retour par la vue légère |
| Descente avec le vaisseau | Vue ventrale légère puis accentuée ; raccord progressif au profil |
| Éloignement après largage | Vue arrière légère puis accentuée |
| Réacteur | Noyau lumineux et jet distincts, uniquement lorsque l'ouverture est visible |
| Largage du trio | Profil historique conservé pendant les trois départs ; origine propre à chaque capsule |
| Contact et sortie au sol | Profil et points de contact existants conservés |
| Camouflage | Coque, éclairage, réfraction et bord utilisent exactement la même vue et la même transformation |
| Accessibilité et chargement | Mouvement réduit, pause/reprise et repli vers le profil sélectionné si une vue manque |

La famille concerne `classic-predator-spaceship`. Les autres vaisseaux gardent
leurs propres ressources et leurs calibrations ; aucune coque n'est substituée.

## Raccords effectués

Les points initialement estimés ont été remplacés par les mesures de chaque
source : nez projeté, arrière, contact ventral, pivot et sortie visible du moteur.
Les marges transparentes font partie du canevas de calibration.

Pendant chaque transition, une transformation commune aligne l'axe et la
longueur projetée des deux images. Les points d'attache sont transformés par
la même matrice. Le fondu utilise une composition additive isolée pour éviter
la baisse d'opacité commune d'un fondu ordinaire. L'éclairage compense aussi
la rotation propre de chaque vue ; le miroir reste un miroir horizontal.

Tous les changements sont calculés à partir de l'horloge déjà enregistrée de
la cinématique. Ils n'ajoutent ni animation autonome ni temporisateur de jeu.
Les transitions de plans à 23 et 31 secondes ne réinitialisent pas l'orientation.
Une famille incomplète reste entièrement sur le profil, pour éviter des
changements tardifs de perspective pendant le vol.

Le noyau du moteur est dimensionné sur son ouverture apparente. Le jet part
de sa pointe lumineuse mesurée, et non du centre de son fichier. La poussée
augmente après le largage et son éventuelle modulation s'arrête en mouvement
réduit. Ce traitement visuel ne modifie pas les règles d'énergie ou d'alerte.

## Travail précédent conservé et repris dans la livraison

- Lot de 50 effets et fragments par biome, avec sources et provenance.
- Noyau séparé du pod, volets fermés en orbite et déploiement en atmosphère.
- Choc et traînée d'entrée atmosphérique.
- Autodestruction et récupération du pod, contrôles de distance du joueur et
  des compagnons, durée de compte à rebours et effets associés.
- Coût énergétique et conséquences de discrétion du camouflage déjà définis.

Ces éléments récupérés sont conservés ; les huit vues et les deux effets du
moteur ne sont pas comptés comme un nouveau lot de cinquante.

## Fichiers de référence

- [Mesures et revue des pixels](art/sprite-review.md)
- [Mesures, empreintes et résultats détaillés](art/sprite-review.json)
- [Prompts et sources des huit vues](art/generation-jobs.json)
- [Prompts et sources des deux effets du moteur](art/engine-generation-jobs.json)
- Runtime : `app/game/systems/planetArrivalShipMotion.ts` et
  `app/game/systems/planetArrivalShipEffects.ts`.
- Rendu : `app/game/PlanetArrivalCinematic.tsx` et son module CSS.

## Vérifications et portée

Les tests ciblés vérifient les transitions, matrices d'alignement, points de
largage, absence de réinitialisation d'horloge, repli sur le profil et les
sources d'effets réellement décodées. La revue des dix exports confirme la
conservation exacte de l'alpha et des couleurs prémultipliées des sources.
Les sources historiques et leurs attestations restent distinctes.

La recette `scripts/qa-ship-motion.mjs` monte le composant de production sans
le réécrire : temps réel, boutons ordinaires, captures et vidéo natives.
Elle couvre le trio, les vues, les attaches, la pause/reprise, le camouflage,
le sol et la défaillance volontaire d'une vue, en 1280×720 et 390×844.
Les recettes spatiales et pods complètent ce contrôle avec l'application
compilée. Leurs rapports sont rattachés au commit réellement exécuté.

Chromium local refuse le démarrage avec `socket() failed: Operation not
permitted`. Les workflows GitHub fournis exécutent donc la revue navigateur
dans leur environnement autorisé. Aucune capture locale ni réussite distante
n'est déduite du seul succès des tests de code.

**Fidélité artistique :** les vues dérivent du même profil de référence du
projet. Les faces nouvellement révélées sont des interprétations générées,
avec des différences de détail documentées. Cette intégration et la revue
technique ne constituent pas une homologation canonique 1:1 ou une validation
artistique humaine. Les doubles contours à mi-fondu et le camouflage restent
à regarder dans les captures et la vidéo produites par le navigateur.
