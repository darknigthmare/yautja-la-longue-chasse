# Fugitive — réaction au coup V28

Feuille retenue pour revue, **pas validée en combat** : `fugitive-hit-reaction.png`, 1536 × 1024, RGB opaque, 2 021 581 octets.

La [galerie officielle NECA de 2018](https://necaonline.com/2018/08/shipping-this-week-ultimate-fugitive-predator-and-tmnt-michelangelo-restock/) a été inspectée. Elle fournit la variante armurée, le masque gris à accents dorés, deux lames par gantelet et un canon d’épaule. La photo de face place ce canon à droite anatomique. La variante [Lab Escape](https://necaonline.com/2019/02/predator-2018-7-scale-action-figure-ultimate-fugitive-predator-lab-escape/), son fusil et son masque endommagé sont exclus de cette feuille ; le matériel Predator Killer et l’Assassin ne sont pas mélangés au personnage.

La génération OpenAI intégrée comporte six étapes lisibles : prêt, impact avec recul, recul maximal, reprise accroupie, remontée, retour en garde. C’est un candidat de réaction ponctuelle ; il ne faut pas boucler les impacts comme une respiration. Le passage de la pose 3 à 4 demande une vérification temporelle.

`registration.json` propose six rectangles libres avec pivots sur les appuis. Ils sont disjoints, dans la source, sans pixel classifié hors des rectangles à chacun des trois seuils. Le pied proche mesure 47 à 48 px ; la hauteur de silhouette va de 345 à 431 px selon la posture. Conserver une échelle unique. Le contact du pied éloigné dépend légèrement du seuil ; ces pivots restent des propositions de placement, pas des articulations d’un squelette.

La feuille et les loupes des poses 3 et 4 ont été examinées. Une seconde lecture indépendante par `pit_animation_lab` n’a pas trouvé de membre manquant, main supplémentaire ou arme flottante évident. La main proche s’entrouvre en 3 ; c’est plausible pour l’impact, mais diffère de la consigne de poings fermés. Les quatre lames restent fixées aux gantelets, sans épée tenue.

Le fond magenta varie ; il n’est pas un alpha. Les marges et hauteurs demandées ne sont pas toutes respectées. Le masque, les doigts fins et la longueur projetée des lames ne sont pas certifiés 1:1. La lecture dans le moteur, la clé couleur et le gameplay ne sont pas testés dans ce sous-lot.

SHA-256 : `6cad1bfac5c15ab432b9aa045fb7dd36eaa8f357a3818a888346b79859d4dfce`.

Provenance et réserves : `provenance.json`, `references.json`, `review.json`. Aucun code, manifeste partagé ou fichier V27 modifié.
