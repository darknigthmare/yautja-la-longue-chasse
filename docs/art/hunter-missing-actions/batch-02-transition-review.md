# Raccords A16 → B01 — premières tentatives de récupération

Les trois parties B inspectées conservent leur statut **draft** et leurs originaux. Elles ne sont pas proposées comme raccords prêts pour le lot final : chacune présente une discontinuité de taille à la frontière A/B. Aucun pixel n’a été modifié et aucune translation/normalisation n’a été appliquée.

Les mesures portent sur les vrais pixels visibles au seuil **alpha ≥128** dans la dernière cellule de A et la première cellule de B, avec la grille `Math.round` du pipeline. L’enveloppe visible comprend les équipements et les dreads ; elle décrit une différence source et ne constitue pas une mesure anatomique certifiée. La revue visuelle confirme le grossissement perçu.

| Action | Enveloppe A16 | Enveloppe B01 | Hauteur | Largeur | Diagnostic |
| --- | --- | --- | ---: | ---: | --- |
| Finisher combo | 223 × 223 px | 260 × 245 px | +9,9 % | +16,6 % | Taille et position différentes, correction native recommandée |
| Frappe lourde | 181 × 197 px | 243 × 228 px | +15,7 % | +34,3 % | Taille et stance sensiblement élargies, correction native nécessaire pour le raccord |
| Frappe aérienne | 202 × 231 px | 214 × 258 px | +11,7 % | +5,9 % | Même centre mais silhouette agrandie ; correction native recommandée |

## Finisher

La ligne des pieds passe de y303 à y284, soit **19 px vers le haut**. Le milieu des deux appuis passe de x156,41 à x131,58, soit **24,83 px vers la gauche**. L’écartement passe de 120,44 à 130,57 px, **+8,4 %**. La silhouette reprend bien le geste de contact, puis les cellules suivantes reviennent en garde. Une translation pourrait remettre les pieds à une hauteur commune, mais laisserait le changement de taille et d’extension.

Source B : `exec-2e636ad6-b0cf-41e8-bfcd-95b01953eb7e.png`.

## Lourde

La ligne d’appui ne change que de 6 px, mais l’écartement des pieds passe de **128,97 à 164,92 px**, **+27,9 %**. Le corps et les bras occupent une enveloppe plus large et plus haute. Le raccord serait perçu comme un changement de gabarit, pas comme la suite naturelle du faible déplacement entre deux dessins consécutifs. Une translation ne suffit pas.

Source B : `exec-37c186e4-be83-4287-b082-0c6eee7306a2.png`.

## Aérienne

Le centre visible reste presque identique : **(154,13 ; 172,51)** dans A16 contre **(158,15 ; 172,53)** dans B01. Le corps paraît cependant plus grand, et la surface visible passe de 21 003 à 25 497 pixels, soit une échelle équivalente d’environ **+10,2 %** si les formes étaient simplement agrandies. Les changements des dreads empêchent de confondre ce ratio avec une calibration anatomique exacte, mais ils ne justifient pas la variation globale observée du corps.

Le geste est cohérent : la lame termine son abaissement, l’avant-bras revient, les jambes restent repliées et le Yautja revient en garde aérienne. Aucun sol ou atterrissage n’est inventé. La correction devrait conserver cette chorégraphie, tout en maintenant la taille de A. Un pivot suivant les pieds serait particulièrement inapproprié ici.

Source B : `exec-5e69702f-39b4-4027-b454-5e654940509e.png`.

## Décision de production

Les trois feuilles sont complètes, transparentes et sans bord touché au seuil alpha ≥16. Leur défaut se situe dans le raccord entre pages. Une nouvelle génération utilisant la **planche A entière comme référence de caméra et d’échelle**, avec A16 comme référence du geste initial, est adaptée. Le parent a retenu cette voie de correction.

Ne pas remplacer ces tentatives sur disque ; les conserver comme origine de la décision. Les dessins corrigés resteront draft après admission technique. La suite A/B doit être inspectée à nouveau sur les véritables extrémités avant d’annoncer la continuité des 32 dessins.

Rapport de mesure : `batch-02-transition-qa.json`.
