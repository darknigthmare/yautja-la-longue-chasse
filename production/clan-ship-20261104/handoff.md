# Point de reprise — PR #104 Clan Ship

**Lot intégré à `main` le 4 novembre 2026 à 17 h 39, heure de Paris**, par la fusion [`b18c79b92942f63ad885e6c90b4f2b5e90dc812c`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/b18c79b92942f63ad885e6c90b4f2b5e90dc812c). La [PR #104](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/104) est fermée et fusionnée. Le point de continuation est désormais la [PR #106](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/106), ciblée sur `main`, dans son chantier existant.

## Continuité du lot

Reprendre le dossier et le classeur existants. Les cinq feuilles restent `Reprise`, `ClanShip`, `Assets`, `Chateau`, `Arrivee_QA`. `production-state.json` est la source des états techniques ; `design-data.json` conserve les briefs. Le générateur `build-workbook.mjs` contrôle les fichiers, leurs empreintes, les compteurs, le rapport CI et ses captures avant export. Les corrections manuelles d’Excel doivent être reportées dans les JSON avant régénération.

## Source et preuve

L’intérieur physique de la source `22fad968311d252310fe2fde281f71564a401a64` est qualifié par le run `41818690041` : 201 tests, 22 scénarios, TypeScript et ESLint strict réussis, zéro asset demandé manquant et zéro exception JavaScript. Le rapport identifie le commit, le checkout identique et l’arbre de travail propre. Les identifiants exacts et la provenance sont dans `production-state.json.current`.

La révision finale de présentation est qualifiée sur l’arbre `3e51bbc023720057deb28696bd16bbaa6c8b6d82`. Elle comprend le libellé de coque ancré au viewport et deux cadrages complémentaires à 320 px, dont les commandes après défilement interne. Le rapport et les onze PNG finaux sont dans `qa-interior/run-41818690041/`. Le lot provisoire a été remplacé ; la baseline historique `qa/` reste intacte.

Le **job application `126536529962` du run `41818690146` a entièrement réussi**, incluant TypeScript, build Next.js webpack, smoke HTTP et cinq routes protégées, lint runtime et les autres recettes applicatives. Le **job modèles `126536529650` avait échoué** sur l’inventaire précédent, qui ne comprenait pas les six ajouts et huit modifications applicatives du Clan Ship. Le [relevé livré avec la PR #104](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/71826ae1d02563c73facced34ec8cfaa827aeb89/docs/qa/current-integration-20261103/runtime-inputs.json) contenait 2 130 entrées ; sa [provenance contrôlée](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/71826ae1d02563c73facced34ec8cfaa827aeb89/docs/qa/current-integration-20261103/README.md#actualisation-du-relevé-pour-le-clan-ship--4-novembre-2026) explique la reconstruction différentielle, sans changement du jeu ni des certificats historiques. Son document de 396 560 octets porte le SHA-256 `9ac1b87a8a280c7b211c1f6b70e2ca13c768852b3787c0b1abb4d3cb98f9b96b`.

**L’attente de validation de l’inventaire est clôturée.** La publication `71826ae1d02563c73facced34ec8cfaa827aeb89` a passé les **13 workflows GitHub Actions**. La [recette Clan Ship `41822330488`](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41822330488) confirme 201 tests et 22 scénarios réussis. La [régression V94 `41822330491`](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41822330491) a réussi pour l’application, les modèles, l’historique et leur agrégateur. Le [job modèles `126548272182`](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41822330491/job/126548272182) confirme le `--check` strict ci-dessus, puis **75 tests V113 réussis, aucun ignoré**.

Le passage préalable en revue sur `22fad968` reste conservé dans `production-state.json.delivery.history`. La fusion `b18c79b` a ensuite été vérifiée : **aucun fichier ne diffère de `71826ae1`**. Les fichiers intégrés sont ceux de la publication qualifiée ; aucun nouveau test après fusion n’est revendiqué. Les onze captures restent associées à `22fad968` et ont été relues par root et un relecteur indépendant : aucun défaut visuel bloquant reproduit, réserves précédentes levées. L’approbation artistique humaine reste à examiner.

## Ce qui est déjà réalisé

Sept salles parcourables : hangar, armurerie, entraînement, conseil, archives, trophées et soins. Le déplacement manuel et guidé utilise le sol, les collisions et les portes. Six services existants s’ouvrent à portée et rendent la position de la salle. La sauvegarde durable garde la salle, la reprise utilise une entrée sûre, le pont personnel et le désamarrage restent distincts. Les commandes clavier, pointeur, manette et tactiles ont leur preuve de parcours.

Sept fonds WebP (1 661 452 octets), huit props transparents (1 368 700 octets) et leurs sources individuelles sont présents. Les empreintes ont été contrôlées. Les six autres installations réemploient trois images de console, terminal et râtelier ; le bord de sol est un réemploi CSS. Les portes et le rig du chasseur réemploient aussi les ressources existantes. La production, l’intégration, les tests et l’approbation artistique humaine restent quatre états distincts ; la dernière reste à examiner.

Le classeur suit 40 exigences Clan Ship, 20 ressources de catalogue, 32 demandes de conception château/arrivée, 33 lignes château, huit plans et 22 scénarios courants. Les totaux supplémentaires sont sept fonds, huit props, neuf lieux de conception et 62 secondes de storyboard. Les formules recalculent sans erreur et les essais temporaires de statut et de durée sont restaurés.

## Limites précises

La perte native de focus a été observée ; le document est resté visible. Ne pas décrire cette preuve comme un passage observé à `document.hidden=true`. La recette des services couvre leur ouverture, leur fermeture et le retour, pas l’ensemble de leurs coûts, récompenses ou effets métier. Propriété de campagne, import et refus d’écriture conservent leurs preuves de domaine distinctes. La version 1.2.0 de ce lot est intégrée dans `main` ; le déploiement de production reste distinct.

## Prochain travail utile

1. Poursuivre la [PR #106](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/106), désormais ciblée sur `main`. La réconciliation, les compléments audio et le donjon scénarisé y sont en cours au relevé du 4 novembre. Reprendre ses fichiers et son suivi existants.
2. Qualifier sa nouvelle source avant fusion : inventaire courant strict, suite V94, recette complète de l’intérieur Clan Ship et recette Wolf. Les anciennes réussites de #104 et #106 ne qualifient pas automatiquement le code en cours.
3. Conserver ici les sept salles, les quinze images générées, les onze captures et le classeur à cinq feuilles. Les briefs château et arrivée sont maintenus hors du périmètre implémenté de la PR #104 ; leur réalisation relève du chantier #106. La clôture de l’inventaire et la fusion de #104 sont enregistrées et ne sont plus des tâches ouvertes.
