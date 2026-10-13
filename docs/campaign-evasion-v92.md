# Campagne V92 — réutiliser l’esquive apprise

13 octobre 2026. Ce lot améliore le chapitre jouable **Préparation de triade**
V90, déjà raccordé dans GameClient après le Temple acte I. Il n’ajoute pas un
nouveau rite, un chapitre Quatza-Rij, une mission du classeur terminée, un
trophée, un équipement ou une promotion.

## Action effective

Le dojo apprend une esquive et possède déjà ses deux orientations natives,
mais le chapitre de triade n’en transmettait pas la commande. Le même binding
configurable, le bouton tactile Esquive et B sur une manette standard alimentent
maintenant le moteur de ce chapitre. Une pression relâchée engage une action au
sol : déplacement continu de 23 ticks, vitesse de 5,2 unités par tick, direction
choisie ou recul sans direction, récupération de 60 ticks. Une fenêtre des âges
2 à 13 évite la charge ; une esquive trop précoce ne protège pas du cycle entier.
L’acide reste dangereux et interrompt l’action lorsqu’il blesse.

Saut et frappe ne se superposent pas à cette action. Maintenir le bouton après
la récupération ne recommence pas une esquive sans relâchement. Une blessure,
une attaque en cours, une sortie du combat ou la vitalité nulle interdisent son
déclenchement. L’extraction aidée conserve la vitalité à zéro.

Ces durées, vitesse et fenêtres sont des choix de jeu, qui réemploient la
vitesse et les dessins de la formation existante. Ce ne sont pas des mesures
canoniques ni une immunité biologique affirmée pour les Yautja. La source V6,
son SHA et ses cellules restent inchangés. Aucun drone n’est renommé Quatza-Rij.

## Continuité et rendu

Les anciennes commandes gardent leurs codes ; l’esquive utilise un bit
supplémentaire dans la même trace de 120 commandes. L’action est un champ
facultatif du checkpoint, créé seulement lorsque ce contrôle est employé.
Les parcours anciens sans cette commande restent sans ce champ. Le propriétaire
rejoue les vrais déplacements, les collisions et le timer avant l’écriture ;
modifier direction, vitesse, récupération, durée ou trace fait refuser le
checkpoint. Une confirmation incertaine du même résultat durable reste
idempotente. Aucun changement de version globale de sauvegarde ni réécriture
des anciennes archives n’est requis.

Le renderer consomme le clip dodge existant du jeune, avec un âge local à
l’action ; les deux dessins de chaque orientation apparaissent dans leur ordre
et à l’échelle du corps debout. Il ne retourne ni ne déforme le PNG. La jauge
d’esquive montre sa récupération. Un repère HUD projeté depuis la vraie caméra
garde l’objectif visible dans les longues galeries en portrait ; il ne déplace
aucun acteur et n’accorde aucune preuve d’observation.

Les dialogues d’accompagnement expliquent le prêt, le signal, l’observation et
le retour. Le panneau de pause/finale distingue réussite, repli volontaire et
extraction assistée, puis expose les contributions, la vitalité conservée et
la remise du rapport. Ces dialogues sont une rédaction de l’adaptation du jeu,
pas des répliques originales de film ou du classeur.

## Vérification bornée

Neuf nouveaux tests jouent les commandes du vrai moteur depuis un combat
atteint par les chapitres existants : collision réelle avec et sans esquive,
mauvais timing, répétition tenue, acide issu d’un coup effectif, checkpoint
rejoué et parseur de sauvegarde, trois anciennes issues, vraie fonction de
rendu des quatre dessins, clavier/tactile/manette et cadrages de 320 à 960.
Ils passent sans échec ni test ignoré. La relance finale regroupe 30 tests :
ces neuf cas, onze contrôles V90 avec la source V6 privée requise, sept contrôles
de stockage/slots et trois parcours des vrais callbacks GameClient. Tous passent,
sans test ignoré ; lint ciblé sans avertissement. Quatre petits carnets QA privés,
créés par les vraies commandes du moteur et validés par le parseur, permettent
la revue visuelle de l’arsenal, du combat, d’une esquive et du retour terminé.

Ces contrôles moteur/renderer ne constituent pas une preuve d’essai humain en
navigateur ni de publication. Le Quatza-Rij réel, le reste du Temple, les suites
de campagne et les nouvelles missions PNJ demeurent des chantiers distincts.
