# Masques — original du projet et adaptation graphique PHG

Chaque paire compare **A, le fichier existant du projet conservé exactement en
octets**, et **B, un candidat au rendu graphique PHG**. A garde son
format natif PNG ou WebP : aucune conversion, découpe ou retouche n’est faite.
Une copie exacte d’un asset existant ne certifie pas sa fidélité à la franchise.
Les B déjà de qualité suffisante peuvent réutiliser A lorsque les tentatives
de restaging altèrent le design : cette réutilisation est affichée et n’est
jamais comptée comme une nouvelle génération ImageGen.

Le lot sélectionne 46 représentations de design déjà disponibles : 14 V62,
9 sources originales du projet et 23 représentations PHG dédupliquées.
Les 11 alias de clan et deux références de base partagée réutilisent ces paires.
Le fichier historique d’un alias V3 peut différer de la source préférée V62 :
les deux sont préservés et leur équivalence d’octets n’est jamais affirmée.

Ces 46 sources disponibles sont distinctes des **46 noms canoniques encore
sans découpe candidate**. La standardisation graphique n’en ferme aucun.
Deux trophées originaux restent également sans référence visuelle établie.
Les sources partielles ou hybrides conservent leur qualification dans les deux
versions ; une étude graphique hybride ne devient pas un masque portable certifié.

B préserve le design visible, la caméra, les couleurs connues, les dégâts,
ouvertures, lentilles et ornements. La lumière neutre commune, la hiérarchie des
matières et le grain contenu visent une lecture cohérente à 360 et 96 pixels.
Les sources grises restent grises quand leur couleur originale n’est pas établie.
Les petits concepts ne prouvent aucun détail nouveau à haute résolution.

Les 124 anciens XLSX, les quatre lots précédents et leurs 69 PNG natifs,
les sources A et les fichiers historiques des alias sont protégés par empreinte.
Les classeurs historiques ne sont jamais réécrits. L’outil OpenXML existant est
utilisé comme fonction pure ; aucun fichier ni paramètre global ancien ne change.
Tous les états canon, validation artistique humaine, runtime et animation restent
faux. Une paire représentée ne constitue pas une tâche bible/Excel terminée.

## Reconstruction et contrôles

Depuis la racine, avec Python3 et Pillow12.3.0 :

~~~sh
python3 production/biomasks-dual-20261113/tools/build-dual-mask-pack.py --write --require-complete
python3 production/biomasks-dual-20261113/tools/verify-dual-mask-pack.py --check --require-complete
python3 production/biomasks-dual-20261113/tools/ci-dual-mask-inputs.py --check
~~~

L’option --freeze-sources crée une fois le suivi initial et refuse de le remplacer.
Le builder copie seulement les octets de A ; il ne crée ni ne modifie B.
Les nouveaux PNG B sont des copies natives ImageGen, avec reçus et prompts exacts.
Un B réutilisé garde exactement les octets A et un reçu de décision explicite.
Les originaux privés ImageGen sont comparés lorsqu’ils existent ; la vérification
portable fonctionne aussi sans ces fichiers privés. Pillow lit les dimensions
et l’alpha, sans exporter ni réencoder une image.

La galerie /game/biomasks-dual-20261113/review.html ajuste uniquement l’affichage
CSS aux bornes alpha pour rendre comparables les minuscules concepts et les
grands PNG. Ce cadrage de revue ne modifie aucun octet et ne certifie pas une
correspondance pixel pour pixel. Les alias et les limites restent consultables
dans les tiroirs ; les 46 noms restants sont affichés séparément.

Le classeur suivi/Yautja_Masques_Originaux_PHG_20261113.xlsx sépare les paires,
les références, les alias, les manquants et les sources protégées.
