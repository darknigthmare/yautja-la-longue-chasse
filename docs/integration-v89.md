# Yautja — lot V89, 8 octobre 2026

Ce lot raccorde des éléments précis de la Bible V6 et des sources Drive. Il ne
signifie pas que les campagnes, la ville, les animations ou les classeurs sont
entièrement terminés.

## Contenu intégré

- S01, S06 et S08 : veille avec obstacle et hauteur, plateforme orientée avec
  angle mort, trois ancrages réellement transportés puis franchissement
  individuel du pont. Les opérateurs, stocks locaux, personnes et dates sont
  conservés. Ces parcours restent des exercices indépendants de la campagne.
- Chantier naval : accès depuis la cité et le pont pour un Blooded admissible,
  déplacement dans le hangar, inspection de coque et de charge, test du sas,
  réglage, pose et verrouillage de l'attache, nouveau test puis rapport au
  responsable. Chaque changement doit être confirmé dans la sauvegarde de son
  propriétaire. Réglages, transferts, absence de focus et versions incompatibles
  suspendent les commandes. Le retour du focus actualise aussi les boutons.
- Import de campagne JSON : fichier exporté par le jeu ou ancienne sauvegarde,
  prévisualisation, confirmation puis archivage dans un seul slot entièrement
  vide. Aucun slot occupé, secours, propriétaire ou workspace n'est remplacé.
  L'activation reste une opération distincte via le menu normal. Un export
  léger n'inclut pas les annexes THE PIT d'un autre appareil.
- Six planches Badlands, lots 8–13 : originaux conservés entiers et accessibles
  dans la bibliothèque et le codex, avec provenance et limites. Le catalogue
  référence désormais 1 877 SHA natifs distincts. Aucun de ces aperçus opaques
  n'est utilisé comme corps, sol, texture ou animation.
- Extérieurs du Homeworld : maison des délégations dégagée de l'escalier du
  Conseil sans couper les routines civiles, vraie allée pavée vers son parvis,
  deux assemblages de soutènement documentés dans le codex. La compatibilité
  des sept mobiliers obliques domestiques est réparée dans l'ancienne API City ;
  le monde à étages possédait déjà leurs colliders.

Le chantier ne possède aucun producteur d'accord et de moyens consommés :
`authority:null` reste explicite. L'inspection seule ne donne donc aucun
vaisseau et ne termine ni R2-M021 ni les missions suivantes. Le responsable
visuel et le hangar sont des adaptations du jeu, pas une certification canonique
1:1. Les limitations détaillées sont dans les rapports des trois sous-lots.

## Validation

Les 19 suites ciblées totalisent 226 PASS, aucun échec ni test ignoré, avec
`YAUTJA_REQUIRE_LOCAL_CLAN_PROOFS=1` et `YAUTJA_V89_REQUIRE_SOURCE=1`. Elles couvrent
les vrais octets importés, les lignes Excel, les handlers, le modèle, les quotas,
les propriétaires, la concurrence, les reprises et la conservation des anciennes
archives. Les trois carnets de jeu V88 restent identiques octet par octet.
TypeScript global sans cache incremental et ESLint ciblé passent.

Un premier build Next webpack et le contrôle du CSS compilé passent le 8 octobre
à 18:55 UTC. Une régression générale exécutée ensuite comporte 3 300 tests :
3 226 réussissent et 74 échouent. Ce relevé initial précède les corrections QA
supplémentaires du Homeworld et des harnais. Il ne constitue pas un feu vert
global. Les tests du monde actif avec niveaux sont distingués des assertions de
la cité ancienne sans niveaux, sans réduire le corps ou retirer des colliders.
Les corrections extérieures passent ensuite 71 contrôles distincts : 43 accès
aux bâtiments, dix retours régionaux, sept liaisons entre étages, 98 routines,
sources natives, raccord peint et liens du codex. Le détail et les limites sont
dans [homeworld-regression-v89.md](homeworld-regression-v89.md).

Les harnais des retours de région, du vol et du menu ont aussi été corrigés pour
leur contexte réel : référence de dialogue fermé, propriété `shipFlightActive`,
ref du menu effectivement rendu, présence des deux modes ajoutés en V81. Les
26 tests concernés passent sans relâcher les assertions de sauvegarde, de
neutralisation des commandes ou d'hydratation. Ce sont des réparations de tests,
pas des défauts runtime revendiqués comme résolus.
Les trois suites des providers de décor et de la scène passent aussi 14 tests.
Elles comparent exactement les sources montées par étage, leurs dimensions,
rectangles et échelles, et la partition des candidats acceptés/refusés. Les
treize PNG historiques restent identiques ; trois sources mesurées n'ont toujours
pas de placement sûr accepté et ne sont pas forcées dans la ville. L'atlas utilise
des titres SVG en chaînes uniques ; son effet dépend des mêmes scalaires stables.

Après ces corrections, le snapshot du premier lot est recompilé : lint de tous
ses fichiers modifiés, TypeScript global sans cache, Next webpack et contrôle du
CSS réellement compilé passent le 8 octobre à 19:34 UTC. Les intérieurs en cours
d'audit sont exclus de ce snapshot et restent un lot séparé.

La bibliothèque a été ouverte dans Edge sur le build Next local. Les compteurs,
les filtres, les packs V89 et la planche du lot 13 ont été observés. Ce PNG se
décode à 2 400 × 2 028. Capture locale :
`work-local/v89/qa/badlands-lot13-desktop.jpg`.

Le menu des exercices et ses ouvrages disponibles ont aussi été ouverts. La
sélection de fichiers puis le pilote CUA ont été interrompus après reprise de
session. Aucun parcours de pont, inspection navale ou import de campagne complet
dans un navigateur réel, ni rendu mobile de ces nouveautés, n'est revendiqué.
Les trois fixtures d'exercice locales sont explicitement synthétiques et ne
constituent pas des parties humaines jouées. Elles restent hors de Git.

## Publication et limites

La publication conserve tous les originaux dans Git et `public`. Un rewrite
Vercel, lié au SHA exact de la release, sert le groupe V85 depuis son origine
publique. Le post-build retire seulement ses copies générées vérifiées, pour
réduire la sortie statique. L'allowlist de scripts et la frontière du volume
static de l'adapter officiel ont été corrigées après lecture des erreurs réelles.
Le build `74623b1` a encore refusé un volume différent sous `static` ; la protection
n'a pas été désactivée. Le correctif `3cd21b6` exclut uniquement V85 à
l'empaquetage, tout en exigeant le rewrite compilé lié au commit. Les tests du
pipeline couvrent désormais aussi l'alias vers un original et les bind mounts
de même volume : 28 PASS. Aucun état READY de ce correctif n'est encore attesté
au stade initial du rapport. Le déploiement du correctif `3cd21b6` est ensuite
confirmé READY, avec l'alias public, à 19:33 UTC. Ses logs attestent zéro suppression
V85, 4 525 autres copies statiques dédupliquées, et zéro mismatch de taille, hash,
mode ou échec de lien. La sortie à copier mesure 5 113 145 025 octets. Ce READY
porte sur le correctif de publication et V88 ; le premier lot fonctionnel V89
n'est pas assimilé à cette preuve antérieure.
Une compilation locale, un push GitHub, un état Vercel READY et un contrôle de
production sont quatre résultats distincts.

Drive : 26 archives accessibles authentifiées, 599 entrées PNG comparées,
583 SHA déjà présents. Les six vrais manques importés ajoutent 6 168 549 octets,
zéro nouveau corps et zéro animation. Deux archives restent refusées par le
fournisseur au-delà de 256 Mio. Les 640 variantes V84 ne disposent toujours pas
de PNG retrouvé. Les transferts, scripts embarqués, versions historiques et
limites de fidélité ne sont pas assimilés à des contenus jouables achevés.
Le rafraîchissement de 19:18 UTC confirme 239 identifiants inchangés dans les
quinze dossiers connus, sans ajout ni révision Excel observée. Les empreintes
distantes ne sont pas exposées par le connecteur ; le SHA local du V6 est
recontrôlé, sans certification inventée des octets distants.
