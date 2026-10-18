# Intégration Yautja V90 — lot du 11 octobre 2026

Ce lot raccorde trois chantiers aux consommateurs joués. Il ne constitue pas
la fin du classeur, du Homeworld ou du roster de The Pit.

## Ville et paysage

Onze transitions de matériaux naturels sont réellement montées dans la scène
V77 : sept débouchés régionaux et quatre formations du plateau. Les six cellules
du PNG V75 gardent leur source, leur découpe et une échelle uniforme avant la
projection. Le masque exclut les rues, le pad et la navette. Aucun rectangle
opaque ne remplace l'environnement. Les trois propositions aux étages +1/+2
restent refusées et identifiées dans le codex ; leurs routes restent présentes.
Les volumes physiques, les sprites naturels existants et les sauvegardes de
la ville ne sont pas déplacés pour remplir une cible de quantité.

## Classeur V6 : chaîne fissurée

L'incident W5-EV25 est lié à un treuil réellement installé. Le suivi d'usure est
optionnel et absent des anciens carnets ; trois levages effectifs déclenchent
la fissure. Une section identifiée coûte six RAV locaux, puis est transportée
et consommée une fois après deux tours réellement travaillés par deux artisans
U20 immobilisés. Attendre ne répare pas. L'alternative rails coûte deux RAV et
doit être parcourue ; elle ne répare ni le treuil ni les passages fermés.

Le départ régional KR05 est un exercice isolé explicitement nommé, avec un
budget fini de 120 RAV. Il ne simule pas un trajet déjà accompli et ne donne
aucun progrès de campagne. Les seuils numériques sont des choix de conception.
Le kit de la branche rails est chargé au pied : l'abaissement physique d'une
charge suspendue décrit dans la source n'est pas livré.

## Campagne : préparation de triade

Après les chapitres joués jusqu'au Temple acte I, le jeune rejoint physiquement
le maître pour un exercice local : briefing, prêt d'outils, placement de Saar
et Vek, observation des cycles du drone, combat, retour et rapport. Le moteur
conserve victoire, repli ou extraction assistée ainsi que les blessures.
L'extraction à vitalité nulle n'est pas une résurrection.

Le drone emploie son atlas natif existant et n'est pas renommé en cible du vrai
Quatza-Rij. Les cellules du classeur V6 sont conservées dans une extraction
bornée, liée à son SHA. Aucun R2M018/19/20, Premier Sang, rang Blooded, arme
personnelle, trophée, expérience ou propriété de vaisseau n'est accordé.

Le chapitre est ajouté à la sauvegarde sans changer sa version 11 ni créer une
annexe dans les anciennes reprises. Les versions futures restent protégées.
Les checkpoints rejouent exactement les commandes non confirmées ; propriété
de campagne, quota et lecture de confirmation sont vérifiés avant navigation.
Un résultat identique déjà durable est acquitté sans ajouter d'étape ni de temps.
Une ancienne région terminée ne peut plus masquer une scène V90 active.

Le menu propose aussi le collage d'un JSON exporté, avec une limite de 1 Mio
mesurée en UTF-8. Cette voie utilise le même parseur, le même aperçu et la même
confirmation que le fichier ; elle n'active pas la campagne et ne remplace pas
un emplacement occupé. Une édition ou un changement d'emplacement invalide
l'aperçu. Ce transfert manuel n'est pas présenté comme une nouvelle fonction
de synchronisation automatique de compte.

## Sources et limites restantes

Le relevé Drive des quinze dossiers et 239 identifiants accessibles est inchangé.
Aucun nouveau PNG n'est ajouté par ce lot. Deux archives dépassent encore la
limite de transfert du connecteur ; leurs octets ne sont pas certifiés.
Les 640 variantes documentaires restent sans PNG natif retrouvé. Les silhouettes,
animations manquantes, vrais rites futurs, biographies et autres demandes des
classeurs restent des chantiers distincts, non déclarés terminés.

Voir `homeworld-ecotones-v90.md`, `clan-hoist-maintenance-v90.md`,
`campaign-training-v90.md` et `drive-refresh-v90.md` pour les adaptations,
preuves de source et limites précises. Les fixtures de QA, sources complètes
et relevés privés restent hors de Git, dans `work-local`.

La compilation, les tests, les essais visuels, le push GitHub, l'état READY
de Vercel et la vérification publique sont des étapes distinctes. Le bilan
de cette livraison doit conserver cette distinction et les échecs éventuels.

## Bilan local borné

Le lot ville/campagne/treuil figé passe 195 tests ciblés, sans test ignoré,
ainsi que TypeScript, lint et compilation Next webpack. La vérification des
styles The Pit porte sur les déclarations réellement compilées, sans certifier
à elle seule les pixels ou les caches publics.

La régression complète contient 3 440 tests : 3 406 réussites, 34 échecs,
aucun ignoré. Les 34 titres, emplacements et blocs de diagnostic sont identiques
à ceux de V89. Ils ne sont pas effacés ni tous déclarés faux positifs : anciens
contrats de City sans étage, compteurs, identifiants civiques migrés et brasier
historique constituent une dette distincte. Cette passe précède le dernier
ajout de collage JSON, dont les handlers et compatibilités reçoivent une
validation supplémentaire séparée.
Après ce delta, 46 tests des véritables handlers d'import et des autres
consommateurs du menu passent, sans test ignoré ; lint ciblé propre.

Un essai interactif sur localhost, avec une reprise synthétique déclarée et
le parseur normal, a joué les deux tours de réparation : après le premier,
le treuil reste consigné ; après le second, la même section est consommée une
fois et le compteur d'usure est remis à zéro. Les captures et traces restent
dans `work-local/v90/qa`. Cet essai n'est pas une bataille ou une reprise
historique humaine, et ne modifie pas les campagnes de production.

## Complément : attente des archives et limites visuelles

Le verrou d'archives attend désormais dans la file native du navigateur, avec
annulation après cinq secondes si l'attribution n'arrive pas. Aucun verrou
n'est volé, effacé ou remplacé par une imitation. Le délai cesse dès que le
verrou est attribué, avant l'opération synchrone : une libération tardive ne
transforme pas une écriture exécutée en faux refus. Les propriétaires et les
préimages sont toujours revérifiés sous verrou. Douze nouveaux contrôles sont
inclus dans les 145 tests ciblés archives, slots, transferts et compte réussis ; ces nombres
ne doivent pas être additionnés.

Dans le navigateur de contrôle, l'import collé puis la création d'une partie
sur une origine locale distincte restent refusés avant toute écriture. Le
callback reçoit une valeur falsy alors que la demande compilée emploie `signal`
seul, sans `ifAvailable`. Le diagnostic ultérieur ne trouve aucun verrou
d'archives actif ou en attente à cet instant. Cela ne prouve pas l'absence
d'une concurrence antérieure et n'identifie pas la cause d'exécution. Les cinq
emplacements demeurent vides. L'import et la création ne sont donc pas déclarés
validés en navigateur ; aucun garde-fou n'est désactivé pour les faire passer.

Un essai libre de The Pit a parcouru l'avertissement spoilers, le roster,
la sélection de la Clairière des pièges, l'entrée du chasseur et le combat
effectif. Les sprites natifs, le sol et le HUD ont été vus. Cette observation
ne certifie pas les 187 stages, toutes les animations, ni leur fidélité 1:1.

Le déploiement initial V90 `b528e28` est READY. Sa page publique répond en
HTTP 200 avec V90 ; les onze PNG nommés dans le relevé privé correspondent
octet pour octet aux originaux locaux. Ce relevé précède le complément de
verrou et ne certifie ni l'ensemble des assets ni la campagne jouée publique.

Le roster corrigé a été inspecté sur le build local à 320 et 375 pixels en
portrait, 812 pixels en paysage court et 1280 pixels sur ordinateur. Dans les
quatre cas, la largeur de défilement du document égale la largeur visible.
Le libellé long « Jungle Hunter — Unmasked / 30th Anniversary · Visage découvert »
reste dans son sélecteur ; les deux boutons de variante sont accessibles.
Les quatorze tests ciblés sélection, portraits et icônes passent. Ce contrôle
ne transforme pas les nombres du roster en preuve de fidélité ou d'animation.

La route locale `/visual-qa-v90` monte le renderer natif uniquement pour
inspecter sa composition, sans sauvegarde ni progression. Les vues de côte,
grottes thermiques, Piliers et alluvions sud ont été vues. Pour les ancrages
décoratifs, une position non admise reste annoncée : ils ne deviennent pas
des points d'arrivée de joueur. Voir `local-visual-qa-v90.md` pour le gate
privé, le statut HTTP vérifié séparément et les limites de ces captures.

La texture des fondations V81 s'ancre désormais par face avec une seule rangée
verticale native. Le contrôle des grottes thermiques a confirmé la disparition
de la corniche basse détachée du bord du marché. Le PNG, les quadrilatères,
la projection et les collisions restent inchangés ; les fortes pentes et les
formations naturelles V85 ne sont pas déclarées corrigées par ce seul delta.
Voir `homeworld-foundations-v90.md`.

Après les derniers deltas fondations et proxy, la passe ciblée campagne,
clans, Homeworld, sauvegardes et origine des sprites compte 216 réussites,
aucun échec ni test ignoré. Les 145 tests d'archives et les 14 de sélection
reçoivent leurs rapports séparés ; ces comptes ne constituent pas une nouvelle
régression exhaustive. Le build Next webpack final compile et le refus QA
local est réellement HTTP 404, tandis que le menu reste HTTP 200.
