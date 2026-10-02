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

Trois atlas OpenAI transparents sont intégrés sans modifier leurs pixels. Six façades et14 rôles civiques sont découpés par cellules natives. Les12 PNJ nommés ont12 costumes distincts, dont un chef original à112u de hauteur, avec robe et mantelet cérémoniel. Les habitants existants gardent leurs itinéraires et reçoivent des tenues correspondant à leurs fonctions.

Le jeune du Homeworld après l’ellipse est **Unblooded**, pas le Youngling enfant du duel. Il utilise les deux véritables dessins de marche V48 par orientation, avec pivots de pieds et atlas gauche/droite natifs1122×1402. La pause fige la même horloge. Ce cycle est un cycle àdeux dessins par face, pas une animation complète àhuit directions. Les PNJ civiques utilisent des portraits habillés sur leurs routes existantes ; leur jeu complet de marche n’est pas produit dans ce lot.

## Sources conservées et contrôles

Les PNG utilisés sont `civic-identity-atlas.png`, `civilian-roles-atlas.png` et `civic-specialists-spaced-atlas.png` sous `public/game/homeworld/v72`. Le premier atlas de spécialistes, qui manquait de gouttières de séparation, est conservé sous `work-local/v72/civic-specialists-original-diagnostic.png` ; il n’est pas utilisé ni publié. Aucun ancien asset du jeu n’est supprimé ou remplacé.

Le script `measure-homeworld-identity-v72.mjs` ne transforme pas les images : il mesure alpha, fenêtres, pivots et SHA256. La mesure du bord de fondation inclut son léger dépassement devant le seuil ; la géométrie logique reprend ce retrait. Les tests couvrent l’alpha réel, les octets sources, les12 identités, l’uniformité des six façades, l’accès physique aux43 portes, les trois zones par aile, les collisions des30 meubles et les deux dessins de marche réellement différents. La recette navigateur `verify-homeworld-identity-v72.mjs` visite les six ailes avec de vraies touches et vérifie le chef, la pause, le codex et la caméra mobile.
