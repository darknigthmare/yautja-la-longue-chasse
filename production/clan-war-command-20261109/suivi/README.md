# Suite P0/P1 et commandement — révision 2 du 9 novembre 2026

Le [classeur courant](Yautja_Commandement_P0_P1_20261109.xlsx) contient 19
feuilles : les treize historiques préservées et six feuilles de suivi actualisées.
**Les P0/P1 du jeu ne sont pas tous terminés.**

Le registre compte 2 591 sujets : 775 P0 et 1 816 P1. Il conserve trois
qualifications bornées nouvelles, 29 lignes qualifiées antérieurement,
1 963 partiels et 596 ouverts. B05 reste partiel dans son état courant et garde
sa preuve antérieure. Aucun sujet priorisé n’est laissé sans rapprochement.

Cette révision inclut le correctif de compatibilité du commit `e18602ed` :
l’absence optionnelle du tutoriel est reconnue avant la validation du propriétaire.
Un journal présent garde ses contrôles. Le seul module applicatif modifié est
`trophyTutorialV6.ts` ; les 1 292 autres fichiers applicatifs sont identiques au
build précédent. L’identité du build repose sur les empreintes réelles, sa
préparation ayant déclaré des modifications locales.

Le nouveau parcours complet du tutoriel et les mêmes 18 contrôles du commandement
ont été rejoués dans le vrai Next sur le build `-FZ8BLkijX4wYooxQn-in`.
Les autres reçus conservent leurs dates, builds et méthodes : aucune nouvelle
exécution n’est déduite d’un simple changement de version. Les parcours GameClient
via Vite, les composants isolés, les API de manette synthétique et les essais
Next sont distincts ; les répétitions ne s’additionnent pas.

Le [reçu global v2](../verification.json) rapporte une nouvelle passe froide
réelle de 1 198 tests uniques sur 103 fichiers, le build Next et TypeScript
réussis, et le lint configuré de 2 852 fichiers sans erreur ni avertissement.
Les vérifications séparées et chevauchantes ne sont pas ajoutées à ces 1 198 cas.
Aucune campagne complète, manette physique, revue artistique humaine, nouvelle
endurance de soixante minutes ou fusion distante n’est déduite de ce classeur.

## Édition publiée historique

L’édition 1 reste conservée dans le commit Git
`1aaa388d83b4b95b6c3d568269ea7ba8a0f4e239`. Elle ne constitue pas une nouvelle
preuve du correctif et n’est pas réattribuée au nouveau build :

- Ancien classeur : `afa5817041cd5789a04bb06999ec6b6eeae8cce3760329c7d7af34804ffcb150`.
- Ancien reçu du classeur : `9abfabd2d6d6761f85ec84be3d9268558023667409443a1d4b7e9a9415fb92d6`.
- Ancien reçu global : `e5e7f42ed36061511fd8039db47fb7f7083f10db430eb3334561caebd5d6e272`.

Les fichiers natifs anciens restent inchangés. La présente révision remplace
uniquement les six feuilles courantes ajoutées au baseline de treize feuilles ;
elle ne prétend pas préserver les six feuilles de l’édition 1 dans un classeur
de 25 feuilles.

## Vérification documentaire

L’inventaire conserve 119 XLSX sources : 113 historiques protégés, cinq nouveaux
suivis et une capsule QA datée. Les 14 nouvelles priorités explicites sont les
deux P0 et douze P1 de `Mobilité / Reste_a_faire`. Les six Markdown de la bible
et de ses avenants ne contiennent aucune nouvelle ligne explicitement P0/P1.
Les autres critères gardent leurs sources, sans priorité inventée.

L’export de la révision 2 et une vérification indépendante réussissent :
**60 585 cellules comparées**, 19 feuilles, treize feuilles historiques et vingt
anciennes pièces ZIP conservées à l’octet, styles antérieurs préservés,
formule de synthèse avec cache 2 591 et reconstruction identique à l’octet.
Les 113 anciens classeurs restent inchangés. Les trois anciens objets publiés
sont également vérifiés dans Git ; le contrôle XML n’exécute pas Excel natif.

Le [changelog](CHANGELOG.md) conserve les résultats et leurs suites ; le
[reçu de cette révision](final-receipt.json) épingle les fichiers actuels.

SHA256 du classeur courant :
`28bf2f777ae5723f50db1efe0d86100c3d4f192360bc9cdc5227ece003737066`.

Depuis la racine, contrôle en lecture seule :

```bash
python3 production/clan-war-command-20261109/tools/verify-followup.py --check
```
