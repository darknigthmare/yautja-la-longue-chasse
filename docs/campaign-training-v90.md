# Préparation de triade V90

11 octobre 2026. Lot jouable local après le premier acte du temple V70, proposé
au maître de la cohorte. Ce lot est un entraînement supplémentaire du jeu. Il
ne termine pas R2-M018, R2-M019 ou R2-M020 et ne produit aucune preuve du
Quatza-Rij, aucun rite Blooded, grade, arme permanente ou droit de vaisseau.

## Source et adaptation

Classeur privé V6 inchangé : SHA256
`87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.
L’extracteur lit seulement `Campagne commune!A21:I25` et
`Scènes de dialogue V6!A594:K596`. L’extrait versionné conserve chaque adresse
et sa valeur. Les contributions des trois, le choix de repli, les blessures
et le retour séparé viennent de ces demandes. Leur réalisation dans cet
exercice ne prouve pas l’accomplissement des missions citées.

Les noms Saar et Vek reprennent les participants incarnés dans V70. Le drone
xénomorphe natif V7 reste nommé drone, sans le renommer en créature Quatza-Rij.
Les sprites du joueur, des partenaires, du vétéran, les râteliers et les
modules architecturaux proviennent des sources natives déjà montées V70.
Les orientations gauche et droite sont leurs cellules indépendantes, jamais
un retournement d’image. Les contacts au sol suivent l’alpha mesuré.
La galerie, les postes, sa longueur de 3 440 unités, les huit coups, six points
de vitalité, fenêtres et vitesse de retour sont des choix de conception du
jeu. Ils ne sont pas présentés comme des mesures ou règles canoniques 1:1.
Les dialogues de ce lot sont rédigés pour cet entraînement et ne prétendent
pas être les répliques originales du classeur.

## Parcours joué

Sept faits locaux ordonnés : briefing auprès du vétéran ; contrôle du prêt
mécanique au râtelier ; présence effective des deux partenaires à leurs
postes ; observation de trois cycles distants ; issue du combat ; retour
physique des trois ; remise du rapport. Le joueur marche dans une galerie
continue, saute, esquive une charge annoncée puis frappe à portée pendant
le retrait. Chaque coup requiert les deux soutiens à leurs postes et inscrit
une contribution de chacun. L’acide reste au point d’impact.

Le jalon arrière permet un repli volontaire. À zéro vitalité, le combat
s’arrête avec une issue d’extraction aidée : Saar doit atteindre le joueur,
puis le déplacement devient lent. La pose KO est portée à son côté ; les
points de vitalité ne remontent pas. Le témoin ne reçoit le rapport qu’après
le trajet et l’arrivée des deux partenaires. Un résultat « rapporté » peut
être une réussite, un repli ou une extraction, sans être renommé victoire.
Le contrôle du prêt n’accorde aucune arme énergétique ou dotation permanente.
Les modes tactile, clavier reconfigurable et manette utilisent les contrôles
de campagne existants. La traduction glyphes/français accompagne les scènes.

## Sauvegarde et contrôles

Annexe facultative `soloV90`, version 1, liée à `SaveGame.createdAt` et au SHA
du classeur. Elle n’exige pas de réécrire une sauvegarde ancienne sans annexe.
Les commandes effectives entre deux écritures forment une trace bornée à
120 frames. Le propriétaire rejoue cette trace depuis le dernier checkpoint
durable et refuse toute différence dans la position, le combat, les
contributions, l’état ou les preuves. Le composant ne vide sa trace qu’après
confirmation de l’écriture. Échec, fenêtre inactive, réglages, pause ou images
indisponibles arrêtent la simulation. Les commandes doivent être relâchées
avant la reprise. Le composant ne remplace jamais un checkpoint inconnu par
un nouvel état vide.
Si l’écriture a été enregistrée mais sa lecture de confirmation est incertaine,
une réconciliation tardive reconnaît le même résultat exact et ses preuves
déjà acquises. L’ancienne trace en attente peut alors être resoumise sans
rejouer ses commandes ni créditer deux fois le temps. Toute position ou preuve
différente reste refusée.

Onze contrôles ciblés PASS, aucun ignoré, avec
`YAUTJA_V90_REQUIRE_SOURCE=1`. Ils jouent le combat et les deux replis par les
commandes physiques, vérifient chaque checkpoint, rechargent à chaque écriture,
refusent téléportation, soin, coups et preuves fabriqués, propriétaire étranger,
version future et voyage concurrent. Lint des six modules/contrôles PASS sans
avertissement. Le helper de parcours est réutilisable pour les tests root de
sauvegarde/export/import. Ces contrôles ne remplacent pas un essai visuel
interactif du jeu, qui n’est pas revendiqué dans ce rapport.

Le cadrage portrait possède une vue distante annoncée au repère d’observation :
elle suit le centre réel du drone et montre sa cellule native entière, à son
échelle habituelle, sur toute la course de démonstration. Elle ne déplace pas
le joueur ; marcher reprend sa
caméra. Les tests de cadrage vérifient les bords natifs PNG aux largeurs logiques
320, 375, 545 et 960. Une observation n’est reçue qu’immobile au repère.

Mesures du parcours contrôlé après correction de la démonstration distante :
réussite, 7 047 ticks, 17 545,5 unités parcourues, vitalité 6/6, huit
contributions pour chacun, 73 écritures ; repli,
2 641 ticks, 4 854,5 unités, vitalité 6/6 et zéro contribution ; extraction
aidée, 5 335 ticks, 5 141,25 unités, vitalité 0/6 et zéro contribution. Les
trois issues, la conservation et le retour physique sont vérifiés séparément.

## Encore requis

Le Quatza-Rij véritable doit recevoir ses propres cible et direction d’art
documentées, scénario et résultats de rite, retour de reconnaissance puis
geste de marquage. Les besoins de secours et pertes éventuelles du vrai rite
ne sont pas assimilés à cette extraction d’exercice. L’acquisition de coque
V89 reste indépendante avec ses conditions d’autorité et de moyens manquantes.
