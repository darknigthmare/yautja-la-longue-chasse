# Références de côtes et de mondes fictifs — V97

Recherche effectuée le 18 octobre 2026 pour remplacer les silhouettes en
bandes, colonnes et plaques répétées de l'atlas V96. Les huit références
ci-dessous ont été réellement consultées par HTTP sur GitHub ou
`raw.githubusercontent.com`, avec leurs révisions et licences. Les données
GeoJSON ont été téléchargées et décodées ; les générateurs distants n'ont
pas été installés ni exécutés.

## Huit références vérifiées

### 1. Natural Earth : terres et côtes au 1:110 millions

[Terres GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_110m_land.geojson)
et [lignes de côte](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_110m_coastline.geojson).
Les fichiers contiennent respectivement 127 et 134 entités. Ils fournissent
des masses continentales, des grandes baies et des îles de tailles inégales,
avec une complexité adaptée à une vue planétaire.

Le [README de Natural Earth](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/README.md)
déclare les données dans le domaine public et utilisables dans tout type de
projet. Attribution de provenance conseillée : **Natural Earth, maintenu par
Nathaniel V. Kelso et Tom Patterson, avec le soutien de NACIS**.

### 2. Natural Earth : terres au 1:50 millions

[Terres GeoJSON 50m](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_50m_land.geojson),
1 420 entités, même provenance et domaine public. Cette résolution conserve
davantage de petites îles, d'indentations et de côtes ramifiées. Elle convient
aux références de fjords et aux archipels ; le 110m seul généralise fortement
ces détails. Simplifier ensuite les petits accidents selon le zoom du jeu.

### 3. Natural Earth : silhouettes de pays

[Pays GeoJSON 110m](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_110m_admin_0_countries.geojson),
177 entités, même provenance et domaine public. Exemples effectivement présents
et inspectés dans les données :

| Référence terrestre | Morphologie utile |
| --- | --- |
| Australie | Masse large, golfe profond au nord, grande baie au sud, île satellite. |
| Madagascar | Grande île allongée et asymétrique, caps effilés. |
| Italie et Grèce | Péninsules ramifiées, golfes, îles proches des pointes. |
| Canada | Grande baie intérieure ouverte et archipel au large d'une côte découpée. |
| Norvège et Chili | Longues façades côtières ; détail de fjords à rechercher au 50m. |
| Indonésie et Japon | Chapelets d'îles, grands éléments entourés d'îles intermédiaires. |
| Nouvelle-Zélande | Deux masses allongées voisines, détroit resserré et côtes différentes. |

Les frontières de pays ne sont pas toutes des côtes : Canada, Papouasie et
plusieurs autres silhouettes contiennent des segments politiques rectilignes.
Pour dessiner une vraie côte, partir des données **land/coastline**, puis
employer les pays comme études de forme. Les frontières et noms terrestres
ne deviennent pas des frontières ou noms yautja.

### 4. Azgaar — Fantasy Map Generator

[Présentation](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b4a0dcb933586a57242508f558f775da16c35c64/README.md)
et [licence](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b4a0dcb933586a57242508f558f775da16c35c64/LICENSE).
Application de cartes de fantasy éditables, destinée notamment aux auteurs
et maîtres de jeu. Référence pour distinguer forme des terres, relief,
découpage politique et rendu : le README sépare explicitement ces couches.
Une carte fictive peut conserver de grandes péninsules et des baies lisibles
sans découper chaque continent en six rectangles réguliers.

Licence MIT, copyright 2017–2024 Max Haniyeu / Azgaar. Le texte consulté
mentionne explicitement les cartes, captures et autres œuvres dérivées.
Conserver la notice MIT si du code ou une portion substantielle est repris.

### 5. Martin O'Leary — Generating fantasy maps / mewo2/terrain

[Présentation](https://github.com/mewo2/terrain/blob/a2511d6b673ae92f5983f3343365ba9326c03b63/README.md)
et [licence MIT](https://github.com/mewo2/terrain/blob/a2511d6b673ae92f5983f3343365ba9326c03b63/LICENSE.md).
Le dépôt atteste le générateur derrière **Uncharted Atlas** et renvoie à ses
notes de conception. Référence pour construire d'abord un territoire fictif
cohérent, puis lui donner des divisions et des noms, plutôt que de déformer
uniquement le bord d'une grille préexistante.

Attribution en cas de reprise de code : **Martin O'Leary, 2016**, notice MIT
incluse. Cette recherche utilise le projet comme référence méthodologique.

### 6. Amit Patel / Red Blob Games — Mapgen4

[README.org](https://github.com/redblobgames/mapgen4/blob/c1d8cb018a11a8b9e17d59233c36c176429d37eb/README.org)
et [licence Apache 2.0](https://github.com/redblobgames/mapgen4/blob/c1d8cb018a11a8b9e17d59233c36c176429d37eb/LICENSE).
Le README décrit un générateur de paysages dont le relief est éditable,
avec maillage, élévation, cours d'eau, biomes et rendu distincts. L'objectif
annoncé est une carte plaisante et rapide, pas une simulation géologique
exacte. Référence pour des formes variées dont la lisibilité reste maîtrisée.

Une éventuelle reprise de code doit conserver la licence et les notices
applicables ; le README énumère aussi les bibliothèques tierces et leurs
licences. Aucun de ces modules n'est copié par cette note.

### 7. Amit Patel / Red Blob Games — génération sur une sphère

[Présentation](https://github.com/redblobgames/1843-planet-generation/blob/7441e099a297333d7925554452005beeed285806/README.org),
[article source](https://github.com/redblobgames/1843-planet-generation/blob/7441e099a297333d7925554452005beeed285806/index.org)
et [licence Apache 2.0](https://github.com/redblobgames/1843-planet-generation/blob/7441e099a297333d7925554452005beeed285806/LICENSE).
Le texte décrit points sur sphère, régions de Voronoï, plaques, océans,
biomes et rivières. Il constate que des points trop régulièrement espacés
donnent une géographie monotone, puis explore des tailles de plaques et des
frontières plus irrégulières. Cette référence concerne directement des
planètes fictives complètes, avec continuité autour du globe.

L'auteur signale aussi les limites et défauts de son expérimentation :
reprendre le principe de variation et de continuité sphérique ne demande
pas de recopier son modèle tectonique comme preuve de réalisme.

### 8. davidson16807 — Tectonics.js

[Présentation](https://github.com/davidson16807/tectonics.js/blob/e43927ce88e766b63e35e896f36bfb882a4c8de4/README.md)
et [licence CC BY 4.0](https://github.com/davidson16807/tectonics.js/blob/e43927ce88e766b63e35e896f36bfb882a4c8de4/LICENSE.txt).
Le projet se présente comme un simulateur de planète 3D dans le navigateur.
Référence complémentaire pour raisonner à l'échelle d'un globe, avec des
masses terrestres qui restent cohérentes entre plusieurs angles de vue.
En cas de redistribution d'un élément dérivé, créditer l'auteur/dépôt,
indiquer la licence et signaler les modifications conformément à cette licence.

## Application recommandée à l'atlas

1. **Remplacer les quatre dispositions répétées par des silhouettes sources
   différentes.** Combiner masse large à grande baie, péninsule ramifiée,
   double lobe à isthme, croissant côtier, île effilée et archipel en arc.
   Varier l'orientation, l'échelle relative, les lobes et les ouvertures de
   baies ; une simple rotation d'un même contour ne suffit pas.
2. **Dessiner les côtes avant les territoires.** Les six régions politiques
   ne doivent pas imposer six rectangles ou six continents de même taille.
   Les subdivisions suivent la terre et partagent exactement leur bord ;
   les caps et les baies restent visibles dans l'union des territoires.
3. **Déformer avec plusieurs échelles.** Préserver d'abord une grande
   silhouette reconnaissable ; ajouter ensuite quelques péninsules, baies
   secondaires et îles proches. Éviter un simple bruit uniforme qui produit
   partout les mêmes petites dents sans changer la masse continentale.
4. **Conserver la densité demandée.** Rapprocher les masses par des détroits
   et ajouter des îles intermédiaires utiles aux liaisons. Le jeu ne doit pas
   réintroduire le vide Australie–Groenland ni de longues routes invisibles.
   Les continents peuvent avoir des tailles différentes tout en gardant un
   graphe praticable et un taux de terres suffisant.
5. **Séparer relief, milieu et contrôle.** Un littoral de fjords peut servir
   à un monde enneigé ; un archipel compact à une jungle ; une grande baie
   à une mer acide. Les couleurs extraterrestres changent les matières,
   tandis que les couleurs de faction continuent d'indiquer le vrai contrôle.
6. **Préserver les identités et sauvegardes.** Les 30 identifiants de monde,
   les 36 identifiants de territoire par monde et les archives restent
   stables. Korthas conserve les règles de son graphe historique ; tout
   changement de routes des autres mondes doit tenir compte des ordres déjà
   sauvegardés, plutôt que les invalider silencieusement.

Contrôles utiles : polygones simples sans chevauchements, frontières communes
identiques, territoire toujours atteignable au clavier, continents réellement
différents après normalisation de l'échelle et de l'orientation, détroits
courts, graphe connecté, et vérification visuelle de globes tournés ainsi que
du planisphère. La carte doit rester correcte près de l'horizon et de la
coupure de longitude ; les îles décoratives ne doivent pas simuler de faux
territoires contrôlés.

## Portée et traces reproductibles

Ces cartes de fantasy et simulations produisent des mondes fictifs ; elles
n'attestent aucun lieu canonique Yautja. Les nouveaux contours du jeu restent
des créations ou adaptations du projet. Cette note documente la recherche,
pas l'intégration d'images ou de code de ces générateurs.

Une banque d'étude de douze profils côtiers a également été préparée depuis
Natural Earth : Afrique, Amérique du Sud, Australie, Madagascar, Groenland,
Grande-Bretagne, Nouvelle-Guinée, Bornéo, Sumatra, Honshū et les deux îles
principales de Nouvelle-Zélande. Pour les deux continents, les bords communs
des pays sont annulés et le contour extérieur principal est conservé. Les
dix autres profils utilisent les îles physiques du jeu de données 50m.

Chaque profil est une adaptation radiale de 360 rayons autour d'un point
intérieur, avec une échelle uniforme et un lissage périodique léger. La plus
lointaine intersection de chaque rayon conserve les grandes masses, mais
peut remplir une anse masquée derrière une autre côte. Une variante de
première intersection est fournie pour comparer cette perte. Le rayon minimal
de 0,15 stabilise les formes très étroites. Ces transformations sont explicites :
les profils sont des matières de conception étoilées, pas des cartes terrestres
exactes. Leur provenance reste celle de Natural Earth, dans le domaine public.

Les révisions sont épinglées dans les liens ci-dessus. Pour contrôler les
données Natural Earth téléchargées :

| Fichier | SHA-256 |
| --- | --- |
| `ne_110m_land.geojson` | `9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9` |
| `ne_110m_coastline.geojson` | `851f581ff5ffb844deed8ae1a9ce22e3c4bb3d74fa342cadb5d8e39b41ae7c3c` |
| `ne_110m_admin_0_countries.geojson` | `6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f` |
| `ne_50m_land.geojson` | `e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b` |
