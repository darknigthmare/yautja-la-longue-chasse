# V136 — Comptabilité physique terrestre et des milieux intérieurs

La PR #39 préserve les planètes V102/V103/V115 et leurs sauvegardes. V136 introduit uniquement un **index de lecture**, recalculé depuis les polygones V115 existants.

## Problème corrigé

La recette V103 soustrait déjà la fraction occupée par l'hydrologie à la fraction terrestre. Par conséquent, l'aire `physical.landAreaKm2` du monde V115 est une **aire terrestre nette**. En revanche, les aires territoriales V125 additionnent les polygones **bruts** des cellules, sans retirer les bassins. Rapportées directement au total net, ces fractions peuvent dépasser 100 %.

V136 sépare quatre nombres contrôlables :
- surface totale de la sphère (km²) ;
- sols nets (km²), exactement l'aire déjà inscrite dans V115 ;
- milieu intérieur existant (km²) : lacs, chenaux, bassins d'acide, de glace ou de sable selon le type de planète. Aucun « océan d'eau » inventé ;
- milieu extérieur (km²) : la différence restante, pour fermer exactement le budget de surface.

L'index régional estime les sols nets en retranchant les aires des fonctionnalités hydrologiques réellement assignées. Si une fonctionnalité possède plusieurs régions, l'aire est répartie équitablement faute de découpe géospatiale précise, et la note signale cette **estimation**. Les parts régionales sont normalisées par la somme des territoires nets estimés, pas par une autre mesure incompatible.

Les masses terrestres reçoivent en parallèle un **descripteur physique en km²** (îlot, île, sous-continent, continent, supercontinent). La classification est fondée sur leur aire réelle, **pas** sur le nombre de territoires ni une prétention à une géologie canonique.

## Limitations

Aucune nouvelle île, région, route, mer, ressource ou frontière jouable n'est inventée par cette étape. Les aires sont des intégrales sphériques approximatives sur les polygones déjà existants ; ce n'est pas un maillage SIG certifié à l'échelle d'un film ou une altimétrie. Les mondes V102/V103 sans rayon physique explicite conservent un budget `null` : aucune précision kilométrique n'est fabriquée pour eux.

## Contrôles

`tests/planet-surface-budget-v136.test.mjs` couvre les six tailles, l'hydrologie présente/absente, la cohérence de la somme des aires et l'identité du monde. `docs/planet-generator-v136/` garde les distinctions de périmètre. CI du même PR.
