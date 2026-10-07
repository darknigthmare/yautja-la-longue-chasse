# V87 — sources natives et logistique du classeur

Ce lot poursuit les sources Drive et le classeur V6 sans effacer les anciens
costumes, PNG, identités ou sauvegardes. Il ne constitue pas l'achèvement des
139 feuilles ni de toutes les campagnes décrites.

## Images réellement récupérées

Les deux archives V6.5 ajoutent 72 sources originales de matriarches et
cavaliers, soit quatre variantes pour chacune de 18 lignées. Le lot Badlands
V14 fournit sept autres sprites de faune, flore, décor et équipement. Les
27 images historiques distinctes du 21 septembre sont conservées en famille
« Illustrations et références historiques » ; les anciennes exclusions du
roster sont maintenues. Une planche opaque ou une identité inconnue ne devient
pas un combattant.

Les 106 PNG natifs, leurs dimensions, leurs 252 209 592 octets et leurs SHA256
ont été vérifiés, sans découpage ni modification. Les six transferts sources
sont documentés dans `drive-completion-v87-sources.json`. L'importeur ne lance
aucun script des packs. Les archives V6.5 documentaires et V6.9 ne contiennent
aucun PNG ; leur registre de production ne prouve pas des images disponibles.

La bibliothèque montée dans le menu expose chaque fiche avec pack, groupe,
rôle, variante et original téléchargeable. Le provider des corps Yautja refuse
les humains acceptés, animaux seuls et compositions cavalier/monture. Ces
images restent consultables mais demandent un renderer dédié avant usage
physique. Les matriarches ne correspondent exactement à aucun rôle et clan
d'un acteur stationnaire existant : aucun habitant n'est remplacé arbitrairement.
Ces poses ne fournissent ni marche, ni animation, ni certification canonique 1:1.

La comparaison supplémentaire de 58 archives authentifiées et 42 PNG individuels
porte sur 1 913 entrées PNG et 461 empreintes distinctes. Les 42 fichiers
individuels correspondent exactement aux natifs déjà présents. Elle récupère
121 autres PNG absents, soit 76 matériaux PHG reconstruits et 45 références
(18 planches, 22 documents, une capture de menu et quatre références de
génération). Leurs 495 001 123 octets restent inchangés. Aucun nouveau corps de
PNJ ou animation n'est déduit de ce second lot. Le bilan V87 atteint donc
**227 PNG natifs supplémentaires et 747 210 715 octets conservés**.

Les limites des manifestes restent dans le codex visible. Les matériaux ne
sont pas des textures extraites du jeu et 76 fichiers ne représentent pas
76 teintes officielles. La capture du menu Viking/Gator demeure une référence,
avec l'anomalie de corps et la portée du nom Waves documentées. Les grandes
planches sont chargées sur demande afin de ne pas décoder plusieurs dizaines
de millions de pixels en ouvrant une page de galerie. Voir
`drive-archive-audit-v87-sources.json`.

Trente autres archives restent contrôlées depuis leurs copies locales et les
empreintes des PNG déjà conservés ; leurs octets Drive actuels n'ont pas tous
été retransférés. Cet inventaire ne certifie donc pas une égalité fraîche de
chaque archive du Drive. Le pack V84 décrit 640 variantes sans en fournir les
PNG : ces fiches ne sont pas comptées comme 640 sprites importés.

## Guerre de clans

La cache S03 et l'atelier S04 rejoignent les trois ouvrages V86. Les opérateurs
U19/U20, kits, délais et entretiens suivent les cellules source comparées.
Le nouveau mode stocks locaux distingue dépôt, transports identifiés et caches
de vingt RAV. Chargement, traversée, livraison, retrait, restitution et
entretien préservent les lots et leurs comptes. La fermeture d'un passage ne
téléporte pas la cargaison. La pénurie indique les équipes rationnées.

Une reprise JSON indépendante version 2 demande confirmation avant remplacement
et rejoue les transferts pour vérifier les soldes. Elle ne remplace aucune
campagne ou sauvegarde de compte. Le mode comptable global V86 reste accessible.
Le texte exporté peut également être affiché et copié, puis collé et validé
avant confirmation. Tout changement de texte annule cette validation.
Une installation d'atelier ne répare pas gratuitement une liaison : les pièces
et un chantier réel manquent encore. Voir `clan-war-v87-logistics.md`.

## Manœuvres spatiales

Le vrai panneau du pont/hangar monte une approche pilotée par crans : alignement,
freinage, deux attaches, bague, route continue et seconde approche au retour.
La pause désactive les commandes, annonce sa raison et conserve le dernier état.
Le pilotage clavier fonctionne seulement quand la console a le focus ; les
listes de route conservent leurs propres flèches. Aucun raccourci global ni
commande de manette de vol n'est ajouté.
La coque existante se déplace dans le cadre ; elle n'est pas annoncée comme une
nouvelle sprite sheet. Voir `ship-flight-v87-scope.md`.

Un contrôleur prépare les mutations atomiques propriétaire/révision, preuves
d'acquisition, postes atteints, consentements, manifeste figé, carburant et
dispositions de retour. La campagne actuelle ne fournit pas de reçu d'acquisition
V6 ni de stock carburant identifié : seul l'exercice est jouable. Aucun équipier,
vaisseau, carburant, soin, territoire, XP ou honneur fictif n'est attribué.

## Vérification et limites

Le harnais hydraté du vrai panneau spatial a été joué par CUA : aller,
alignement opposé au retour, deux arrimages et sept gestes source enregistrés.
Suspension, reprise et présentation mobile ont été inspectées. Ce harnais sans
stockage privé ne prouve pas un contrat de campagne accompli naturellement.
Les rapports et captures sont conservés dans `work-local/v87/qa`.

La compilation Next/webpack finale et le contrôle du CSS compilé passent.
Les vingt fichiers de tests ciblés totalisent **155 succès, zéro échec** ;
ils vérifient les systèmes touchés, pas l'intégralité de la suite historique.
Le navigateur du vrai jeu compilé ouvre la bibliothèque V87 et ses nouveaux
packs. Une planche de 2400 × 21476 reste sans balise image avant demande ;
les matriarches V6.5 sont consultables avec leurs sources natives.

CUA a également joué la cache S03, le convoi, la livraison et l'entretien
(tour 10, dépôt 46 RAV, cache 15). Le JSON affiché de ce parcours a été repris
par le vrai panneau, après validation puis confirmation. Une version future
est refusée et laisse cette cache intacte. Le téléchargement par fichier n'a
pas été confirmé ; l'import via le sélecteur de fichiers est bloqué par les
permissions de l'extension Edge dans cette session. Aucun réglage de sécurité
n'a été changé. La reprise par texte est vérifiée séparément de ce blocage.

Les clips vocaux, batailles de clans, treize autres structures, campagnes
spatiales et PNG documentés mais absents restent des travaux distincts. Le
suivi des archives Drive, compilation, tests et publication est consigné
séparément ; aucun succès de modèle seul n'est présenté comme un parcours public.

## Préparation de la publication

Le premier déploiement `c9c1b6d` a compilé et vérifié son CSS, puis échoué
par `ENOSPC` dans la copie intermédiaire des fichiers statiques du runner
Vercel. Le poste Windows et ses sources n'étaient pas en cause.
Le build conserve ses contrôles puis compacte seulement les copies générées
dans `.next/output/static` : un fichier identique de `public` sur le même
volume peut fournir un hardlink après vérification des tailles et SHA256.
Le lien temporaire est installé par renommage atomique après validation ;
un échec de création conserve l'ancienne copie. Sept tests de protection
passent, en plus des 155 tests ciblés du jeu.
Les originaux, métadonnées et objets Git restent en place. Le CLI est inactif
hors du checkout Linux Vercel attendu et exige le SHA du commit de déploiement.
Les tests utilisent uniquement leurs propres fixtures. La réussite publique
reste conditionnée au statut READY et aux contrôles séparés du site.
