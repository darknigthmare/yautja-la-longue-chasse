# Relecture composée des critères ROU112-05 et CHA112-05

Décision du 2 novembre 2026 : qualification logicielle de la **franchissabilité géométrique**, après relecture indépendante des critères originaux par deux agents. Le code courant relu est `6ad331a5ceccf48f25659dc2b32ded247a0226f2`. Les exécutions conservent leurs dates, sources et empreintes d’origine ; cette note n’ajoute aucune mission au décompte.

| Critère | Texte original préservé |
| --- | --- |
| ROU112-05 | Les parcours de canopée sont optionnels et conservent le chemin terrestre. — Aucune mission bloquée par une charge ou armure. |
| CHA112-05 | Charge ajuste l’impulsion par coefficient borné. — Jamais de coefficient négatif ou d’obligation inaccessible. |

## Composition des preuves

1. Les [24 parcours natifs sans récolte optionnelle](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/e0347c7645667c6dd7fabc48527704d4b5f1ca32/docs/qa/v112-ground-campaign/qualified-unladen/report.json) terminent les huit missions avec Scout, Hunter et Berserker, sans grimpe, balancement ou contact de repos de canopée. Ils établissent un parcours terrestre pour chaque admission déclarée.
2. Le [lemme local de dépôt](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/e0347c7645667c6dd7fabc48527704d4b5f1ca32/docs/qa/v112-ground-deposit-composition/README.md) analyse l’opérateur natif à la frontière d’acquisition : joueur vivant et en appui, opération terminée, mains libres. La pause précède l’avancement de l’horloge ; le dépôt ne requiert ni zone ni place libre en réserve. Le sac peut être vidé sans déplacer le joueur, les ennemis ou le monde. Les facteurs de déplacement et de saut reviennent exactement à 1. Les 24 fixtures pleines et les 5 394 sondes y sont explicitement classées comme tests d’opérateur construits, distincts des 24 parcours.
3. Le coefficient de saut vaut `1 − 0,16 × effort`, avec effort borné dans `[0,1]` : il reste dans `[0,84 ; 1]`. Les bornes et les refus de manipulation sont exercés dans ce même rapport. Les conditions d’interaction des objectifs obligatoires et l’état du trophée Apex sont distincts du sac optionnel ; déposer une prise ne retire aucun objectif accompli.
4. Le [correctif de la carcasse portée](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/9e463aa136c97e102dc9a975405370a4c7bc5d3a/docs/qa/v112-carried-corpse-menu-fix/README.md) rend la bonne cible accessible même si un autre corps est plus proche, dans la portée native existante. Ses 20 cas natifs et son rendu/callback couvrent la dépose dédiée. Le moteur conserve également sa dépose avant le calcul du saut. Il s’agit d’un opérateur distinct du dépôt du sac.

La charge optionnelle peut donc cesser d’être une contrainte géométrique avant un passage : sa dépose restaure les capacités terrestres déjà qualifiées pour l’armure. Les pièces abandonnées ne créent pas d’obstacle de collision. La composition ne suppose pas que les conditions de santé, de menace ou de temps d’un état quelconque soient celles du départ du parcours ; ces autres causes ne sont pas attribuées à la charge seule.

Les deux critères ne demandent pas de conserver tout le butin jusqu’à l’extraction. Leur clôture doit être formulée avec cette possibilité d’abandon explicite et rester bornée aux missions, armures et opérateurs déclarés. Les sources de chaque exécution restent celles de ses rapports : `e4a6c64a1e77edad8865aa05ca7c2901d62bfa09` pour les parcours et le lemme initial ; base et empreinte du correctif de menu pour ses cas natifs.

## Portée qui demeure ouverte

REM112-08 demeure ouvert pour les parcours intégraux avec charge et armure effectivement déclarées jusqu’à l’extraction. Cette composition ne qualifie pas le maintien d’une pleine charge, la livraison ou récupération future d’une pièce déposée, la durabilité après écriture refusée, une victoire depuis tout état compromis, d’autres tirages/difficultés ni du matériel physique. Une dépose accepte la perte éventuelle du bénéfice optionnel ; elle conserve le registre et les reçus selon les conditions de stockage explicitement testées.
