# Revue visuelle croisée — marché, montures et chenils

**Date :** 3 novembre 2026. **Périmètre :** 17 PNG sélectionnés sous `production/homeworld-sectors-20261103/`.

**Résultat : 17 candidats graphiques livrables avec les réserves ci-dessous. Aucune coupe matérielle de silhouette n’a été observée.** Cette revue n’est ni une validation artistique humaine, ni une admission au runtime, ni une certification de fidélité canonique 1:1.

Le relecteur a généré les six sprites de montures ; les onze sprites marché/chenils viennent des autres agents. Il s’agit d’une seconde lecture transversale, avec cette limite d’indépendance explicitement déclarée.

## Méthode et preuve

Les 17 fichiers ont été ouverts individuellement avec `view_image`. Les dimensions, le canal alpha, les bornes des pixels alpha > 0 et alpha > 24, les marges et les empreintes SHA-256 ont été lus sans modification. Les empreintes correspondent exactement aux fichiers déplacés depuis le dossier de travail précédent. Les valeurs détaillées sont dans [review-independent.json](review-independent.json).

Une vérification CSS sur fonds blanc et sombre a été tentée avec Playwright ; elle n’a pas pu démarrer, car le binaire Chromium manque. Aucun résultat navigateur n’est revendiqué. Le second affichage direct de M06 montre correctement le poste de soin ; le problème sombre initial n’a pas été reproduit.

## Cohérence générale

- Palette commune : basalte sombre, bronze vieilli, métal gris-noir, textile rouge rouille et petits accents ambre.
- Aucun texte humain lisible, aucune planche de variantes et aucun paysage extérieur incorporé observés. Chaque fichier est un objet ou un assemblage fonctionnel autonome.
- Bâtiments complets avec profondeur et ouvertures lisibles. Aucun effet évident de bâtiment écrasé en miniature. Les dimensions proposées en mètres restent à calibrer avec les acteurs et animaux en scène.
- Vue plongeante frontale cohérente dans l’ensemble ; la rampe M03 utilise une orientation oblique. L’angle exact de 35° et une projection orthographique rigoureuse ne sont pas établis par cette revue.
- Tous les bâtiments et aménagements de ce lot restent des **adaptations originales du projet** ; les sources ne permettent pas d’en certifier des plans canoniques.

## Points concrets à conserver dans le suivi

1. **K02 est un portique ouvert.** Aucun battant fermé n’est dessiné. Le passage comporte seulement 12 px de marge latérale, mais ses extrémités restent entières. Le **battant indépendant K06 est maintenant fourni**. Les deux pièces sont composables en principe ; leur alignement et l’état fermé en scène ne sont pas prouvés. Un sas à deux portes reste un travail distinct.
2. **K03 est un râtelier équipé.** Trois laisses et deux leurres sont incorporés dans le même raster. Ils ne constituent pas cinq sprites détachables supplémentaires.
3. **M03 a une orientation native oblique.** Il faut l’enregistrer lors du placement. La continuité de la rampe est lisible, mais pente numérique, pivot et collisions restent non vérifiés.
4. **M06 est un poste de soins ciblés**, avec support de membre et rangement ; il ne représente pas une table portant une monture entière.
5. Plusieurs marges visibles sont inférieures aux 80–100 px demandés, sans coupe du sujet. Le tableau fournit les valeurs réelles ; aucun padding correctif n’a été utilisé.

## Alpha : deux lectures distinctes

Les 17 images disposent de vrais pixels alpha 0. Dans les 16 fichiers initiaux, un bruit très faible atteint les bords avec une valeur maximale de 1/255 ; les bords du nouveau K06 sont alpha 0. Il empêche de déclarer des marges strictement vides partout, mais ne doit pas être confondu avec une coupe. Les marges de la silhouette visible ci-dessous sont calculées à **alpha > 24**, et ne prétendent pas que les pixels moins opaques ont été supprimés.

| ID | Marges alpha > 24 (gauche / haut / droite / bas) | Observation |
| --- | --- | --- |
| HWM162-K01 | 76 / 154 / 76 / 176 px | Réserve de cadrage, sujet entier |
| HWM162-K02 | 12 / 138 / 12 / 133 px | Réserve de cadrage, sujet entier |
| HWM162-K03 | 61 / 111 / 61 / 46 px | Réserve de cadrage, sujet entier |
| HWM162-K04 | 185 / 172 / 182 / 160 px | Marges ≥ 80 px, sujet entier |
| HWM162-K05 | 103 / 219 / 102 / 198 px | Marges ≥ 80 px, sujet entier |
| HWM162-S01 | 201 / 120 / 200 / 89 px | Marges ≥ 80 px, sujet entier |
| HWM162-S02 | 161 / 148 / 160 / 148 px | Marges ≥ 80 px, sujet entier |
| HWM162-S03 | 42 / 81 / 43 / 80 px | Réserve de cadrage, sujet entier |
| HWM162-S04 | 42 / 40 / 39 / 78 px | Réserve de cadrage, sujet entier |
| HWM162-S05 | 36 / 77 / 36 / 88 px | Réserve de cadrage, sujet entier |
| HWM162-M01 | 97 / 159 / 97 / 175 px | Marges ≥ 80 px, sujet entier |
| HWM162-M02 | 246 / 51 / 245 / 80 px | Réserve de cadrage, sujet entier |
| HWM162-M03 | 66 / 204 / 71 / 179 px | Réserve de cadrage, sujet entier |
| HWM162-M04 | 158 / 238 / 157 / 184 px | Marges ≥ 80 px, sujet entier |
| HWM162-M05 | 169 / 303 / 169 / 286 px | Marges ≥ 80 px, sujet entier |
| HWM162-M06 | 293 / 245 / 324 / 209 px | Marges ≥ 80 px, sujet entier |
| HWM162-K06 | 401 / 338 / 401 / 210 px | Marges ≥ 80 px, battant entier |

## Lecture par objet

### HWM162-K01

Bâtiment des chenils complet, trois grandes baies ombragées, ventilation et sols avec drains intégrés. Aucun animal fusionné au bâtiment.

Réserves : Marges latérales de 76 px, aucune coupe.

À l’intégration : Les baies ouvertes ne ferment pas les meutes : associer les états de portail ou barrières adéquats lors de l’intégration.

### HWM162-K02

Portique de transfert OUVERT avec seuil, glissières et courts retours latéraux. Aucun battant fermé n’est visible.

Réserves : Marges latérales étroites : 12 px ; silhouette néanmoins entière.

À l’intégration : Nommer explicitement l’état ouvert. Le battant K06 est maintenant fourni séparément ; la superposition, les états fermé/ouvert, l’animation et un sas à deux portes restent à vérifier/implémenter.

### HWM162-K03

Un râtelier assemblé portant trois laisses enroulées et deux leurres tressés, tous suspendus au même meuble. Pieds entiers, aucune créature.

Réserves : Marges de 61 px sur les côtés et 46 px en bas. Les cinq accessoires sont incorporés au raster : ils ne sont pas manipulables comme cinq sprites distincts.

À l’intégration : Compter ce fichier comme un seul râtelier équipé ; ne pas le comptabiliser comme six objets indépendants.

### HWM162-K04

Plateforme d’observation complète, escalier continu à droite, arrivée de l’escalier ouverte et garde-corps sur les autres côtés. Tous les pieds lisibles.

À l’intégration : Caler hauteur des marches et garde-corps sur l’acteur lors de l’intégration.

### HWM162-K05

Bassin de repos sec, rebord entier, entrée basse large et drain latéral. Surface de repos contenue dans l’objet, sans terrain extérieur fusionné.

À l’intégration : Adapter l’encastrement au terrain ; ce sprite seul ne prouve pas la profondeur physique de la fosse.

### HWM162-S01

Halle complète, trois travées vides, piliers et bases entiers, passages lisibles. Les quatre ailerons de toiture restent contenus dans la silhouette.

À l’intégration : Adapter l’échelle de placement aux dégagements de passage ; les 18 × 10 × 8 m proposés restent des dimensions de conception.

### HWM162-S02

Un étal long assemblé, trois travées de comptoir vides, auvent textile et poteaux entiers. Le vide derrière le comptoir permet de comprendre le service.

À l’intégration : Préserver le dégagement marchand derrière le comptoir lors du placement.

### HWM162-S03

Présentoir vide à trois gradins, six supports suspendus intégrés et emblème décoratif unique. Aucune marchandise indépendante fusionnée.

Réserves : Marges latérales de 42/43 px, silhouette entière.

À l’intégration : Ne pas compter les crochets ou l’emblème comme sprites indépendants supplémentaires.

### HWM162-S04

Estrade de présentation vide, escalier large continu, trois supports de trophée vides. Aucun trophée vendu ou personnage inclus.

Réserves : Marges minimales de 39 px ; aucune coupe observée.

À l’intégration : Le gabarit arrière et la circulation sur le palier doivent être vérifiés au placement.

### HWM162-S05

Abri ouvert complet, étagères intégrées vides et aire centrale libre. Aspect de réserve bâtie, sans accessoires de décor éparpillés.

Réserves : Marges latérales de 36 px, silhouette entière.

À l’intégration : L’image représente un abri ouvert ; une fermeture fonctionnelle n’est pas fournie.

### HWM162-M01

Écurie complète à trois baies, salle centrale plus haute, seuils et fondations entiers. Les baies et la profondeur restent lisibles ; aucun aspect de bâtiment écrasé en miniature.

À l’intégration : Caler le seuil et les ouvertures sur la monture réelle ; hauteur d’entrée de 5 m demandée mais non mesurable de façon certifiée depuis ce raster.

### HWM162-M02

Borne autonome entière, anneau et courte chaîne captifs, pied large. Fonction d’attache claire.

Réserves : Marge haute de 51 px, aucune coupe.

À l’intégration : La chaîne est dessinée attachée à la borne ; aucun état d’attache à un animal n’est fourni.

### HWM162-M03

Plateforme sur pieds entiers avec rampe longue continue et côté de monte ouvert. Orientation oblique volontaire permettant de lire la rampe.

Réserves : Marges latérales de 66/71 px, aucune coupe. Orientation oblique différente des façades frontales ; documenter l’orientation native au placement.

À l’intégration : La pente apparaît praticable visuellement, mais sa pente numérique et les collisions ne sont pas validées.

### HWM162-M04

Segment de clôture ouvert, deux poteaux reliés, trois traverses et renfort bas, aucune cage complète. Extrémités émoussées cohérentes avec un enclos.

À l’intégration : Raccords entre segments à définir à l’intégration ; ne pas affirmer que la texture est répétable sans raccord.

### HWM162-M05

Obstacle unique à hauteur réglable, traverse protégée dans deux appuis, pieds complets. Fonction d’entraînement distincte de la barrière.

À l’intégration : Un seul réglage/état est rendu ; ce sprite ne constitue pas une animation de hauteur.

### HWM162-M06

Poste unique avec bassin, support rembourré, tiroirs et bras attaché. Matériaux et contours lisibles au second affichage view_image ; l’apparence noire initiale n’a pas été reproduite.

À l’intégration : Le support sert aux soins ciblés et au matériel ; ne pas le présenter comme une table portant une monture entière. Contrôle CSS sur fond blanc non effectué : Chromium absent dans cet environnement.

### HWM162-K06

Un battant rectangulaire indépendant à mailles diagonales, sans pylône ou linteau dupliqué. Cadre entier, très bonnes marges visibles, palette identique à K02. Composition avec K02 envisageable ; état fermé en scène non prouvé.

Réserve : La transparence existe dans le maillage, mais la propreté de chaque ouverture n’est pas certifiée.

À l’intégration : Conserver K02 comme portique ouvert et K06 comme battant distinct. Vérifier superposition, pivot, translation et états ouvert/fermé dans la scène avant toute admission runtime.

## Limite de livraison

La présente revue confirme la présence et la lisibilité des images sélectionnées. Elle ne confirme pas une interaction, un chemin praticable, une collision, un chargement en scène, une hauteur physique ni une conformité 1:1 à une œuvre. Les originaux et leurs identifiants sont conservés ; aucun PNG n’a été modifié pendant la revue.
