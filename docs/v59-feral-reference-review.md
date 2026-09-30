# V59 — Feral : contrôle des références et contraintes d'animation

Revue du 30 septembre 2026, avant intégration des nouvelles plaquettes. Le classeur original reste intact ; les cellules sont consultées dans `docs/v56-excel-priorities.json` (SHA source `32f2ee8e4fd801e7ca677a54862f2bd0123a2e78d12c015f64b50ab28184c380`). Ce document distingue la référence de l'adaptation de combat et ne certifie pas Feral 1:1.

## Sources effectivement contrôlées

| Source primaire ou fabricant licencié | Preuve et limite |
| --- | --- |
| [Prey — notes de production officielles, p. 4](https://lumiere-a.akamaihd.net/v1/documents/prey_final_production_notes_bios_59_82be4e25.pdf) | La production distingue visée laser et carreaux du canon plasma, puis énumère séparément filet explosif, cut clamp et bouclier. Le masque d'os appartient au choix de conception. Aucun timing de duel, rayon de garde ou inventaire de jeu n'en découle. |
| [NECA — Ultimate Feral Predator](https://store.necaonline.com/products/prey-7-action-figure-ultimate-feral-predator) | Accessoires nommés : masque, lanceur, lances et boucliers ouverts/repliés. Photos catalogue et forêt contrôlées dans `work-local/v58/references/Feral_Neca_1.jpg` et `Feral_Neca_2.jpg`. |
| [NECA — galerie de mai 2023](https://necaonline.com/2023/05/prey-7-scale-action-figure-ultimate-feral-predator/) | HTML officiel accessible par requête directe ; l'outil Web a reçu 403. Liens d'images pris dans ce HTML, sans inventer leur adresse. Les photos portent une réserve d'approbation du concédant. |
| [Hot Toys Japan — Feral, TM#114](https://www.hottoys.jp/item/view/4582578321979.php) | Le texte attribue explicitement les lames au gantelet droit et le bouclier au gauche ; le lanceur peut être fixé au dos de la figurine. Les photographies sont celles d'un produit, pas des photogrammes du film. |

Les références restent dans `work-local`, dossier ignoré ; elles ne sont pas destinées à devenir des textures publiées. Aucune photo n'a été recadrée, recolorée ou retournée.

## Géométrie observée, sans surinterprétation

Le catalogue NECA montre un bouclier complet radial, gris gravé, à périphérie cuivrée et segments distincts. Sa forme projetée peut être ovale ; ce n'est pas le petit demi-éventail bronze de V34. Les lames sont deux pièces allongées courbes.

Le lanceur est visible dans [la vue 8](https://eadn-wc04-13179453.nxedge.io/wp-content/uploads/2023/05/51725_UNP_8-scaled.jpg) et [la vue 9](https://eadn-wc04-13179453.nxedge.io/wp-content/uploads/2023/05/51725_UNP_9-scaled.jpg), téléchargées intactes sous `work-local/v59/references/Feral_NECA_8.jpg` et `Feral_NECA_9.jpg`. Il est tenu par la **main gauche anatomique**, bouclier replié. Il possède trois longs éléments parallèles, une poignée allongée dans l'axe, un moyeu rond et deux branches latérales plus courtes. Ne pas dessiner une crosse de fusil ni un pistolet humain. Cette prise ne documente pas à elle seule une cadence, un recul ou une animation complète de tir.

La [vue Hot Toys 17](https://www.hottoys.jp/catalog/swfdata/ht5109/imgview_image/up_17.jpg), conservée dans `Feral_HT_17.jpg`, documente surtout les **lames**, pas le lanceur. La [vue 7](https://www.hottoys.jp/catalog/swfdata/ht5109/imgview_image/up_7.jpg) montre le bouclier gauche et une arme de mêlée tenue à droite. Ne pas confondre ces silhouettes. Le catalogue Hot Toys 22 est aussi conservé pour les accessoires ; sa petite vignette ne suffit pas à certifier le projectile isolé.

Les côtés ci-dessus sont ceux du personnage, indépendamment du côté de l'écran. Une vue gauche native doit conserver les mêmes membres équipés ; un miroir global ne remplit pas ce contrat.

## Ce que le classeur demande réellement

| Cellules | Conséquence pour ce lot |
| --- | --- |
| `02_PERSONNAGES!J10/S10/T10` | Préserver lance scindée, bouclier, lance-carreaux et anatomie Feral ; aucun canon d'épaule classique. La cellule T10 interdit précisément de prétendre à une fidélité 1:1 déjà certifiée. |
| `05_MOVES_PROPOSES!P10` | Corps de tir dédié et trois carreaux séparés. Acquisition au départ et tir direct démasqué sont la proposition The Pit ; les valeurs 23/6/30, 115 et 30 % ne sont pas des faits du film ni automatiquement les valeurs actuelles. |
| `05_MOVES_PROPOSES!Q10` | Déploiement segmenté, garde directionnelle et coup de bord constituent un spécial distinct. Une plaquette montrant un bouclier déjà ouvert ne livre pas tout ce spécial. |
| `05_MOVES_PROPOSES!R10/S10` | Séparation de la lance et mine conditionnelle restent des demandes distinctes. Ne pas compter une nouvelle animation de tir comme leur livraison. |
| `05_MOVES_PROPOSES!U10`, `14_VARIANTES!F10/H10` | Sortie/rangement lisibles, pas de duplication d'arme, deux orientations natives. Une arme perdue ne doit pas revenir par simple changement de dessin. |

## Écarts constatés dans l'art existant

Inspection directe de `public/game/sprites/v34/pit/feral-hunter/feral-hunter-heavy-v34.png` et `feral-hunter-idle-v34.png` :

- Le heavy projette les **lames droites** vers l'avant, alors que le bouclier est tenu devant le corps. Son nom « Charge au bouclier » ne décrit pas ce geste.
- Le bouclier est petit et partiel. L'agrandir par transformation Canvas ne restituerait ni sa géométrie ni un coup de bord.
- Le masque, le torse très musclé, les cuisses et la ceinture sont une interprétation stylisée. Les reprendre comme référence de style assure une continuité V34, pas une certification anatomique avec Prey.
- Le neutre n'expose pas le lanceur. Il faut vérifier une sortie et un retour cohérents ou annoncer cette transition comme encore manquante ; aucune arme ne doit simplement apparaître au moment où une entité de tir est créée.
- Un clip corrigé seulement pour le costume par défaut ne qualifie pas les variantes démasquées, sang d'ours ou camouflage. Conserver leurs apparences et ne pas leur imposer un masque pendant l'attaque.

## Contraintes d'acceptation

1. Contrôler chaque dessin : deux bras, deux jambes, pieds entiers, prises lisibles, deux lames droites, bouclier gauche, lanceur cohérent avec la prise documentée. Ne pas transformer le bras porteur entre poses ou entre orientations.
2. Pour le heavy, faire conduire le geste par le bouclier ; les lames ne doivent plus être l'extrémité de frappe dominante. Montrer anticipation, contact, récupération, sans annoncer un mécanisme de déploiement absent des dessins.
3. Pour le tir, distinguer préparation, visée, lancement et reprise. Ne pas peindre une seconde salve dans le corps : les trois projectiles sont déjà des entités du moteur. Pas de plasma, bouche de canon d'épaule, glow ou recul prétendument canonique.
4. Mesurer séparément cadres et pivots. Une répartition visuelle 2×2 ne garantit pas des rectangles égaux ; aucune lame, pied ou bord de bouclier ne doit être coupé par les limites d'une cellule.
5. Tester le passage neutre → action → neutre des deux côtés, la pause et le costume exclu. Une planche propre ne prouve pas la continuité en jeu.

Première revue indépendante de la génération `exec-0551896d-eb98-43fc-bf76-6b622ce7ac93.png` : quatre poses orientées à droite, frappe effective du bouclier en troisième pose, armes du bon côté, pas de membre surnuméraire évident et pieds complets. Le bouclier est déjà ouvert dans les quatre dessins. La troisième pose dépasse la séparation verticale médiane : ses coordonnées doivent être mesurées, pas déduites d'une grille uniforme. Les pixels bruns des interstices échantillonnés ont un alpha nul ; ils ne constituent pas un fond opaque. Cette revue d'une image brute ne confirme pas son intégration finale.

La première proposition gauche `exec-03fcdec0-3aac-4dc5-a344-169dcd15a322.png` est **rejetée** : le torse frontal reproduit une inversion apparente des bras équipés. La pose place le bouclier sur le bras droit anatomique et les lames sur le gauche. Une correction en vue de dos trois quarts, face tournée à gauche, doit montrer le bras droit aux lames au premier plan et le bras gauche porteur du bouclier au-delà du buste. Une génération distincte n'est donc pas automatiquement une orientation anatomiquement valide.

La correction gauche `exec-4338f53d-1de1-44e9-b140-b8ada4031cd9.png` est **acceptée pour l'étape d'intégration**, comme interprétation stylisée de dos trois quarts. Le bouclier reste sur le bras gauche, les lames sur le droit ; aucun membre surnuméraire ni pied coupé n'est visible. La troisième pose conduit bien avec le bouclier. Le dessin dorsal reste stylisé, sans validation de surface anatomique ou de géométrie film exacte. Les poses sont à vérifier dans leur enchaînement avec le neutre existant, qui n'emploie pas ce nouvel angle de vue.

Le lanceur droit `exec-3a097640-f800-4af9-8122-661982a41c07.png` est **accepté pour l'étape d'intégration** : quatre poses, arme tenue par la main gauche anatomique, silhouette à trois rails, moyeu et branches cohérente avec les vues NECA 8/9. Les prises restent lisibles, sans crosse humaine, plasma ou duplication de salve dessinée. Les lames sont rétractées. En revanche, la première pose tient déjà le lanceur et la dernière le conserve abaissé : il manque encore la sortie et le rangement nécessaires à une transition complète depuis le neutre V34. La rétraction des lames n'est pas montrée non plus. Ces quatre poses ne remplissent donc pas `05_MOVES_PROPOSES!U10`. La troisième pose déborde elle aussi une cellule uniforme de demi-largeur.

Le lanceur gauche `exec-31a33730-ff1a-4e1c-8eba-4ee65dc3aabc.png` est **accepté pour la même étape limitée d'intégration** : quatre poses de dos trois quarts, main gauche porteuse du lanceur, trois rails lisibles et lames rétractées. Aucun échange manifeste de bras équipés ni membre surnuméraire n'est relevé. Les mêmes réserves de sortie, rangement, rétraction et retour au neutre restent ouvertes ; la pose finale conserve l'arme en main.

Contrôle supplémentaire du costume dorsal : [la vue NECA 10](https://eadn-wc04-13179453.nxedge.io/wp-content/uploads/2023/05/51725_UNP_10-scaled.jpg), conservée intacte dans `work-local/v59/references/Feral_NECA_10.jpg`, montre un pagne arrière segmenté, avec panneaux gris et bande médiane sombre, ainsi qu'un sac dorsal. Une plaque arrière n'est donc pas à rejeter par principe. Les deux nouvelles vues gauches emploient toutefois une plaque centrale et une silhouette simplifiées issues de V34, sans le sac : leur habillage dorsal n'est pas une restitution exacte de cette référence. Ce défaut de fidélité reste explicitement ouvert même si l'action et la latéralité sont acceptées.

« Acceptée pour intégration » signifie que les défauts manifestes recherchés n'ont pas été observés dans les pixels inspectés ; cela ne remplace ni le contrôle des rectangles/pivots ni la recette navigateur des deux côtés. Aucun de ces états ne vaut certification 1:1.

Restent non certifiés : dessin détaillé du carreau, silhouette film exacte du masque/corps, transitions d'équipement, déploiement mécanique complet du bouclier, totalité des variantes et totalité des dix-huit actions demandées. Les photographies de figurines donnent une référence utile, pas une garantie générale 1:1.
