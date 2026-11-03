# Reprise documentaire V112 — quatre décisions, archives conservées

Le [classeur](../../YAUTJA_V112_MECANIQUES_CHASSE.xlsx) contient **22 onglets, 613 lignes, 4 664 cellules contrôlées et 576 liens**. Les 362 identités originales et les 569 anciennes destinations de liens sont conservées. La source éditable reste [hunt-mechanics-v112.json](../../hunt-mechanics-v112.json).

La feuille **Cloture** garde ses 219 revues exactes : 201 qualifications automatiques bornées, neuf constats documentés, sept points partiels et deux non qualifiés. Le journal **Reprise** ajoute quatre décisions, sans réécrire cette archive. Les feuilles métier affichent l’état résolu : **205 automatiques, neuf documentés, trois partiels et deux non qualifiés**. Ces nombres comprennent des contrats de données ; ils ne comptent pas des parties jouées.

| Journal | Critère | Décision courante | Preuve ajoutée |
| --- | --- | --- | --- |
| RPR112-001 | CHA112-02 | PARTIELLEMENT_QUALIFIE → VALIDE_AUTOMATISE | PRF112-13 : [24 routes principales sans récolte](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/e0347c7645667c6dd7fabc48527704d4b5f1ca32/docs/qa/v112-ground-campaign/qualified-unladen/report.json) |
| RPR112-002 | ROU112-06 | PARTIELLEMENT_QUALIFIE → VALIDE_AUTOMATISE | PRF112-14 : [choix natif d’un repos avant épuisement](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/e0347c7645667c6dd7fabc48527704d4b5f1ca32/docs/qa/v112-canopy-choice/report.json) |
| RPR112-003 | ROU112-05 | PARTIELLEMENT_QUALIFIE → VALIDE_AUTOMATISE | PRF112-15 : [franchissabilité géométrique avec abandon optionnel](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/6e5999aa2507e296f754f581e5b97caa566fb7f2/docs/qa/v112-ground-deposit-composition/composed-review.md) |
| RPR112-004 | CHA112-05 | PARTIELLEMENT_QUALIFIE → VALIDE_AUTOMATISE | Même preuve composée, bornes de l’impulsion et opérateurs distincts de dépose |

Les budgets d’armure de CHA112-02 étaient déjà couverts par QA112-22/23. La nouvelle matrice termine les huit missions avec les trois armures sans récolte optionnelle, avec objectifs, ennemis, Apex, rite et extraction natifs, puis rejoue les entrées. Elle complète ce critère de route principale. Les armures sont admises comme replays logiciels ; cette matrice ne qualifie pas la progression d’une campagne montée dans GameClient.

ROU112-06 distingue la possibilité fonctionnelle de la compréhension d’un débutant. Le vrai GameClient/HuntCanvas affiche le guide développé ; les entrées natives conduisent au choix à 95,05/100 d’endurance, à une réception sur le vrai repos puis à la récupération jusqu’à 100. Le rapport conserve aussi la formulation de liane affichée contextuellement sur un arbre rigide. Aucune session novice ni saisie de la liane suivante n’est revendiquée.

PRF112-15 compose les 24 parcours à vide, le lemme local de dépôt et la dépose distincte du corps porté. Le sac peut être vidé à la frontière d’acquisition décrite par le lemme, sans déplacer joueur, ennemis ou monde ; les facteurs reviennent à 1. Le coefficient de saut reste dans `[0,84 ; 1]`. Le correctif de menu permet aussi de cibler et déposer la bonne carcasse portée. La charge optionnelle peut donc cesser d’être une contrainte géométrique avant un passage, au prix explicite de son abandon. Cette qualification ne promet ni butin gardé ni victoire depuis tout état compromis.

Les exécutions gardent leurs sources distinctes. Les parcours et le lemme initial portent sur l’application `e4a6c64a1e77edad8865aa05ca7c2901d62bfa09`, avec les fichiers consignés en `e0347c7645667c6dd7fabc48527704d4b5f1ca32`. Les 24 fixtures et 5 394 sondes du lemme sont des tests d’opérateur construits, sans nouvelle mission ajoutée. Le correctif de carcasse portée et ses 20 cas natifs sont consignés en `9e463aa136c97e102dc9a975405370a4c7bc5d3a`. La relecture composée est épinglée en `6e5999aa2507e296f754f581e5b97caa566fb7f2` et identifie le code relu `6ad331a5ceccf48f25659dc2b32ded247a0226f2`. Les vérifications des nouveaux octets documentaires sont celles de la copie de travail postérieure, avec leurs empreintes dans le [manifeste](manifest.json) ; elles ne sont pas attribuées rétroactivement aux exécutions d’origine.

## Limites conservées

Les huit identités REM112-01 à REM112-08 restent ouvertes, avec leur texte exact. REM112-08 conserve sa demande : « Vérifier le parcours intégral jusqu'à l'extraction avec charge/armure déterminées. Les 72 traversées de canopée isolées démontrent les repos et accès, pas toutes les campagnes au sol. » Les deux décisions géométriques n’ajoutent aucune garantie de conserver ou récupérer le butin optionnel, de survie depuis tout état ou de durabilité après écriture refusée. La matrice complémentaire de récolte publie ses charges réelles et ses échecs dans [son rapport](../v112-ground-campaign/README.md). ECO112-11 et la campagne interactive complète restent en attente de leurs propres qualifications. FUT-11/FUT-12 restent partiels. Aucun essai humain, téléphone, manette physique, matériel cible ou Microsoft Excel natif n’est ajouté par ce lot.

Le [carnet facultatif](../../../public/aide/qualification-chasse.html) prépare ces essais et fournit les téléchargements volontaires. Il ne ferme aucun critère.

## Compagnon imprimable et copies publiques

Le [PDF A4](hunt-review-v112.pdf) et sa [version HTML](hunt-review-v112.html) présentent les 219 revues et les huit critères restants. Les quatre fiches concernées conservent leurs dix champs historiques puis affichent les dix champs de la décision courante. Le [contrôle indépendant](printable-verification.json) vérifie **93 pages A4**, **10,5 points minimum**, les 227 fiches, les valeurs des 2 238 champs historiques, les 40 champs du journal, leurs statuts et les destinations des sources. Les captures des pages [12](printable-page-012.png), [13](printable-page-013.png), [45](printable-page-045.png) et [47](printable-page-047.png) montrent les deux couches ; la page [91](printable-page-091.png) montre les critères encore ouverts. Les huit captures du contrôle courant ont été inspectées.

La mise à l’échelle A3 du XLSX évite la séparation horizontale des colonnes. La table Cloture garde toutefois un texte très petit, autour de 5,3 points dans le candidat A3 inspecté ; le compagnon A4 fournit une présentation plus lisible. Le premier constat LibreOffice des 112 pages reste dans [le kit de validation](../v112-validation-kit/README.md). Le [nouveau roundtrip](libreoffice-compatibility.json) conserve les 22 feuilles, 4 626 cellules non vides, 576 liens, filtres et volets ; une sérialisation numérique équivalente est signalée pour Parametres!D36. Son export tableur compte 41 pages. Ces contrôles restent distincts d’une session Excel ou d’une impression physique.

Les copies publiques sont comparées octet par octet dans [public-downloads.json](public-downloads.json) :

- [XLSX](../../../public/aide/YAUTJA_V112_MECANIQUES_CHASSE.xlsx) : **740 369 octets**, SHA256 `39f9470537721b13766bf4436d0f43623e06d1bee8c860ec570a4ab1f4f867ec`.
- [PDF A4](../../../public/aide/YAUTJA_V112_REVUES_IMPRIMABLE.pdf) : SHA256 `32f84c72fc965deb817b640b4cb8b17e837542a2b1dde6ed2a74c053b1461442`.
- [HTML](../../../public/aide/YAUTJA_V112_REVUES_IMPRIMABLE.html) : SHA256 `8bdcbfcc3a6aac7236f122ba5c61f1f059231a4d4b30c33b3efca8781479317a`.

## Validation et reproduction

```sh
node scripts/build-hunt-mechanics-workbook-v112.mjs --check
python3 scripts/verify-hunt-mechanics-workbook-v112.py
node --experimental-strip-types --test --test-isolation=none --test-concurrency=1 tests/hunt-mechanics-workbook-v112.test.mjs tests/hunt-review-cycle-v112.test.mjs
node scripts/build-hunt-printable-v112.mjs --html outputs/qa-v112-printable/hunt-review-v112.html --pdf outputs/qa-v112-printable/hunt-review-v112.pdf
python3 scripts/verify-hunt-printable-v112.py outputs/qa-v112-printable/hunt-review-v112.pdf --output outputs/qa-v112-printable/verification.json
```

Le [résultat des contrôles ciblés](validation-results.json) consigne commandes, versions, sorties et codes de retour. Les quatorze tests couvrent reproduction, identités, liens, validation du journal, chronologie, portée géométrique et accord indépendant JavaScript/Python. Le mode sans isolation est utilisé localement pour rendre les sous-tests visibles sur ce runner Node 24 ; il ne change pas les assertions. La CI Node 22 conserve son mode normal. Aucun gameplay n’a été relancé pour ce lot documentaire.

Le fixture gzip de la source e4 protège son JSON de SHA256 `76b33d9f2acadf9bc6f07f395c545c0873c83a41d27f5168ac083bb5a4b9a8ff`. Sans option, il reproduit encore les **722 729 octets** du classeur initial ; l’option `printLayout.fitToPage=true` est explicite. Le schéma 3 vérifie aussi les empreintes de Cloture, du closureBaseline et du Restant initial, le `reviewRef` historique et les 569 anciennes destinations de liens. Une transition ne peut pas réécrire ces critères ou promouvoir directement un statut brut historique.

Le [lot à deux décisions](first-two-closure-baseline/README.md), avec son JSON, son classeur, son HTML/PDF et ses contrôles, est conservé octet par octet avant l’extension géométrique. Les JSON et PNG de la première copie, avant correction d’espaces dans les deux nouvelles fiches, restent dans [first-copy-before-spacing](first-copy-before-spacing/). Les anciens dossiers V112 de chasse et de clôture restent inchangés.
