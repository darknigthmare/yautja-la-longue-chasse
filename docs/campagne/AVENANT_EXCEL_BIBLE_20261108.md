# Avenant vivant — Excel, Berceau, compagnons et incidents du bord

**Date : 8 novembre 2026.** Base de la passe :
`254b4b972af3c32cb078da3744241b2c0ea2f46c`, branche
`feat/excel-bible-completion-20261108`.

Cet avenant décrit le raccord réalisé dans le code et ses preuves propres. Les
classeurs et documents historiques restent conservés : leur ancienne mention
« documentaire seulement » décrit leur date de rédaction et ne constitue plus,
à elle seule, un constat sur la branche actuelle. Inversement, les nouveaux
fichiers ne permettent pas de déclarer toute la bible réalisée.

Le suivi courant est
[Yautja_Suivi_Excel_Bible_20261108.xlsx](../../production/excel-bible-20261108/suivi/Yautja_Suivi_Excel_Bible_20261108.xlsx).
Sa feuille **Livraison** et
[qualification-courante.json](../../production/excel-bible-20261108/suivi/qualification-courante.json)
distinguent produit, intégré, tests de comportement, parcours navigateur et revue
artistique humaine. Un PNG, un import de données, une compilation ou une
occurrence d’identifiant ne clôture pas automatiquement une exigence.

## 1. Sources rapprochées

Les 108 classeurs d’origine ont été lus sans modification : 2 896 feuilles avec
les copies, 824 contenus de feuilles distincts. Le registre regroupe 11 111
observations retenues en 8 625 sujets par domaine et identifiant, en conservant
leurs cellules d’origine. Il sépare 6 148 sujets issus de suivis de famille
courants et 2 477 déclarations d’avenants historiques. Ces catégories décrivent
la provenance documentaire, pas un diagnostic automatique du gameplay actuel.

La bible V6 fournit 4 304 cartes ou scènes de conception. Les répliques, choix,
réactions et voix associés restent du contenu lié à ces scènes ; ils ne sont
pas comptés à nouveau comme autant de fonctionnalités. Les annexes apportent
118 règles et recettes : 38 pour les compagnons, 40 pour Warp Universe,
28 pour le Berceau et 12 pour la mobilité. Ces volumes se chevauchent et ne
doivent pas être additionnés.

Le texte courant de `BIBLE_DE_CAMPAGNE.md` est également conservé en
**1 680 unités de lecture** dans la feuille **Bible campagne** : paragraphes,
points de conception et entrées de tableau, avec leurs lignes source. Il
comprend les dix rubriques L et les 67 rubriques R2 effectivement présentes,
ainsi que les décisions, besoins transverses, variantes d’équipement et
prompts musicaux. Ce découpage ne compte pas chaque paragraphe comme une
fonctionnalité supplémentaire. La priorité des règles L sur l’ancien ordre
des rangs est conservée.

La même feuille inclut les autres textes du dossier campagne : **37 documents
Markdown et 4 257 blocs au total**, complétés par l’inventaire de **73 documents
et manifestes Markdown/JSON** avec leurs empreintes. Les fiches ORG et Premium,
Warp, mobilité, planètes/tribus et Berceau restent donc consultables au-delà
des seuls critères QA. Les anciens rapports de livraison ou de vérification
conservent une portée datée ; ils ne sont pas traités comme une attestation
nouvelle du jeu.

Les empreintes, la sélection et la méthode sont décrites dans
[le dossier de suivi](../../production/excel-bible-20261108/suivi/README.md).
Les anciens ouverts `AUDIO`, `DUNGEON` et `BROWSER` du château de Wolf sont
explicitement rapprochés des preuves antérieures du 4 novembre ; l’audit ne
prétend pas avoir rejoué ces parcours.

## 2. Berceau enfoui : raccord de campagne

### Accès et identité du lieu

[buriedCradleCampaign.ts](../../app/game/systems/buriedCradleCampaign.ts)
raccorde le modèle existant à la sauvegarde de campagne. Le départ demande les
huit chasses terminées et un vaisseau personnel possédé ; lorsque la campagne
possède une chronique, son rite Blooded doit être reconnu. Les anciens formats
sans chronique suivent la compatibilité déjà utilisée par le projet. Le Clan
Ship doit être désamarré et aucune insertion planétaire ou visite du château
Wolf ne doit encore occuper le joueur.

Le lieu reste **PLAN08**, entrée **XP-Z11**, zone **XP-Z12**. Les douze tableaux
T01 à T12 développent le Berceau ; ils ne renomment aucune des huit chasses.
La pouponnière T09 ne devient pas le vestige global XP-Z09. La reine active
appartient à T12.

### Scène raccordée au modèle

[BuriedCradleScene.tsx](../../app/game/BuriedCradleScene.tsx) affiche les décors,
portes, supports, dangers et zones exposées à partir de
[buriedCradle.ts](../../app/game/systems/buriedCradle.ts). Le joueur utilise son
apparence et son équipement enregistrés. Déplacement, saut, lames, interaction
et pause disposent d’entrées clavier, tactiles et manette dans la scène.

Le modèle comprend douze lieux reliés par quatorze liaisons, les détours
facultatifs T06 et T09 et trois raccourcis : T06↔T02, T07↔T03 et T10↔T07. Le
drainage et la section de l’anneau racinaire ont leurs états propres. Les phases
du combat suivent les ancrages, les membranes puis le bulbe. La défaite du boss,
le prélèvement de la crête, l’extraction et le débrief sont des étapes séparées.

Les fonctions de collision et les surfaces de la simulation sont conservées.
Cette géométrie est une adaptation jouable du projet ; l’affichage ne certifie
pas une reproduction artistique à l’identique des planches de conception.

### Persistance et reprise

Le dossier `buriedCradle`, version 1, appartient à `SaveGame.createdAt`. Il
conserve la coque, la difficulté de départ, les lieux visités, les raccourcis,
la dernière balise admissible, le drainage, les racines, la neutralisation de
la Matriarche, la crête et le résultat du débrief. Les écritures passent par le
mécanisme commun de sauvegarde confirmée. Une écriture non confirmée suspend la
scène et propose une nouvelle tentative.

Les budgets de balises intermédiaires sont **2 / 1 / 0 / 0** pour Young Blood,
Hunter, Élite et Elder. La balise d’entrée reste disponible. La relecture a
détecté et fait corriger le retour T11→T10→T07 : repasser par T07 ne rétrograde
plus une balise 11 déjà acquise, ce qui évite un refus permanent de sauvegarde.

**La reprise conserve désormais l’état exact enregistré.**
[buriedCradleSnapshot.ts](../../app/game/systems/buriedCradleSnapshot.ts)
sérialise la salle, la position et les vitesses du joueur, ses points de vie et
temporisations, l’horloge de simulation, le piège racinaire, les parties et la
phase de la Matriarche, ses attaques et ses nappes acides. Les commandes
maintenues, objets du navigateur et références audio restent hors de la
sauvegarde. Un relâchement des commandes est requis après la pause.

La scène enregistre les changements de progression ou de combat, les pauses,
les sorties, et au plus tard après cinq secondes supplémentaires de simulation.
La reprise est exacte par rapport au dernier enregistrement confirmé ; elle
n’implique pas une écriture de chaque image avant une fermeture brutale. Les
anciens dossiers sans snapshot restent compatibles et repartent de leur balise.
Un KO reconstruit la tentative de combat à la balise en conservant les
modifications du lieu ; une pause conserve le combat vivant.

Les créneaux manuels et **Continuer** identifient le Berceau. Les exports
portables, archives complètes et archives de compte conservent son état ; une
archive avec une autre coque ou une chasse simultanée est refusée. Les formats
futurs, valeurs incohérentes et écritures non confirmées ne remplacent pas
silencieusement les données existantes. **XBE-Q23 reste partiel** : la reprise
des phases est testée, mais l’équipe de terrain n’est pas ajoutée par ce lot.

Le débrief ajoute, lorsque la chronique est présente, la preuve de première
chasse de reine après une crête rapportée. Il n’exécute pas le rite de
reconnaissance Élite. L-05, les autres preuves requises et la reconnaissance
restent indépendants. Un repli ou une victoire sans crête ne devient pas un
trophée de reine.

### Ressources et provenance

[import-buried-cradle-runtime.mjs](../../scripts/import-buried-cradle-runtime.mjs)
reprend les **156 PNG existants** du pack versionné
`art-source/xeno-prime/berceau-enfoui/v2.3` vers
`public/game/xeno-prime/berceau-v1`, sans modifier leurs octets. L’import
contrôle les SHA-256 du manifeste source ; son mode `--check` compare les
copies et le registre
[buriedCradleArt.json](../../app/game/data/buriedCradleArt.json).

Ce nombre est celui des ressources importées, pas celui de nouvelles
illustrations, d’animations jouables ou d’images affichées simultanément. Le
rendu choisit les ressources utiles à chaque état. Les effets sonores raccordés
réutilisent le moteur commun ; cela ne constitue pas une nouvelle bande-son
spatialisée complète du Berceau.

### Recettes encore à distinguer

Les contrôles de modèle, de campagne et de reprise sont dans
[buriedCradle.test.ts](../../tests/buriedCradle.test.ts) et
[buried-cradle-campaign.test.mjs](../../tests/buried-cradle-campaign.test.mjs),
ainsi que
[buried-cradle-snapshot.test.mjs](../../tests/buried-cradle-snapshot.test.mjs).
Le [rapport du lot](../../production/excel-bible-20261108/berceau/verification.json)
et son [journal intégral](../../production/excel-bible-20261108/berceau/tests-run.txt)
attestent **43 tests réussis** : 16 du modèle, 18 du raccord de campagne et
9 du snapshot. Ils couvrent notamment la victoire par déplacement, saut et
lames ordinaires, la reprise des attaques et des pièges, les créneaux de
sauvegarde, les archives, les refus de quota et les confirmations incertaines.
Le rendu React côté serveur exerce les vrais composants, sans attester leurs
pixels, leur hydratation ou la réponse d’un navigateur.

Une [relecture indépendante](../../production/excel-bible-20261108/berceau/relecture-independante.md)
complète ces tests : son sondage déterministe soumet **76 803 états produits
par la simulation** au validateur de snapshot, sans rejet. Ses 24 épisodes
partent de conditions préparées pour couvrir les salles ; ils ne constituent
pas autant de parties complètes, ni une preuve exhaustive de tous les états.

Le protocole navigateur est dans
[qa-buried-cradle-browser-20261108.mjs](../../scripts/qa-buried-cradle-browser-20261108.mjs).
Le lancement local de Chromium a été refusé par la politique de sockets Unix,
l’accès du navigateur partagé au serveur local a échoué et la revue automatique
a rejeté l’exécution élargie. **Aucun parcours navigateur ni avis artistique
humain n’est attesté** par les 43 tests.

Les attaches visuelles des tentacules, la stabilité du pivot entre toutes les
poses, le cadrage vertical, le mixage, la lisibilité à forte charge et les
essais sur appareils physiques doivent conserver leur preuve spécifique.
L’ancrage de bouche mesuré et les zones de dégâts du modèle ne constituent
pas une revue artistique humaine. Les compagnons de terrain, les transports
compatibles et les extractions avec blessés ne sont pas ajoutés au Berceau par
la seule présence du nouveau registre de résidence.

## 3. Compagnons : accords, affectation et quartiers

### Un registre adossé aux recrutements existants

[companionResidence.ts](../../app/game/systems/companionResidence.ts) ajoute un
registre versionné et révisé lié au propriétaire de campagne. Il réutilise les
deux partenaires existants Ka’rhek et Sa’keth et les six recrues déjà gérées par le Clan Ship ;
il ne crée pas de doublon de leur identité ou de leur recrutement. Les anciens
postes restent distingués des nouvelles installations, et aucun quartier
personnel nouveau n’est attribué par une simple migration.

Les nouveaux recrutements du cercle du clan sont enregistrés en réserve par le
raccord atomique de recrutement. Les postes antérieurs restent conservés
pendant un premier projet de transfert ; ils ne sont pas attribués aux nouvelles
recrues par défaut.

Quatre accords secondaires originaux sont raccordés aux chasses existantes :

| Contact | Route de reconnaissance | Condition de retour | Habitat prévu dans le raccord |
| --- | --- | --- | --- |
| Brèche | Oseris-IV, `jungle-vey` | Nouveau retour réussi, au moins 1 scan et score 40 | Chenil blindé |
| Éclisse | Acheron-Sigma, `ruins-ancient-guardian` | Nouveau retour réussi, au moins 2 scans et score 40 | Baie de maintenance |
| Lance-Fendue | Oseris-IV, `jungle-vey` | Nouveau retour réussi, au moins 2 scans et score 50 | Alcôve de chasseur |
| Opale | Naraka-Delta, `swamp-hydra` | Nouveau retour réussi, au moins 2 scans et score 40 | Baie de repos et diagnostic |

La découverte d’un appel ne recrute personne. Le joueur accepte l’appel,
effectue une nouvelle chasse liée à son propriétaire et à son numéro de
rencontre, puis réalise deux préparations aux postes de bord concernés avant
de proposer l’accord explicite aux archives. Un ancien résultat ou la simple
visite d’un menu ne remplace pas cette séquence. Les choix sont des dialogues
de préparation ; ils ne sont pas présentés comme des scènes physiques inédites
de capture, de sauvetage ou de familiarisation déjà animées.

Ces quatre pilotes ont `fieldReady: false` : ils ne deviennent pas des suiveurs
de combat complets. Seuls les deux partenaires déjà pris en charge par le moteur
de chasse peuvent utiliser le déploiement de triade existant.

### Installation, transfert et présence

Le réaménagement suit trois étapes : programmer une destination compatible,
réserver les fournitures et l’emplacement, puis terminer les travaux au quai.
L’ancienne affectation reste en place jusqu’à cette dernière confirmation.
L’annulation restitue les fournitures réservées ; le transfert déplace une
affectation unique. La commande inclut le propriétaire et la révision observée,
et les changements de registre, ressources et affectation historique sont
confirmés dans la même sauvegarde de campagne.

Le raccord réserve quatre emplacements dans les coques personnelles
compatibles. Pods, chasseurs, planeurs et entrées de flotte ne sont pas traités
comme des résidences. Le chenil et les baies techniques ont leurs restrictions
de pièce. Les paliers du Clan Ship sont 7, 13 et 19 personnes **joueur compris**,
avec autorisation de progression et coût de fournitures ; ils ne remplissent
aucune place par un candidat non recruté. Ces valeurs sont des budgets de
disposition du projet, pas des mesures canoniques de vaisseaux.

[CompanionResidencePanel.tsx](../../app/game/CompanionResidencePanel.tsx)
présente les accords et commandes aux postes concernés.
[CompanionQuartersScene.tsx](../../app/game/CompanionQuartersScene.tsx) instancie
le module et l’occupant séparément à partir de la présence calculée. Sans
recrutement et installation sur le navire hôte, aucun nouveau quartier
personnel n’apparaît. Un membre déployé garde son quartier et perd son avatar à
bord ; un convalescent apparaît au point médical ; une affectation suspendue
ferme l’espace et ses services.

Les modules sont posés dans des réservations de galerie arrière, hors du sol
de circulation existant. Les commandes de relation et de chantier restent aux
postes de bord. Ce raccord ajoute une présence conditionnelle et ses décors ;
la création de chambres traversables et d’interactions intérieures propres à
chaque famille conserve un périmètre de production séparé.

### Lot artistique de quartiers

Le [manifeste artistique de cette passe](../../production/excel-bible-20261108/art/manifest.json)
répertorie **dix modules PNG originaux**, leurs sources, copies de jeu, tailles,
empreintes, limites alpha et pivots mesurés. Le catalogue est
[companionQuarterArt.ts](../../app/game/companionQuarterArt.ts).

Les douze définitions actuellement raccordées utilisent trois familles :
alcôve de chasseur, baie synthétique et chenil blindé. Les autres familles du
lot constituent des ressources disponibles pour leurs raccords spécifiques ;
les générer ne crée pas leurs recrues, leurs services ou leurs animations.

Trois images d’acteurs ont également été générées individuellement : **Brèche
(ORG-01), Lance-Fendue (ORG-16) et Opale (ORG-13)**. Le
[manifeste des acteurs](../../production/excel-bible-20261108/art/actors/manifest.json)
en conserve les sources, copies et mesures. Éclisse réutilise une image
existante, comptée séparément. Le lot représente donc **treize nouvelles images
PNG**, dont dix décors et trois acteurs, et non quatorze générations. Les poses
des autres occupants continuent de réutiliser leurs ressources existantes.

Aucun clip d’animation nouveau n’est déduit de ces images. Ni la génération,
ni les contrôles alpha, ni une prévisualisation technique n’attribuent le statut
artistique humain `validated`.

### Limites de l’annexe Compagnons

Les invariants du registre et les raccords effectivement exécutés peuvent
attester une partie des règles **ALL-01 à ALL-10** et des recettes
**QA-C01 à QA-C28**. Ils ne clôturent pas tout le catalogue Premium, les
comportements de furtivité et de navigation des nouvelles recrues, leurs
animations complètes, le carrier de grandes montures, les conflits de
cohabitation, les environnements extrêmes ou tous les états de capture et de
décès.

Les preuves de cette passe sont consignées dans
[le dossier compagnons](../../production/excel-bible-20261108/compagnons/README.md).
Le [rapport d’exécution](../../production/excel-bible-20261108/compagnons/verification.json)
atteste **24 nouveaux scénarios**, **84 tests réussis** avec les régressions
ciblées. La [matrice des 38 critères](../../production/excel-bible-20261108/compagnons/coverage.json)
distingue 15 critères réalisés dans un périmètre borné, 11 partiels,
4 contraintes préservées et 8 scénarios ouverts. Cela ne constitue pas
38 recettes intégralement terminées.

Le rendu des composants est exercé en SSR. Le lancement local de Chromium a
été bloqué par la politique de sockets AF_UNIX et la revue automatique a
refusé l’escalade signalée par le chantier racine. Aucun parcours navigateur
n’est donc certifié par ce rapport. La portée exacte de chaque critère reste
dans la feuille **Recettes bible** ; un test du registre ou un rendu de
composant n’y est pas transformé en parcours de chasse humain.

## 4. Clan Ship : deux incidents physiques

Les lignes **OPS-B01** et **OPS-B02** du classeur d’opérations du 5 novembre
sont raccordées dans
[clanShipIncidents.ts](../../app/game/systems/clanShipIncidents.ts),
[ClanShipIncidentPanel.tsx](../../app/game/ClanShipIncidentPanel.tsx) et
[ClanShipIncidentScene.tsx](../../app/game/ClanShipIncidentScene.tsx).
Elles utilisent les salles, les déplacements et les interlocuteurs déjà
établis. Les offres exigent les contrats préalables et la disponibilité réelle
de Garde du Seuil ou de Griffe de Fer à leur poste.

**Le scellé qui ment** demande de relever le témoin contradictoire du lot au
hangar, de consulter son identité aux archives, de choisir l’un des deux
isolateurs, puis de mesurer la pression résiduelle aux soins avant le contrôle
final au hangar. Une erreur maintient la restriction et exige de revalider le
diagnostic aux archives. Les indices restent conservés ; la coursive et les
portes restent praticables.

**Une lumière dans le relais** demande de comparer deux cycles lisibles et
stables avec leur référence aux archives, d’isoler la branche identifiée,
de prélever le composant R-2 à l’armurerie, de l’installer, puis de rétablir les
deux circuits dans l’ordre avant le contrôle à la table du conseil. La
projection locale passe par zéro, un puis deux circuits stables. Une mauvaise
permutation réinitialise le test en conservant la pièce installée. Aucun défi
de réflexe rapide n’est nécessaire pour lire les cycles.

Les neuf points d’intervention vérifient la salle et la position réelle du
joueur. Le guidage emprunte les contrôleurs et portes existants ; atteindre
un objet ne choisit pas automatiquement un isolateur. La reprise conserve un
journal versionné, appartenant à la campagne, avec ses indices et événements
ordonnés. Les étapes impossibles, positions inaccessibles, révisions périmées
et versions futures sont refusées. L’import applique aussi le plafond
d’erreurs du jeu afin de réserver une issue correcte au journal borné. État et gratification sont écrits ensemble.
Les reçus donnent **25 et 30 marques une seule fois**, choix d’équilibrage
initial qui reste à éprouver en jeu. Aucune variante d’extraction ou capacité
d’interception spatiale n’est accordée par ces reçus.

Deux nouveaux PNG transparents — isolateur scellé et relais double circuit —
remplacent les deux instances de terminal concernées sans agrandir leur
collision. Leurs lampes, étiquettes et états sont dessinés par le code. Le
[manifeste des accessoires](../../production/excel-bible-20261108/art/incidents/manifest.json)
conserve les sources, dimensions, empreintes et pivots. Avec les dix modules et
trois acteurs des compagnons, cette passe comprend **15 nouvelles images**.
Les 156 ressources du Berceau et l’import d’Éclisse restent comptés séparément.

Le [rapport incidents](../../production/excel-bible-20261108/incidents/verification.json)
atteste **14 nouveaux tests** et **98 tests réussis** avec les compagnons et
les régressions ciblées. Ce total contient les 84 tests du rapport compagnons ;
ces nombres ne s’additionnent pas. Les scénarios contrôlent les erreurs,
reprises, écritures refusées, pièces et récompenses uniques, et parcourent les
objets puis le retour au hangar avec le contrôleur de mouvement de production.
Le SSR vérifie les images et les deux circuits distincts.

La [matrice de couverture](../../production/excel-bible-20261108/incidents/coverage.json)
laisse **OPS-Q26 partielle** : B03 « Trophée contesté » et B04 « Retour
d’expédition » ne sont pas réalisés par ce lot. La navigation et les pixels
dans un navigateur, l’ergonomie mobile/manette, l’échelle des accessoires et
la revue artistique humaine restent ouverts. La réplique enrichie de confiance
et les effets futurs d’extraction/interception ne sont pas présentés comme livrés.

## 5. Vérification commune et critères de fermeture

Le [rapport commun final](../../production/excel-bible-20261108/verification.json)
consigne **375 tests réussis, sans échec**, la vérification TypeScript, le lint
strict et la compilation de production achevée après la dernière garde d’import
des incidents. La compilation produit dix routes et passe le contrôle CSS.
Les 43 tests du Berceau, les 24 des compagnons et les 14 des incidents sont
inclus dans ce total ; les commandes ciblées de 84 et 98 cas le recoupent aussi.
Ces résultats attestent leurs scénarios et la compilation, sans constituer une
recette navigateur, une session sur appareil physique ou une validation artistique.

Les autres ouverts Excel et bible restent accessibles par domaine, identifiant
et cellule source. Warp Universe, la mobilité, les variantes, les catalogues
d’armement, les structures de guerre et les autres familles ne sont pas
déclarés terminés par l’inventaire ni par ces raccords de campagne.

Pour faire évoluer une qualification, ajouter la preuve précise dans
`qualification-courante.json` : fonctionnalité et critère concernés, chemin de
code, scénario réellement exécuté, rapport et limite restante. Régénérer
ensuite le classeur. Conserver les déclarations et preuves antérieures avec
leur date ; ajouter un rapprochement actuel au lieu de réécrire leur histoire.
