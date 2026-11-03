# Reprise documentaire V112 — deux décisions, archives conservées

Le [classeur](../../YAUTJA_V112_MECANIQUES_CHASSE.xlsx) contient **22 onglets, 610 lignes, 4 638 cellules contrôlées et 573 liens**. Les 362 identités originales et les 569 anciennes destinations de liens sont conservées. La source éditable reste [hunt-mechanics-v112.json](../../hunt-mechanics-v112.json).

La feuille **Cloture** garde ses 219 revues exactes : 201 qualifications automatiques bornées, neuf constats documentés, sept points partiels et deux non qualifiés. Le journal **Reprise** ajoute deux décisions, sans réécrire cette archive. Les feuilles métier affichent l’état résolu : **203 automatiques, neuf documentés, cinq partiels et deux non qualifiés**. Ces nombres comprennent des contrats de données ; ils ne comptent pas des parties jouées.

| Journal | Critère | Décision courante | Preuve ajoutée |
| --- | --- | --- | --- |
| RPR112-001 | CHA112-02 | PARTIELLEMENT_QUALIFIE → VALIDE_AUTOMATISE | PRF112-13 : [24 routes principales sans récolte](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/e0347c7645667c6dd7fabc48527704d4b5f1ca32/docs/qa/v112-ground-campaign/qualified-unladen/report.json) |
| RPR112-002 | ROU112-06 | PARTIELLEMENT_QUALIFIE → VALIDE_AUTOMATISE | PRF112-14 : [choix natif d’un repos avant épuisement](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/e0347c7645667c6dd7fabc48527704d4b5f1ca32/docs/qa/v112-canopy-choice/report.json) |

Les budgets d’armure de CHA112-02 étaient déjà couverts par QA112-22/23. La nouvelle matrice termine les huit missions avec les trois armures sans récolte optionnelle, avec objectifs, ennemis, Apex, rite et extraction natifs, puis rejoue les entrées. Elle complète ce critère de route principale. Les armures sont admises comme replays logiciels ; cette matrice ne qualifie pas la progression d’une campagne montée dans GameClient.

ROU112-06 distingue la possibilité fonctionnelle de la compréhension d’un débutant. Le vrai GameClient/HuntCanvas affiche le guide développé ; les entrées natives conduisent au choix à 95,05/100 d’endurance, à une réception sur le vrai repos puis à la récupération jusqu’à 100. Le rapport conserve aussi la formulation de liane affichée contextuellement sur un arbre rigide. Aucune session novice ni saisie de la liane suivante n’est revendiquée.

Les rapports de jeu identifient l’application exécutée `e4a6c64a1e77edad8865aa05ca7c2901d62bfa09`. Leurs runners et fichiers de preuve sont consignés au commit `e0347c7645667c6dd7fabc48527704d4b5f1ca32`. Les vérifications des nouveaux scripts, JSON et octets documentaires sont celles de la copie de travail postérieure à ce commit, avec leurs empreintes dans le [manifeste](manifest.json). Elles ne sont pas attribuées rétroactivement à R1.

## Limites conservées

Les huit identités REM112-01 à REM112-08 restent ouvertes. ROU112-05 et CHA112-05 restent partiels : les charges pleines et toutes les charges admissibles ne sont pas couvertes. La matrice complémentaire de récolte publie ses charges réelles et ses échecs dans [son rapport](../v112-ground-campaign/README.md), sans élargir les deux décisions ci-dessus. ECO112-11 et la campagne interactive complète restent en attente de leurs propres qualifications. FUT-11/FUT-12 restent partiels. Aucun essai humain, téléphone, manette physique, matériel cible ou Microsoft Excel natif n’est ajouté par ce lot.

Le [carnet facultatif](../../../public/aide/qualification-chasse.html) prépare ces essais et fournit les téléchargements volontaires. Il ne ferme aucun critère.

## Compagnon imprimable et copies publiques

Le [PDF A4](hunt-review-v112.pdf) et sa [version HTML](hunt-review-v112.html) présentent les 219 revues et les huit critères restants. Les deux fiches concernées conservent leurs dix champs historiques puis affichent les dix champs de la décision courante. Le [contrôle indépendant](printable-verification.json) vérifie **92 pages A4**, **10,5 points minimum**, les 227 fiches, les valeurs des 2 238 champs historiques, les 20 champs du journal, leurs statuts et les destinations des sources. Les captures des pages [13](printable-page-013.png) et [45](printable-page-045.png) montrent les deux couches ; la page [90](printable-page-090.png) montre les critères encore ouverts. Les sept captures ont été inspectées.

La mise à l’échelle A3 du XLSX évite la séparation horizontale des colonnes. La table Cloture garde toutefois un texte très petit, autour de 5,3 points dans le candidat A3 inspecté ; le compagnon A4 fournit une présentation plus lisible. Le premier constat LibreOffice des 112 pages reste dans [le kit de validation](../v112-validation-kit/README.md). Le [nouveau roundtrip](libreoffice-compatibility.json) conserve les 22 feuilles, 4 602 cellules non vides, 573 liens, filtres et volets ; une sérialisation numérique équivalente est signalée pour Parametres!D36. Son export tableur compte 41 pages. Ces contrôles restent distincts d’une session Excel ou d’une impression physique.

Les copies publiques sont comparées octet par octet dans [public-downloads.json](public-downloads.json) :

- [XLSX](../../../public/aide/YAUTJA_V112_MECANIQUES_CHASSE.xlsx) : **734 128 octets**, SHA256 `f13dd1a3548aebac25ba77e11ad5c5835757fc49da94491dbe69dbd291b59989`.
- [PDF A4](../../../public/aide/YAUTJA_V112_REVUES_IMPRIMABLE.pdf) : SHA256 `e7b5793d7be0151b01bdc67919074f2bf21a713bdb037ec945b8b3d9d789e5dc`.
- [HTML](../../../public/aide/YAUTJA_V112_REVUES_IMPRIMABLE.html) : SHA256 `234d5419909490055047c5770885410e521d415cd28f8485d3dcf554391525ea`.

## Validation et reproduction

```sh
node scripts/build-hunt-mechanics-workbook-v112.mjs --check
python3 scripts/verify-hunt-mechanics-workbook-v112.py
node --experimental-strip-types --test --test-isolation=none --test-concurrency=1 tests/hunt-mechanics-workbook-v112.test.mjs tests/hunt-review-cycle-v112.test.mjs
node scripts/build-hunt-printable-v112.mjs --html outputs/qa-v112-printable/hunt-review-v112.html --pdf outputs/qa-v112-printable/hunt-review-v112.pdf
python3 scripts/verify-hunt-printable-v112.py outputs/qa-v112-printable/hunt-review-v112.pdf --output outputs/qa-v112-printable/verification.json
```

Le [résultat des contrôles ciblés](validation-results.json) consigne commandes, versions, sorties et codes de retour. Les treize tests couvrent reproduction, identités, liens, validation du journal, chronologie et accord indépendant JavaScript/Python. Le mode sans isolation est utilisé localement pour rendre les sous-tests visibles sur ce runner Node 24 ; il ne change pas les assertions. La CI Node 22 conserve son mode normal.

Le fixture gzip de la source e4 protège son JSON de SHA256 `76b33d9f2acadf9bc6f07f395c545c0873c83a41d27f5168ac083bb5a4b9a8ff`. Sans option, il reproduit encore les **722 729 octets** du classeur initial ; l’option `printLayout.fitToPage=true` est explicite. Le schéma 3 vérifie aussi les empreintes de Cloture, du closureBaseline et du Restant initial, le `reviewRef` historique et les 569 anciennes destinations de liens. Une transition ne peut pas réécrire ces critères ou promouvoir directement un statut brut historique.

Les JSON et PNG de la première copie, avant correction d’espaces dans les deux nouvelles fiches, restent conservés dans [first-copy-before-spacing](first-copy-before-spacing/). Les anciens dossiers V112 de chasse et de clôture restent inchangés.
