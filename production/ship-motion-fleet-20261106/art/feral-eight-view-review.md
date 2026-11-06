# Feral : revue indépendante des huit vues

Statut : proposition de calibration complète, en attente d’approbation du parent. Aucune activation runtime, aucun pixel source modifié.

## Identité et progression

Les deux maîtres V14, les huit premières candidates puis la correction dorsale ont été ouverts individuellement : onze images distinctes. Les huit vues retenues conservent la proue angulaire vers la droite, la passerelle dorsale nervurée, les plaques sombres, les évents orange et le dessin à deux nacelles. La nacelle éloignée est occultée en ventral léger ; cette occultation n’est pas un troisième moteur ni un sprite manquant. Aucune coque coupée observée.

Le premier dorsal accentué (SHA `0bf112a2…`) mélangeait perspective et inclinaison sans progression dorsale suffisamment nette. Il est exclu. Sa correction (SHA `083e7f4b…`) montre nettement davantage le dessus et beaucoup moins le ventre que la vue légère. Les noms restent inchangés. Les intentions de 12°/25° ne sont pas des angles mesurés.

## Convention de mesure

Le profil historique est 1672×941, nose(1620,540), tail(110,540), release(900,666), pivot(836,470.5). Nose et release sont dans l’alpha nul du maître : ces valeurs sont des repères abstraits existants, pas des points physiques redéfinis. L’axe visuel mesuré sur ce maître relie l’ouverture de la nacelle proche (110,535) au bord supérieur de proue (1590,495). Une même similitude positive transporte les quatre anciens repères vers chaque axe mesuré dans les sources natives1536×1024. Les coordonnées dérivées à six décimales préservent cette relation mathématique ; l’incertitude visuelle est ±6px au bord de proue et ±8px à l’ouverture moteur.

Le pivot reste un repère d’enregistrement, pas un centre de masse3D. Le release est dérivé et inactif sur ces vues : le largage et le sol conservent le profil. Aucun effet moteur nouveau : visibility0 et review unreviewed partout.

## Vérifications

Les huit PNG correspondent octet par octet aux sources générées et aux SHA du manifeste `957f7ca0477534945e8ae2663370783c19f5c1e238ba9d84a1b1daa8a8955c5a`. Dimensions1536×1024 ; alpha0..254 ; alpha maximal de bord≤1. Huit graphiques de mesure sur fond gris et le graphique du profil sont conservés sous `review/`, à des fins d’analyse seulement. Tous les points dérivés restent dans le canvas natif.

Cette revue ne démontre ni reconstruction3D canonique, ni fidélité absolue des panneaux cachés, ni approbation artistique humaine. Les panneaux et détails internes varient entre images générées.
