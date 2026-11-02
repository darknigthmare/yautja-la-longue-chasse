# Production ouverte V113 — 2 novembre 2026

Le [nouveau classeur](../../../production/YAUTJA_V113_SUIVI.xlsx) ajoute huit feuilles aux **122 feuilles V112 conservées à l’octet près**, soit **130 feuilles**. Il suit une production de candidats, sans intégration au jeu. Les **56 exigences source**, dont neuf actions Feral / Scar, et les **354 cibles artistiques** restent globalement ouvertes dans cette édition. Aucune validation artistique humaine n’est déclarée.

Le classeur fait **10 373 135 octets**, SHA256 `082ccfdd584a8989124f81851bdcb50e1c6206940c9d1f46b328d758e428d84f`. Le [manifeste](source-manifest.json) sépare la présence, la génération, les résultats techniques, l’intégration, les tests de gameplay et la revue artistique humaine. Le suivi V112, ses certificats R7, le gel et le classeur de coordination restent inchangés. Le nouveau classeur se trouve dans `production/` pour préserver les 27 sources et la reproduction de la coordination R7.

L’audit des 40 statuts historiques `MISSING` trouve **deux faux négatifs du matcher** : `target-v81-55-40` (ascenseur) et `target-v81-55-41` (cage ascenseur) ont déjà des PNG natifs V82. Ils demandent une revue, sans nouvelle admission déduite de leur présence. Avant cette génération, 38 autres fonctions n’avaient pas de sprite indépendant identifié dans la recherche délimitée ; cela ne signifie pas 38 liens de fichier cassés, puisque la source ne prescrit pas leurs noms de destination. Trois de ces cibles ont désormais des candidats non admis ; les 35 autres restent sans sprite indépendant identifié dans cette recherche. Les 313 familles avec candidats existants restent à admettre. L’unique statut `MISSING_ANIMATION` est **`target-v81-63-141` — Forge active** : un support statique ne prouve pas son cycle natif.

Les neuf exigences d’action Feral / Scar encore ouvertes ont déjà leurs BODY natifs, dont les fichiers et SHA ont été vérifiés. Les projections avant du duo d’origine sont raccordées en V109, les projections arrière en V112/R7. Les manques portent notamment sur les partenaires, variantes, objets autonomes, véritables désarmements offensifs, réactions xénomorphes et conclusions synchronisées. Un nouveau dessin BODY ne ferme pas ces actions. Preserve définit 32 secteurs et 64 adultes de simulation ; les objectifs de 80 secteurs et 100 adultes, ainsi que les fiches graphiques distinctes, restent ouverts. Les six ouvrages de clans ont leur exercice physique fini, mais l’autorité réelle de moyens et d’accord R2-M021 reste une frontière de campagne.

La nouvelle production utilise uniquement `image_gen.imagegen`, avec transparence demandée. **Quatre originaux pour trois cibles** sont conservés :

- [Abreuvoir alien, essai 1](native-candidates/target-v81-71-271-abreuvoir-alien-native.png) et [essai 2](native-candidates/target-v81-71-271-abreuvoir-alien-native-attempt02.png), `target-v81-71-271`.
- [Nourrisseur](native-candidates/target-v81-71-272-nourrisseur-native.png), `target-v81-71-272`.
- [Signal danger](native-candidates/target-v81-71-280-signal-danger-native.png), `target-v81-71-280`.

Tous sont des PNG RGBA natifs de **1 254 × 1 254**, malgré la demande initiale de 1 024 × 1 024. Leurs octets sont copiés sans retouche. Tous échouent à la marge stricte demandée de 48 px sur l’ensemble des pixels `alpha > 0` : du bruit alpha faible atteint les marges, et le signal manque aussi de marge visuelle forte. Les mesures à d’autres seuils alpha sont diagnostiques ; elles ne remplacent pas ce critère. Les pivots sont proposés depuis la boîte visible, sans test de contact au sol dans le jeu. Les quatre essais restent **`CANDIDAT_NON_ADMIS`**, sans intégration ni nouveau test de gameplay. Les [prompts réellement soumis](annexes/generation-receipts.json) et l’[inspection native](annexes/native-technical-inspection.json) sont conservés exactement.

Les annexes [exigences](annexes/requirements-audit.json), [art](annexes/art-gap-manifest.json) et [douze lots concrets](annexes/production-lots.json) conservent les IDs, cellules et critères d’admission. Les lots se recouvrent et ne sont pas douze clôtures. Les 21 reçus V6.13 et 36 traces/PNG V6.10 nécessitent la récupération des originaux authentiques ; une nouvelle génération ne reconstitue pas leur provenance.

Les références de cet audit sont explicitement **`SNAPSHOT_HISTORIQUE`** au commit `03cf51badd450338d748da55599a317a71debd28`, arbre `8955aa3ae57f3c1c5151fc6e2980d083bbcd0aaa`. Les 190 références historiques ont leurs modes et blobs Git réguliers vérifiés, en plus de leurs SHA256. Le générateur accepte leurs octets de travail uniquement lorsqu’ils correspondent exactement ; si un ancien fichier change dans un futur runtime, il peut lire son blob exact au commit épinglé. Il ne met à jour aucun hash, ne fetch rien et ne change aucune référence Git. Si l’objet manque dans un clone superficiel, il faut fournir explicitement ce commit, par exemple :

```sh
git fetch --filter=blob:none --no-tags --depth=1 origin 03cf51badd450338d748da55599a317a71debd28
```

Les **16 nouveaux fichiers d’annexe, candidats et outils**, ainsi que les **deux helpers gelés d’assemblage Excel**, restent vérifiés strictement dans leurs octets actuels ; ils ne peuvent pas utiliser ce fallback. Cela représente 208 sources : 190 références historiques et 18 entrées strictes. Aucun import de code actuel n’est redirigé vers une copie historique. Le manifeste lui-même est épinglé dans le rapport QA et sa reproduction. Les observations de présence et les chemins R7 ne prétendent donc pas décrire un runtime futur R8. Les chemins absolus contenus dans les annexes brutes décrivent leur exécution originale ; les sources consommées par le classeur utilisent leurs copies relatives portables.

Le journal conserve aussi la fusion parent-confirmée de **PR84 vers la branche de PR82**, `claude/reserve-grand-hunts`, le `2026-11-02T05:16:12Z`, commit `904cfa12519c5af1837b1e8b614e046c52982200`. Cette fusion n’est pas dans `main`. L’[audit distant antérieur](annexes/pr-premerge-audit.json) est copié à l’identique et reste un instantané antérieur ; l’[événement de fusion](annexes/pr84-parent-confirmed-event.json) est séparé. PR62 demeure un chantier distinct.

Vérifications locales :

```sh
python3 scripts/build-open-production-workbook-v113.py
python3 scripts/build-open-production-workbook-v113.py --check
python3 scripts/verify-open-production-workbook-v113.py
python3 tests/open-production-workbook-v113.test.py
```

La reproduction est exacte. Le lecteur ZIP/XML vérifie **5 637 cellules ajoutées**, 122 feuilles historiques identiques, 135 parties ZIP historiques inchangées, 147 XML lisibles, le préfixe des styles et l’absence de nouvelle formule. Les **cinq tests** passent : frontières de validation, falsification d’une cellule source nouvelle, mutation d’une cellule historique, données du classeur, et simulation en mémoire d’un futur fichier modifié avec fallback Git explicite. Un produit courant modifié reste refusé. Les rapports R7 et leur coordination sont comparés aux empreintes précédentes et se reproduisent toujours. Aucun test historique de gameplay n’est rejoué.

Les fichiers `before-snapshot-*` gardent la première passe de quatre tests et la génération avant renforcement du contexte historique. `tests-initial-failed.log` conserve deux défauts de l’auxiliaire de test corrigés ensuite : construction du chemin temporaire et sélection d’une feuille ancienne utilisant des chaînes partagées. Aucun seuil du produit ni critère d’admission n’a été abaissé. Les résultats finaux sont dans [checks](checks/) et [workbook-qa.json](workbook-qa.json). Excel natif, son moteur de calcul, du matériel physique et un déploiement ne sont pas exécutés par ce suivi.
