# V86 — contenu Excel et PNJ Drive

La V86 poursuit la source V6 du 7 octobre sans modifier les classeurs, leurs
formules, les PNG fournis ni les sauvegardes existantes. Elle ne représente pas
l'achèvement de toutes les feuilles, tous les PNJ ou toutes les missions.

## Imports natifs

Les quatre ZIP V6.8 « Garnisons et guerre » ajoutent 72 PNG originaux, soit
20 + 20 + 16 + 16, 18 groupes et quatre fonctions par groupe. Les archives,
manifestes, SHA256, dimensions RGBA et faits d'alpha ont été comparés. Les
170 595 836 octets natifs sont conservés sous `public/game/imports/v86/garrisons`.
L'importeur ne lance aucun script de pack. Les archives visuelles du menu
permettent leur recherche et leur consultation par pack et groupe.

Il s'agit d'individus originaux du projet en pose fixe, pas de personnages
canoniques 1:1 certifiés ou de nouvelles animations. Les quatre humains acceptés
restent consultables comme PNJ ; le provider des corps Yautja les refuse, même
par identifiant explicite. Les anciens costumes, identités et PNG sont conservés.
Voir `drive-garrisons-v86-sources.json` et `qa-v86-recent-source-independent-review.md`.

Dans les dix villages, les dix résidents `watcher-b` immobiles et classic
compatibles utilisent désormais les sentinelles natives de leur clan V4, avec
semelles, pivots et tri de profondeur mesurés. Le guetteur reste une variante
documentée ; en cas d'image manquante, le corps modulaire précédent subsiste.
Les citoyens mobiles, autres anatomies, enfants et personnes nommées ne sont
pas remplacés par des poses fixes. Ces dix bindings utilisent V4, pas les
nouveaux individus militaires V6.8 sans emplacement attesté.

## Guerre de clans V6

L'onglet « Logistique et ouvrages » raccorde l'abri W3-S02, la balise W3-S05 et
le seuil W3-S07 : reconnaissance, pièces identifiées, porteur, passage compatible
RAV, livraison, deux tours travaillés et occupation par l'opérateur requis.
Les volontaires ont un coût, un délai et leurs propres identités. L'entretien
compte une seule fois chaque équipe et ouvrage, avec le plafond PC source.

Ce mode reste un exercice autonome en mémoire. Il ne donne ni territoires,
armées, maisons, matériel ou gains de campagne. Les quinze autres structures,
combats et arrivées de campagne restent à raccorder. Voir `clan-war-v86-works.md`.

## Première halte issue des dialogues V6

La scène D6-W-CULT-25 conserve exactement ses lignes de Scènes de dialogue V6
416, Choix et actions V6 854–855 et Répliques V6 3447–3454. Un hôte dédié est
placé auprès de la table native `place-table` dans le Refuge des Trois Vents,
Chaîne des Orages. Son emplacement et son apparence neutre sont des adaptations
locales ; aucun autre PNJ ou récit personnel n'est usurpé.

Le choix B sans boisson exige un adulte admis, le retour attesté du même pistage
local (trois traces, 90 ticks observés, track/report), l'hôte présent, le sol
praticable et le joueur arrêté près de la table. Le dialogue de choix/réponse et
trois gestes narrés avancent volontairement. Un reçu optionnel versionné conserve
phase, propriétaire, run, sources et interruptions dans la sauvegarde normale.
Une écriture refusée n'avance pas le geste. Données futures ou étrangères sont
refusées sans reset ; les anciennes parties sans ce champ restent compatibles.

La branche A, les boissons servies, la corde cédée et la réussite matérielle
restent silencieuses tant que ces faits n'existent pas. Aucun objet, XP, soin,
trophée, rang ou stock n'est attribué. Les profils vocaux V6 sont du texte :
aucun clip de voix n'est prétendu enregistré. Une seule scène est partiellement
jouable ; les 730 scènes du lecteur ne deviennent pas 730 missions réalisées.

## Contrôles et limites

Les rapports de tests, captures et journaux de compilation sont séparés dans
`work-local/v86/qa`. Les tests de sauvegarde couvrent conservation, propriétaire,
version future, interruption, quota et réconciliation. Les tests de sources
contrôlent les octets et les références ; ils ne certifient pas le lore visuel.
La compilation de production emploie Next.js webpack, comme Vercel.

Le lot final consolidé compte 132 tests PASS, zéro échec ou ignoré ; le lint
ciblé et la compilation Next.js de production ont réussi. Le contrôle CUA du
jeu compilé a affiché les nouveaux packs et parcouru l'abri jusqu'au repos
(tour 8, 57/80 RAV). La fixture hydratée a exercé choix/réponse, interruption,
relecture Map, reprise, refus d'écriture, maintien du dialogue ouvert puis
résolution étape 5/révision 8, toujours sans gain. L'inspection du garde régional
utilise le vrai renderer SSR, avec masque de pause caché uniquement pour la
capture ; ce n'est pas une preuve de commandes jouées en région.

La vérification du dialogue sur fixture contrôlée ne prouve pas qu'une campagne
a accompli naturellement son pistage : elle permet d'exercer le vrai composant,
sa pause et son reçu, sans falsifier une sauvegarde du joueur. Les suites
historiques globales et les 139 feuilles ne sont pas déclarées entièrement vertes
ou implémentées. Les liaisons de campagne pour les navires et SHIP-01, les voix
enregistrées, les animations sociales et les packs V6.5 non récupérés restent
des travaux distincts.

Suivi de la revue indépendante : la phrase historique du codex « sans test » a
été remplacée par une limite de certification précise. L'export ancien
`RECENT_SPRITE_GROUPS_V85` reste un export historique ; l'interface construit ses
groupes depuis l'ensemble réel des assets. Aucun champ de masque ou morphologie
absent n'est rempli par supposition.
