# V34 — véhicules documentés et modularité

Cette passe utilise la génération OpenAI intégrée. Les PNG générés sont conservés octet pour octet dans `art-source/v34/vehicles/` et leur copie de revue dans `public/game/vehicles/v34/`. Les prompts, fichiers d’origine, empreintes, références et limites sont dans chaque `provenance.json`. Aucun nouveau véhicule n’est déclaré conduisible, aucune séquence véhicule n’est acceptée dans le moteur.

## Références réellement inspectées

- **Moto antigrav de clan** : partie V10, datée 01/05/24, de `Badlands_16_2400.jpg` sur le [portfolio de Mat Hunkin](https://www.mathunkin.com/). La variante V8 voisine n’est pas fusionnée avec elle. Le pilote et le guidon confirment que le petit bloc avant est à droite dans le premier dessin généré. La grande nacelle arrière, les plaques superposées, les nervures et les stabilisateurs sont repris. Le nom de classe « clan » reste celui du jeu. Côté caché et version finale du film non certifiés 1:1.
- **Éjection** : `Badlands_18_2400.jpg`, siège WIP 11 / contrôleur mis à jour le 22/04/24, même portfolio. La planche 20 représente d’autres éléments de vaisseau/console et ne sert pas à inventer une capsule. La source 18 montre le siège et le bras de commande, pas une coque sphérique fermée. Le catalogue conserve son intitulé demandé, mais seule cette production intérieure est revendiquée.
- **Blade Fighter Viper** : trois photos et une planche de conception ont été consultées depuis l’[article du fabricant NECA](https://store.necaonline.com/blogs/behind-the-scenes/closer-look-predator-blade-fighter-vehicle-and-packaging). NECA [associe Viper au Blade Fighter](https://store.necaonline.com/blogs/behind-the-scenes/closer-look-viper-predator-action-figure-from-series-12) ; cela ne prouve pas un châssis exclusif nommé Viper dans le cinéma. La référence latérale principale est `Blade-Fighter3-1300x.jpg`. Les objets sous licence inspirent une adaptation du jeu, sans transformer les dimensions du jouet en dimensions diégétiques.
- **Bone Bison** : quatre reproductions attribuées à Jerad S. Marantz ont été inspectées dans cet [article secondaire](https://yautjaclan.com/news/official-predator-badlands-bone-bison-concept-art-gives-closer-look-at-genna-creature). La publication Instagram liée n’a pas pu être lue ; la page ArtStation présentait un contrôle d’accès qui n’a pas été contourné. La vue couleur de profil `1618284` sert de référence, à sa résolution limitée de 300 × 164. Les variantes noires ne sont pas mélangées. Le premier extrait provenant du compte social `predatormovie` n’est pas considéré comme une source officielle vérifiée et n’a pas servi à verrouiller l’anatomie.

Les reproductions de référence restent dans `work/v34/primary-reference-review/`, hors distribution du jeu. Les URLs, statuts HTTP et empreintes sont conservés dans les reçus privés correspondants. Les anciens chemins du portfolio devenus introuvables ne sont pas présentés comme des références inspectées à l’époque V33.

## Assets retenus pour la revue

| Entrée | Fichiers actuels | Limite explicite |
|---|---|---|
| Moto de clan | `concept-v10-identity-r1` | Deux présentations ; aucune animation de conduite |
| Éjection | `seat-wip11-identity-r1`, `seat-base-detached-r1`, `controller-arch-states-r1` | Siège et quatre poses du bras ; coque atmosphérique absente |
| Blade Fighter Viper | `neca2014-identity-r2`, `neca2014-chassis-r2`, `neca2014-blade-module-r1` | Coque et lames distinctes ; attache, arme et cockpit à animer |
| Bone Bison de guerre | `body-colour-concept-r1`, `war-saddle-module-r1`, `war-flank-guard-module-r1` | Corps à quatre appuis, selle et garde indépendantes ; pas de démarche validée |
| Kha’rha de guerre | Corps, casque, protection de cou et de flanc séparés | Alignement et déformations en mouvement non encore validés |

Les deux premières coques Viper `neca2014-identity-r1` et `neca2014-chassis-r1` restent archivées en `rejected`. Des objets orange et des formes ambiguës dans le cockpit pouvaient évoquer des morceaux du pilote. Les r2 les retirent, exposent un siège vide et conservent les attaches mécaniques. Les grandes lames restent complètes à l’intérieur des cellules.

Le Bone Bison conserve sa bosse haute, son cou très bas, sa grande corne courbe et quatre pieds lisibles dans les deux sens. Le dressage, la selle et la protection militaire sont des inventions du jeu : le concept ne les établit pas. L’assemblage et les collisions ne sont pas validés par l’existence de pièces indépendantes.

## Vérification technique et frontière de validation

Le script de consignation vérifie les dimensions, l’empreinte, la présence d’un alpha réel ou d’une clé magenta déclarée, puis mesure les silhouettes après le même détourage que le lecteur. Les images sources magenta restent volontairement intactes ; le lecteur les détoure à l’affichage. Les pages de présentation ne sont jamais comptées comme des animations finales. Une revue dans l’atelier ne vaut pas une intégration gameplay, ni une certification de fidélité 1:1.
