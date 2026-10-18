# THE PIT V92 — admission native des phases d’équipement

Le lot admet **12 PNG originaux OpenAI, 24 dessins distincts et 12 clips orientés** pour les deux costumes masqués Ahab et Samurai PHG déjà fournis. Un geste par costume possède maintenant ses trois phases natives — préparation, contact et récupération — dans les deux orientations. Cinq autres originaux restent refusés et conservés. Cette couverture ne certifie ni l’apparence canonique 1:1, ni une animation fluide complète du combattant, ni son moveset complet. Les recettes mécaniques et leurs limites sont décrites dans [le lot mécanique V92](pit-authored-movesets-v92.md).

## Revue des originaux

Les feuilles 003 à 017 ont été ouvertes avec `view_image` en résolution originale. La revue porte sur l’orientation du masque, les deux bras et les jambes, les mains autour du manche, la continuité de l’arme unique, les pieds complets, l’attache de la cape et des dreads, ainsi que la différence réelle des deux poses. Les récupérations 014–017 montrent le retrait de l’arme puis son retour près du corps en garde ; elles ne sont pas des contacts renommés. Les feuilles admises restent des adaptations visuelles des références fournies : leur bonne lecture en jeu n’établit aucune certification canonique.

La mesure utilise le seuil alpha du runtime : un pixel est visible si son alpha dépasse 2. Le milieu géométrique y512 n’est jamais présumé correct. Les séparateurs réels et les pivots de pied sont mesurés sur les pixels de chaque original.

| Source conservée | Décision | Séparateur alpha réel | Découpe retenue | Clip |
| --- | --- | --- | --- | --- |
| 001 Ahab préparation droite | Refusée | Cellules horizontales insuffisamment séparées | Aucune | Aucun |
| 002 Ahab préparation gauche | Refusée | Le premier corps empiète sur la seconde cellule | Aucune | Aucun |
| 003 Ahab préparation droite | Admise | y504–513 | y509 | `pit.stand.medium.startup`, droite |
| 004 Ahab préparation gauche | Admise | y519–520 | y520 | `pit.stand.medium.startup`, gauche |
| 005 Ahab contact droite | Refusée | Aucune rangée vide entre les corps | Aucune | Aucun |
| 006 Ahab contact gauche | Refusée | Aucune rangée vide entre les corps | Aucune | Aucun |
| 007 Samurai préparation droite | Admise | y499–504 | y502 | `pit.stand.technique.samurai-katana-contact-v92.startup`, droite |
| 008 Samurai préparation gauche | Admise | y505–511 | y508 | Même clip, gauche |
| 009 Samurai contact droite | Admise | y513–515 | y515 | `pit.stand.technique.samurai-katana-contact-v92.active`, droite |
| 010 Samurai contact gauche | Refusée | Aucune rangée vide entre les corps | Aucune | Aucun |
| 011 Ahab contact droite, portrait | Admise | y688–874 | y768 | `pit.stand.medium.active`, droite |
| 012 Ahab contact gauche, portrait | Admise | y700–891 | y768 | Même clip, gauche |
| 013 Samurai contact gauche, portrait | Admise | y712–832 | y768 | `pit.stand.technique.samurai-katana-contact-v92.active`, gauche |
| 014 Ahab récupération droite | Admise | y736–769 | y752 | `pit.stand.medium.recovery`, droite |
| 015 Ahab récupération gauche | Admise | y714–787 | y750 | Même clip, gauche |
| 016 Samurai récupération droite | Admise | y730–754 | y742 | `pit.stand.technique.samurai-katana-contact-v92.recovery`, droite |
| 017 Samurai récupération gauche | Admise | y721–728 | y725 | Même clip, gauche |

Dans 005, 006 et 010, les pieds du premier corps et la tête ou les cornes du second partagent des rangées. Une coupe rectangulaire ferait apparaître un fragment voisin ou couperait le personnage. Ces pages ne sont donc ni chargées ni comptées comme couverture. Les dix-sept originaux, leurs prompts et SHA restent conservés dans `art-source/v92/pit/intake/manifest.json` ; aucun PNG n’est effacé, redessiné, transformé ou généré par miroir. Les feuilles 011 à 017 sont de nouveaux dessins OpenAI, pas des retouches des feuilles refusées. L’aspect de halo lors de la consultation brute provient de RGB caché sous alpha0 : la lecture des octets et le test du véritable traitement de transparence confirment qu’il ne constitue pas un fond visible. Ces RGB sont conservés avec les PNG originaux.

## Échelle, pieds et consommation

La famille de sources paysage **1536×1024** conserve ses références debout de **490 pixels pour Ahab** et **483 pour Samurai PHG**, prises sur la première pose de préparation droite. Les remplacements **1024×1536** ont été générés avec un corps plus grand malgré le prompt. Leur conserver la référence paysage agrandirait visiblement le chasseur pendant le coup. Une seconde référence SOURCE est donc mesurée une seule fois par chasseur pour cette famille portrait : **654 pixels pour Ahab** (haut de la tête/dreads y34 à pieds y687 dans 011) et **662 pixels pour Samurai** (cornes y50 à pieds y711 dans 013, hors pointe de katana).

`bodyHeightPx` conserve la référence historique ; `pageBodyHeightPx` applique la référence commune à la famille portrait du contact. Ahab 011 et 012 utilisent tous deux 654, pour leurs deux poses ; Samurai 013 utilise 662 pour ses deux poses. La pose debout gauche d’Ahab mesure 649 pixels contre 654 à droite, soit un écart source d’environ 0,8% : cet écart n’est pas effacé par une correction propre à sa pose.

Les récupérations ont été dessinées à des tailles source différentes, malgré le format portrait identique. Leur appliquer 654/662 grossirait le combattant pendant le retrait. Chaque nouvelle page reçoit donc **une référence SOURCE fixe**, mesurée sur sa seconde pose revenue à la garde, de la tête ou des cornes aux pieds, hors lame : 014 **730 px** (y770–1499), 015 **708 px** (y788–1495), 016 **724 px** (y784–1507), 017 **745 px** (y760–1504). Cette unique valeur sert aux deux dessins de la page ; aucun facteur n’est recalculé pour la première pose fléchie, l’enveloppe de l’arme ou chaque frame. Les différences anatomiques ou de posture résiduelles entre dessins restent visibles. Il s’agit d’une calibration d’adaptation, pas d’une preuve de proportions canoniques exactes.

Toutes les références projettent leur garde de référence sur la même hauteur physique du moteur, avec une échelle uniforme dans les deux axes. Les pivots de pied des récupérations, mesurés entre les deux pieds et sur le dernier alpha visible, sont 014 `(397,735)/(433,747)`, 015 `(681,713)/(613,745)`, 016 `(485,729)/(485,765)`, 017 `(560,720)/(549,779)` dans leurs cellules respectives. Les pivots et enveloppes alpha servent au contact du sol et au cadrage ; ils ne changent pas la collision du duel.

Les copies publiques sont strictement identiques aux originaux archivés, SHA et octets compris. Le registre de production importe `app/game/data/pitUserAnimationsV92.json` en priorité, uniquement pour les deux propriétaires et leurs variantes masquées exactes. Une orientation absente, un costume démasqué ou une ancienne technique de replay ne reçoit pas un autre clip.

Le temps des deux dessins est pondéré par le moteur réel, pas par une boucle indépendante : préparation moyenne d’Ahab **11 ticks = 6 ticks puis 5 ticks**, contact **3 = 2 + 1**, récupération **20 = 10 + 10** ; préparation de Samurai **6 = 3 + 3**, contact **8 = 4 + 4**, récupération **26 = 13 + 13**, dans les deux orientations. Les tests suivent aussi le retour réel à idle après ces trois phases. **Les autres coups, locomotions et costumes restent non couverts par ce lot** ; leur éventuelle couverture historique reste distincte. Aucune préparation n’est renommée en récupération ou en contact.

## Vérification bornée

`tests/pit-native-animation-v92.test.mjs` décode les vrais PNG avec Sharp, compare les SHA et les octets avec les archives, mesure chaque alpha et chaque séparateur, vérifie les vingt-quatre dessins distincts et l’échelle fixée par famille ou nouvelle page source. Un adaptateur Canvas déterministe passe ces pixels au véritable loader et au véritable renderer de combat. Les duels avancent avec `stepPitCombat` à chaque tick : le test vérifie la cellule exacte présentée pendant les phases **11/3/20 et 6/8/26**, dans les deux orientations, puis le retour à idle, sans transformation, mutation du combat ni emprunt de variante. La référence portrait est recalculée en lecture depuis les pixels de la tête et du pied ; ses deux poses gardent le même facteur de rendu.

Cet adaptateur n’est pas une QA navigateur et ne prouve pas l’esthétique de la scène finale. Les contrôles de navigateur et de publication restent ceux de l’agent principal.

Résultat du premier sous-lot : **5 nouveaux tests natifs passent**, puis **34 tests ciblés passent** ensemble, incluant les anciens PNG V91, les recettes et replays V92 et le laboratoire existant. Aucun test historique n’est réécrit. Le lint du registre et du nouveau test passe sans avertissement. Journal : `work-local/v92/pit/native-first-five-regression.log`.

Résultat cumulé après les trois remplacements : **7 nouveaux tests natifs passent** et **36 tests ciblés passent ensemble, sans échec ni saut**. Le nouveau test d’échelle utilise une tolérance de 10⁻¹² pour la multiplication flottante, après un premier écart arithmétique de `116.00000000000001` contre `116` ; cette tolérance ne couvre aucun écart de pixels, de SHA, de cellule ou de durée. Journal : `work-local/v92/pit/native-final-regression.log`.

Résultat cumulé avec les quatre récupérations : **8 nouveaux tests natifs passent**, puis **37 tests ciblés passent ensemble, sans échec ni saut** ; le lint du nouveau test et du registre passe. Les douze copies publiques sont byte-identiques aux douze originaux admis. Le test de chaque phase vérifie les vrais appels du renderer de combat à tous ses ticks, jusqu’au retour à idle. Journaux : `work-local/v92/pit/native-recovery-first.log`, `native-recovery-regression.log`, `native-recovery-lint.log`.

Cette réussite ciblée n’est pas une réussite de la suite globale historique : sa première exécution complète V92 conserve **57 échecs sur 3 573 tests**. Les 20 échecs du domaine Pit se répartissent en 15 assertions figées sur moteur10, un fixture de technique qui mélange les anciennes recettes et un nouvel état marqué V92, un audit PNG historique qui compare le katana dédié au contre générique de `PIT_FIGHTERS` V91, une regex HUD déjà ancienne au commit précédent et deux assertions de compteurs18/365. Le vrai registre du commit `1bee8ac` contient déjà375 clips ; celui des huit pages initiales V92 en contient383. Ses53 entrées anciennes et ses201 définitions historiques sont identiques au baseline. Aucun de ces tests historiques n’a été réécrit pour rendre la suite verte. Un diagnostic indépendant de six duels de720 ticks confirme que leurs replays actuels et leurs véritables replays moteur10 conservent les mêmes résultats ; il ne remplace pas ces tests ni une QA navigateur. Les régressions Homeworld restantes sont traitées séparément.
