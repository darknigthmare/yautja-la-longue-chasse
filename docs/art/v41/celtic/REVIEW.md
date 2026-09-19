# Celtic — idle V41

Le candidat retenu est `idle-chroma.png`, origine OpenAI native `exec-2b15f4b9-e671-4a12-abd9-b79b43f28373.png`. SHA-256 : `ae762952428477584d4c23be05b4b15cef55ea0fe0f734ee12d4171c828d9341` ; 1 877 882 octets ; 1536 × 1024. Le fichier source n'est ni retouché ni retourné.

**Proposition : 1 nouveau fichier source, 4 dessins distincts, 2 clips idle orientés. Trois générations ont été nécessaires ; les deux précédentes restent privées et rejetées. Aucun moveset complet.** Registre et fichiers publics non modifiés par cette revue ; validation en jeu encore à effectuer par le parent.

## Revue indépendante

Comparaison avec `public/game/sprites/v5/film-plates/celtic.png` et la garde corrigée V34. Masque argenté à crête gravée, épaulières à lamelles, thorax et tablier, filets, trophées, gantelet à lames et lance à deux pointes restent cohérents avec l'identité du projet. Deux bras et deux mains lisibles dans chaque dessin, prise de lance continue, pas de membre supplémentaire identifié. Les côtés opposés utilisent leurs propres dessins. Les pointes de lance sont entières et séparées des limites après préparation.

La première image et sa correction alpha paraissent propres sur gris, mais leur bruit alpha=1 relie réellement les dessins des deux rangées. Le préparateur runtime les refuse. Les preuves `original-alpha-rejection.json` et `repair-alpha-rejection.json` enregistrent ce rejet, sans seuil alpha ni assouplissement du validateur.

Le troisième master utilise le color-key magenta déjà éprouvé dans le projet (tolérance 64, correction de frange connectée rayon 2 / excès 16 / force 1). Les pixels du fichier restent inchangés ; seule la préparation mémoire normale du jeu enlève la couleur de fond. Quelques nuances magenta restent dans des détails internes des lames à grande taille ; à 122 px, la revue sur fonds clair et sombre n'identifie pas de liseré large ni de fond rectangulaire.

## Échelle et appuis

La hauteur casque→semelle mesurée est 458/459 px à droite et 436/435 px à gauche. Les deux orientations utilisent donc deux pages logiques pointant vers **le même fichier**, avec références 459/436 px. L'échelle reste uniforme dans les deux axes et commune aux deux dessins d'une orientation. Ne pas compter deux fichiers dans la provenance ou l'atelier : réunir les quatre reviewFrames par `publicPath`.

Les pivots utilisent le centre des deux groupes de semelles et la semelle la plus basse. Les rects entourent les contours réels avec 3 px de marge transparente partout ; aucune grille imposée.

| Orientation/dessin | Rect x,y,w,h | Pivot local | Référence corps |
|---|---|---|---|
| droite0 | 243,9,359,499 | 156.25,495 |459|
| droite1 | 923,8,347,502 | 148,498 |459|
| gauche0 | 251,513,335,471 | 187.75,467 |436|
| gauche1 | 936,513,326,471 | 184.5,467 |436|

Chaque dessin dure 60 ticks, boucle 120 ticks à 60 Hz : respiration lente, sans prétendre représenter une entrée en garde ou une réaction au coup.

Les appuis ne sont pas parfaitement fixes : leur centre varie horizontalement d'environ2,06 px à droite et0,77 px à gauche à la taille native 122 px. Le sol et le pivot vertical restent constants. Cette petite variation de largeur de pose doit rester explicite ; ce ne sont pas quatre poses d'attaque ni une marche.

## Recette

`verify-candidate.mjs` passe : quatre empreintes de pixels différentes, toutes les bordures à alpha0, schéma valide, vrai loader et véritable Canvas Chromium. Banque de comparaison : 16 clips (2 idles nouveaux + 14 clips V34 de garde, attaque légère et lourde). Vingt rendus natifs sur fond sombre/clair sont dans `native-light-dark.png` et ont été inspectés. Taille apparente cohérente avec les coups V34 ; aucune erreur de page ni requête ratée. Navigateur fermé et fichier source byte-identique.

Le rendu est acceptable comme candidat, avec les limites de proportion et d'appuis décrites. La recette finale doit encore vérifier les passages idle→garde→attaque→recul dans le vrai duel, les deux orientations, et l'absence de régression de comptage. La fidélité est celle des références originales du projet ; elle n'est pas certifiée officielle 1:1.
