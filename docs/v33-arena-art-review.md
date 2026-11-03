# Revue des images THE PIT V33

La revue distingue les images reçues, la cohérence des pièces et la recette dans le jeu. Une image revue ici n'est pas encore une preuve de recette du runtime. Les fichiers PNG générés restent inchangés ; leurs marges transparentes sont exclues par une fenêtre source calculée sur alpha ≥ 16, sans étirement.

## Premier groupe : profondeur et architecture

Planche de contrôle examinée sur fond gris neutre le 12 septembre 2026 : `p0-a-vault-depth`, `p0-b-vault-haze`, `p1-a-gallery-left`, `p1-b-gallery-right`, `p2-a-ritual-pillar-left`, `p2-b-ritual-pillar-right`, `p2-c-service-door-frame`, `p2-d-service-door-leaf`.

- `p0-a-vault-depth` : voûte lointaine sombre, centre et partie inférieure dégagés. Pas de sol ni de props de combat peints dans ce fond.
- `p0-b-vault-haze` : voile discret, alpha réel, aucun rectangle de fond. Sous-plan facultatif ; intensité à vérifier dans le jeu.
- `p1-a-gallery-left` et `p1-b-gallery-right` : galeries réellement différentes, piliers extérieurs correctement orientés, arches ajourées, matériaux et lumière compatibles. La première tentative droite opaque est rejetée dans son reçu ; seule la nouvelle image transparente est utilisable.
- `p2-a-ritual-pillar-left` et `p2-b-ritual-pillar-right` : silhouettes indépendantes, même famille de basalte et bronze, socles entiers, contreparties gauche/droite cohérentes.
- `p2-c-service-door-frame` : cadre ajouré front-facing propre. Sa composition avec le vantail reste à mesurer ; ne pas annoncer le module de porte terminé avant ce contrôle.
- `p2-d-service-door-leaf` : première image reçue visuellement plus étroite que l'ouverture du cadre. État conservé à « généré » tant que l'ajustement sans déformation n'est pas démontré ou une version corrigée reçue.

## Recette dans le jeu

À réaliser après réception du sol et des autres plans : six passes indépendantes, cohérence du cadre et du vantail, sol aligné à y=430 et aux pieds, stabilité des marges/corners/zoom, transparence des chaînes, retour aux images V32 si un fichier requis échoue, absence de changement de collision et de replay. Les animations du décor ne sont validées qu'avec plusieurs dessins distincts réellement chargés.

## Deuxième groupe : braseros et trophée

Planche examinée sur fond gris neutre : `p3-a-brazier-left`, `p3-b-brazier-right`, `p3-c-brazier-flame-f00` et `p3-d-ceremonial-trophy`. Les deux bols sont indépendants, sans flamme peinte, avec métal patiné et supports bas compatibles avec l'architecture. La flamme est un dessin isolé ; elle sera rendue derrière les bols pour garder la lèvre du brasero visible. Le trophée reste un crâne original de lieu, sans attribution à une espèce ou un personnage canonique précis. Ces quatre images passent la revue de silhouette et de matériau ; la composition finale est encore à vérifier dans le jeu.

Mesure de la porte : ouverture utile centrale du cadre de 598 à 626 pixels de large pour environ 1 250 pixels de haut. Le premier vantail a un ratio515/1436=0,359 et ne convient pas. Cible de remplacement environ0,50, rendue avant le cadre, sans étirement, dans une zone provisoire x415,y160,w130,h255.

## Troisième groupe : ring, chaînes et porte corrigée

Les bandes `p4-a-ring-rear-fascia`, `p4-b-basalt-floor-tile` et `p4-c-ring-front-fascia` présentent une façade horizontale compatible avec une vue latérale. Leurs pixels ne sont pas étirés : les bandes arrière et avant sont répétées horizontalement à hauteur constante. La fenêtre source de contact du sol est x61,y266,w1718,h330 : sa première ligne est opaque à100% au seuil alpha250, ce qui évite qu'une marge transparente fasse flotter les pieds. Il s'agit d'un recadrage de lecture par le moteur, sans retouche du PNG.

Les deux chaînes `p5-a-chain-left` et `p5-b-chain-right` ont des maillons ajourés et des contrepoids complets, avec des variantes de dessin distinctes. Elles restent aux bords et doivent s'effacer devant un combattant.

Le nouveau `p2-d-service-door-leaf-v2` corrige le ratio du premier vantail. Le dessin est effectivement plus large, avec des coins supérieurs compatibles, et sera masqué par le cadre dessiné après lui. L'ancien fichier est exclu du manifeste de production ; aucune génération rejetée ou remplacée ne compte dans les22 fichiers demandés.

## Boucle de flamme

Les six fichiers p3-c-brazier-flame-f00 à f05 ont été comparés sur une même planche : contours distincts, palette orange et jaune homogène, absence de brasero ou de fond peint. Une fenêtre source commune contient toutes leurs silhouettes pour garder une échelle stable. Les faibles variations de base restent sous la lèvre des bols, dessinés après la flamme. La boucle est prévue à8 images/seconde et le mouvement réduit tient le dessin de référence.
