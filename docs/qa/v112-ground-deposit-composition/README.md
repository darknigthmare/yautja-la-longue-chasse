# Proposition de preuve composée — dépôt et route terrestre

Le dépôt fournit un **rétracteur local de la charge optionnelle du sac vers les facteurs 1**, sous les conditions précisées ci-dessous. Les tests construits passent pour huit mondes et trois armures, avec un sac au budget de volume maximal. Ils complètent les [24 missions réellement terminées à vide](../v112-ground-campaign/qualified-unladen/report.json) ; ils ne constituent pas 24 nouvelles missions jouées.

Cette composition est défendable pour la proposition géométrique « la charge optionnelle seule ne crée pas une obligation infranchissable : elle peut être abandonnée avant de quitter l’appui où elle a été acquise ». Elle ne prouve pas qu’un état quelconque après récolte possède une continuation victorieuse. Les PV, le temps, la purge et les menaces ne reviennent pas à ceux des 24 trajectoires initiales. Aucune clôture de ROU112-05 ou CHA112-05 n’est appliquée ici ; le root et le suivi doivent décider si la portée géométrique correspond entièrement au critère original. La portée plus forte de REM112-08 reste non établie.

## Opérateur et domaine

Soit un état de session courante, dans une phase vivante, avec un chasseur de dimensions natives 72 × 116, vivant, borné dans le monde, en appui, non grimpant et non encastré dans un solide. Le sac contient des prises canoniques uniques. Il n’y a ni opération en cours, ni carcasse portée, ni prélèvement de trophée actif.

Une récolte anatomique native ne peut terminer qu’en appui, sans grimpe, avec un propriétaire vivant et un outil ; elle efface son opération en ajoutant la pièce et son reçu (`ritesOfHuntV77.ts`, lignes 126–150 ; `HuntCanvas.tsx`, `updateHuntRitesV77`). Une reprise de pièce réussie impose aussi santé, appui, mains libres et capacité. Le callback de reprise ne s’exécute que pendant la pause. Ainsi, juste après ces deux modes d’augmentation du sac, les conditions de manipulation sont satisfaites. Ce constat concerne la frontière d’acquisition ; il ne prétend pas que toutes les actions ultérieures conserveront ces conditions.

La pause native est consommée avant `elapsed += delta` et avant les acteurs (`HuntCanvas.tsx`, lignes 9958–9974). Le joueur peut donc ouvrir le sac sans laisser avancer un nouveau tick après cette frontière.

Dans `moveFieldSpecimenV112`, branche `drop` (`fieldStashV112.ts`, lignes 53–68), aucun test ne demande une zone, un coffre, une capacité libre ou une place au dépôt permanent. Le point de dépôt est le centre horizontal aux pieds. Son point de contrôle, pieds moins 6 pixels, se trouve dans l’intérieur du rectangle libre du joueur ; le clamp horizontal est inactif pour le joueur natif borné. Il ne peut donc pénétrer l’intérieur d’un solide sans contredire la condition de corps libre.

Chaque dépôt ajoute seulement une entrée à `stashedSpecimensV112`. Le stock canonique, les parties déjà consommées, les reçus d’usure, les objectifs, les ennemis, le monde, les ressources et l’horloge restent inchangés. Les dépôts ne sont pas des plateformes ou obstacles de collision. Après un nombre fini de dépôts, `carriedFieldSpecimensV112` est vide. Sans carcasse portée, `fieldLoadV112([], armor, 0)` rend masse et volume nuls, et exactement 1 pour mouvement, saut, effort de grimpe et bruit.

Le coefficient de saut possède aussi une borne indépendante du dépôt : l’effort est clampé dans `[0, 1]`, donc `1 − 0,16 × effort` appartient à `[0,84, 1]`. Le mouvement reste dans `[0,68, 1]`. Cette borne ne prouve pas à elle seule la franchissabilité d’une distance précise avec une charge maintenue.

## Objectifs, provenance et reprise

Les obligations des huit missions sont des scans, récupérations technologiques, éliminations, Apex et extraction. `updateObjectiveFlow` ne lit ni les prélèvements anatomiques, ni les dépôts, ni leur charge. Le trophée Apex demeure dans `trophyClaim` et `trophyCarried`, distincts du sac. Le dépôt ne supprime donc aucune obligation accomplie et n’ajoute aucune obligation de récolte.

Le dépôt garde le stock et sa provenance dans la session. Capture, sérialisation, stockage mémoire acquitté, décodage et `restoreCheckpoint(..., "resume")` conservent le même registre et les mêmes dépôts dans les 24 fixtures. Les reçus et l’usure ne sont pas réinitialisés. Après cette reprise compatible, le sac vide garde ses facteurs 1.

La reprise immédiate d’une pièce dans la même pause est inversible : l’objet vient d’être placé à portée, avec vitesse de chute nulle ; le même budget a été libéré. Les tests reprennent toutes les pièces jusqu’au ratio 1, puis les redéposent. Après un déplacement, cette propriété devient conditionnelle : portée, appui, visibilité, chute arrêtée, capacité et place au dépôt doivent être revérifiés. Un dépôt au bord d’un support peut tomber lorsque la simulation reprend.

La durabilité n’est pas inconditionnelle. Le test d’échec de stockage conserve une sauvegarde portée de séquence 1, accepte ensuite le dépôt en mémoire, puis fait refuser l’écriture de séquence 2. Le rechargement lit toujours la séquence 1. Une fermeture après une écriture non acquittée ne bénéficie donc pas du théorème de reprise du dépôt. Les enveloppes testées restent sous 31 094 octets pour une limite de 524 288 ; les autres limites de taille, propriétaire, tentative, outil et géométrie continuent de s’appliquer.

Une prise laissée au sol n’est pas livrée au dépôt permanent à l’extraction : `resultFor` ne transmet que `carriedFieldSpecimensV112`. Abandonner une récolte optionnelle est le prix explicite de ce repli. La composition ne conserve pas une récompense laissée sur place et ne permet pas de la prélever une seconde fois.

## Carcasse portée : mécanisme distinct

Le sac est bloqué pendant le portage d’une carcasse. La dépose dédiée existe dans le menu, mais sa disponibilité immédiate ne peut pas être supposée universelle : dans les fixtures de corps superposés, le corps transporté se place à 38 pixels du joueur tandis qu’un autre corps reste plus proche ; le menu vise cet autre corps et ne permet pas la dépose dédiée du corps porté. Ce contre-exemple est construit, pas un incident revendiqué dans une mission authentique.

Le chemin automatique reste opérationnel : `updatePlayer` abandonne la carcasse avant saut, combat, visée ou grimpe (`HuntCanvas.tsx`, lignes 7772–7775), avant de recalculer charge et impulsion. Les 24 fixtures vérifient un saut natif après reprise neutre : le corps est déposé, le sac déjà vide conserve ses facteurs 1 et l’impulsion observée est celle sans charge. Cette règle évite d’imputer le poids du corps au saut ; elle n’est pas assimilée à un dépôt du sac sans tick de simulation, ni à une garantie de survie pendant ce tick.

## Résultats construits et lien avec les parcours réels

Commande exécutée avec Node 24.19.0, code 0 :

```sh
node scripts/qa-hunt-ground-deposit-composition-v112.mjs
node_modules/.bin/eslint scripts/qa-hunt-ground-deposit-composition-v112.mjs
```

Le [runner opt-in](../../../scripts/qa-hunt-ground-deposit-composition-v112.mjs) ajoute uniquement des exports et des callbacks natifs extraits tels quels par AST. Les acteurs, dimensions et possession d’outil de ses fixtures sont admis pour les tests ; seule l’horloge des rites avance pendant leur préparation. Ce n’est ni une campagne ni une preuve de survie contre les ennemis. Le [rapport](operator-report.json) est explicitement classé `CONSTRUCTED_OPERATOR_TESTS_NOT_GAMEPLAY`.

| Contrôle | Résultat |
| --- | --- |
| Huit mondes × trois armures, sac au ratio 1 | 24 opérateurs vérifiés |
| Points libres sur sols et appuis des mondes natifs | 5 394 sondes de géométrie ; le raisonnement sur le rectangle libre établit le domaine universel, pas le seul échantillonnage |
| Phases et verrous du callback | 12 cas |
| Refus conditionnels de reprise après déplacement | 5 cas |
| Bornes des coefficients | 15 cas, dont les ratios supérieurs à 1 sont des stress tests hors emport admissible |
| Dépôt, stockage mémoire acquitté, reprise compatible et reprise immédiate des pièces | 24 cas |
| Portage distinct et dépose automatique avant saut | 24 cas construits |
| Écriture refusée puis rechargement de la dernière séquence acquittée | Contre-exemple conservé |

Les [24 vrais parcours à vide](../v112-ground-campaign/qualified-unladen/report.json) prouvent l’existence d’un trajet complet pour chaque mission et armure, sans prélèvement anatomique. Le lemme ajoute qu’une charge optionnelle du sac peut être neutralisée localement, sans changer les autres préconditions d’un passage déjà praticable. Ensemble, ils étayent l’absence d’une obligation géométrique créée par cette charge seule.

Il reste interdit de transformer cette relation en « toute charge pleine est maintenable jusqu’à l’extraction », « toute position post-récolte possède une continuation gagnante », « toute prise déposée pourra être récupérée plus tard » ou « toute sauvegarde de dépôt est durable malgré un échec d’écriture ». Si l’une de ces portées est exigée pour le critère, il doit rester partiel. Aucun statut du classeur, aucune preuve historique et aucun fichier de production n’a été modifié par cette proposition.
