# V45 — animations par apparence et roster allégé

Ce lot poursuit THE PIT sans changer les sauvegardes, la progression ni les profils de combat. Les 195 entrées et 410 apparences V44 restent disponibles.

## Livré

- 177 miniatures WebP pour les cases des chasseurs fournis. Les 18 présentations historiques restent en place. Les deux grands aperçus et les poses de combat conservent les PNG originaux.
- 4,75 Mo de miniatures au total au lieu de 420,99 Mo de PNG pour ces mêmes cases : réduction de 98,87 % du volume des images de cases, sans revendication de temps de chargement mesuré sur matériel réel.
- Atlas liés au couple exact chasseur / apparence. Une version sans masque ne peut plus emprunter les animations d'une version masquée ; seules les apparences sélectionnées sont chargées.
- Atelier `/pit-lab` avec choix de l'apparence, couverture et export propres à cette apparence. Les orientations absentes sont signalées, jamais comptées comme animées.
- Ahab masqué : une vraie planche OpenAI, quatre dessins, deux séquences orientées à droite. La respiration boucle ; la garde se place puis maintient son second dessin. Relâcher et reprendre la garde réarme la séquence.
- À gauche, sans masque, et pour les actions non dessinées, Ahab conserve la pose fixe exacte fournie. Aucun miroir d'animation ne fabrique une orientation manquante.

## Contrôle des images

Trois autres candidates restent exclues : dérive du costume sur la première planche droite, crâne humain et canon incohérent sur la première gauche, puis canon encore ambigu et détails de masque divergents sur la seconde gauche. Les candidats et leurs prompts réels sont conservés ; seuls les quatre dessins acceptés sont publiés.

La planche publiée garde exactement ses octets et son SHA-256 OpenAI. Son alpha natif contient un bruit de très faible opacité : le traitement explicite `noiseFloor: 2` retire uniquement les valeurs alpha 1 et 2 dans la copie Canvas en mémoire. Il ne change ni les RGB, ni les valeurs alpha supérieures, ni les fichiers. Le contrôle strict des bordures reste actif. Les 36 579 pixels concernés équivalent à 176,37 pixels opaques, soit 0,0112 % de la surface de la page.

Les mains, les deux prises sur la lance, le canon, le trophée animal et les appuis ont été examinés. Les appuis d'attente n'ont pas de dérive horizontale après application des pivots et varient d'au plus un pixel vertical de source. Cette validation de projet ne constitue pas une certification anatomique exhaustive ou une fidélité canonique 1:1.

Le chargement direct de la référence dans l'outil d'image a échoué dans le helper de sandbox. Les générations ont donc été guidées par une description issue de l'examen du PNG fourni ; elles ne sont pas présentées comme des retouches conditionnées sur ses pixels. Aucune API payante externe n'a été utilisée.

## Vérification

Les 1 460 tests passent, sans échec ni saut (180,3 secondes). Le typage et le build final passent. Huit contrôles navigateur V45, six contrôles V44 et quatorze contrôles V43 passent, sans erreur JavaScript ou HTTP observée. La garde tenue puis réarmée est contrôlée dans le build final. Les résultats sont consignés dans `v45-local-validation.json` et les rapports navigateur V45. Les contrôles de non-régression V43/V44 couvrent la sélection des 136 stages, les variantes, le clavier et la manette simulée, le mobile, les échecs de chargement et les sauvegardes.

Le typage ignore désormais `tmp`, qui contient d'anciennes copies de fixtures et de scripts de test ; aucune de ces archives n'a été supprimée. Les sources du jeu et les tests restent contrôlés. Le lint garde l'avertissement existant de `ClanChroniclePanel.tsx`.

## Limites et suite

Ce lot ne complète aucun moveset. La gauche d'Ahab, la marche, les attaques, blessures, saisies et finishers propres à ses variantes restent à dessiner et à contrôler. Les autres apparences fournies restent statiques tant que leurs propres atlas ne sont pas validés. Les profils spécifiques des 177 nouvelles entrées, leurs parcours narratifs et les autres chantiers Homeworld restent distincts de cette livraison.

Les manettes et le mobile sont testés par émulation navigateur, pas certifiés sur appareils physiques. Aucun nouvel exécutable Windows n'est livré ici. La publication effective est enregistrée séparément après vérification du commit Vercel et des fichiers publics.
