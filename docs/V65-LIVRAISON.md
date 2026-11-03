# V65 — cité visitable et six décors de The Pit

Ce lot réunit la refonte Homeworld V64 et six révisions visuelles statiques de The Pit. Les résultats de compilation, de tests et de publication sont consignés séparément dans `v65-release-gates.json`. Le présent inventaire ne constitue pas, seul, une preuve de publication.

## Cité 2.5D

La ville possède 14 quartiers, 19 bâtiments publics et 24 résidences visitables. Une projection orthographique commune règle le sol, les façades, les personnages, les portes et les accessoires. Les vaisseaux personnels restent en orbite ; une navette utilise un emplacement réservé hors des rues.

Les 43 intérieurs partagent des modules cohérents. Trois aménagements domestiques sont réutilisés pour les maisons. Dix images OpenAI natives apportent vingt dessins statiques, dont cinq familles de façades. Il ne s'agit pas de 43 kits graphiques uniques.

L'atlas accessible en jeu donne accès à un codex de 723 éléments : positions, dimensions, empreintes, seuils, panneaux et statut des références. Les données sont aussi exportées dans `HOMEWORLD-CODEX-V64.md` et `homeworld-element-codex-v64.json`.

## The Pit

Six scènes existantes sont remaniées :

- Balcon du Roi de la Chasse — ST064.
- Trône fracturé — ST072.
- Temple de la Double Lune — ST088.
- Porte de l'Audience — ST102.
- Salle du Porte-Cendres — ST120.
- Atrium des Médiateurs — ST127.

Douze nouvelles images natives composent trente dessins statiques : six fonds et vingt-quatre modules indépendants. Les plans de profondeur, les recadrages et les sols sont vérifiés avec la caméra de combat. Les fichiers précédents restent conservés. Aucun nouveau stage ni aucune animation de stage ne sont comptés dans ce lot.

## Compatibilité des sauvegardes

Les anciennes annexes de vaisseau dont les apparences ne contiennent pas encore `headStyleId` reçoivent uniquement la valeur historique `reference`. Les champs invalides, versions futures et autres données corrompues restent refusés. Les essais utilisent des copies isolées ; ils ne modifient pas les sauvegardes réelles du joueur.

## Fidélité et limites

Les références visuelles officielles et les travaux publiés par les artistes sont documentés dans le codex et les rapports de provenance. La cité et ces six lieux restent des créations originales du jeu : aucune fidélité canonique globale 1:1 n'est revendiquée.

L'audit rapproche 174 dossiers du classeur de 170 cibles et de 187 kits présents dans le moteur. Aucun dossier n'est sans kit associé, mais cela ne prouve pas que ses graphismes, animations et demandes narratives sont tous terminés. Les animations de stage ne font pas partie de la présente demande. Les autres combattants, régions et actes narratifs encore à produire ne sont pas déclarés achevés par cette livraison.
