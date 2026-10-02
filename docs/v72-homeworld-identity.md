# Homeworld V72 — identité, fonctions et circulation

La cité et ses institutions sont une adaptation originale du projet. Les vêtements civiques et le chef cérémoniel ne sont pas des portraits canoniques prétendus 1:1. Le chef représente cette cité, pas une monarchie universelle des Yautja.

## Références et choix concrets

- [RPG Maker officiel — Mapping: Towns](https://www.rpgmakerweb.com/blog/mapping-towns) : partir de la fonction économique du lieu, donner des repères aux bâtiments importants et relier leurs seuils aux circulations. Les six façades principales ont donc des silhouettes dédiées : citadelle, dojo, archive, forge, maison des soins, marché.
- [RPG Maker officiel — Mapping: Interior](https://rpgmakerweb.com/blog/tutorial-mapping-interior) : dimensions intérieures compatibles avec l’enveloppe, fonctions séparées, mobilier réellement posé et passages lisibles. Les six ailes publiques ont trois zones reliées à pied par deux passages de112u, des partitions physiques et des empreintes de mobilier mesurées.
- [Square Enix — HD-2D](https://www.jp.square-enix.com/octopathtraveler/about/) : référence de lecture des silhouettes 2D dans un environnement en profondeur. Le projet conserve sa propre projection orthographique à35°, sans revendiquer le moteur ou les assets d’Octopath.

Ces références concernent la conception des niveaux, pas le lore yautja. Aucun plan officiel ou vêtement civil canonique précis n’est attribué aux créations générées.

## Architecture et intérieurs

Les x/y des seuils des43 bâtiments restent identiques. Quatre volumes publics gagnent de la profondeur : marché400u, soins460u, mémoire480u et citadelle520u. Le dojo reste360u et la forge340u : agrandir davantage bloquait les approches des maisons voisines. Les dimensions utiles retirent32u pour les murs ; les43 accès et les15 points intérieurs existants restent accessibles.

Chaque aile principale comporte un vestibule et deux pièces fonctionnelles, quatre segments de paroi en coupe, deux passages de112u et cinq nouveaux objets natifs distincts. Les30 objets V72 ont la même empreinte au rendu, au codex et à la collision. Le siège du chef, le gong d’entraînement, les établis, les registres, les couches de soins et les supports de parures se lisent comme des lieux différents. Les18 zones,24 parois et30 objets ajoutent72 fiches liées au bâtiment réel.

Les appartements privés et étages de la citadelle ne sont pas simulés. Les37 autres intérieurs conservent leurs plans précédents ; ce lot ne doit pas être annoncé comme une refonte achevée de toutes les maisons.

## Population et jeune jouable

Trois atlas OpenAI transparents sont intégrés sans modifier leurs pixels. Six façades et 14 rôles civiques sont découpés par cellules natives. Les 12 PNJ nommés ont 12 costumes distincts, dont un chef original à 112u de hauteur, avec robe et mantelet cérémoniel. Les 98 habitants reçoivent des tenues correspondant à leurs fonctions. Quatre itinéraires sont déplacés localement, dans leur quartier d’origine, pour éviter le nouveau volume de la citadelle, le mobilier de la côte et un pilier des Cendres. Leurs identités, vitesses, activités et phases restent inchangées. L’occlusion utilise les limites alpha réellement peintes, pas les marges transparentes des atlas.

Le jeune du Homeworld après l’ellipse est **Unblooded**, pas le Youngling enfant du duel. Il utilise les deux véritables dessins de marche V48 par orientation, avec pivots de pieds et atlas gauche/droite natifs 1122×1402. La pause fige la même horloge. Ce cycle est un cycle à deux dessins par face, pas une animation complète à huit directions. Les PNJ civiques utilisent des portraits habillés sur leurs routes existantes ; leur jeu complet de marche n’est pas produit dans ce lot. Leurs étiquettes suivent la hauteur native : celle du chef reste au-dessus de son visage, y compris lorsqu’on s’en approche.

## Sources conservées et contrôles

Les PNG utilisés sont `civic-identity-atlas.png`, `civilian-roles-atlas.png` et `civic-specialists-spaced-atlas.png` sous `public/game/homeworld/v72`. Le premier atlas de spécialistes, qui manquait de gouttières de séparation, est conservé sous `work-local/v72/civic-specialists-original-diagnostic.png` ; il n’est pas utilisé ni publié. Aucun ancien asset du jeu n’est supprimé ou remplacé.

Le script `measure-homeworld-identity-v72.mjs` ne transforme pas les images : il mesure alpha, fenêtres, pivots et SHA256. La mesure du bord de fondation inclut son léger dépassement devant le seuil ; la géométrie logique reprend ce retrait. Les tests couvrent l’alpha réel, les octets sources, les12 identités, l’uniformité des six façades, l’accès physique aux43 portes, les trois zones par aile, les collisions des30 meubles et les deux dessins de marche réellement différents. La recette navigateur `verify-homeworld-identity-v72.mjs` visite les six ailes avec de vraies touches et vérifie le chef, la pause, le codex et la caméra mobile.

La recette locale finale V73, sur le build du 2 octobre 2026 à 03:48:39 UTC, passe 15 contrôles et produit 24 captures. Elle visite les six façades et les 18 zones au clavier, sans téléportation, puis vérifie les deux dessins natifs, le visage du chef dégagé, la pause et le codex sans mutation de sauvegarde, la caméra en 393×852 et les trois PNG servis avec leurs SHA conservés. Zéro erreur JavaScript ou HTTP. Voir `v72-homeworld-identity-browser-qa.json` pour les preuves et limites ; la publication reste une étape distincte.
