# Point de reprise — PR #104 Clan Ship

## Continuité du lot

Reprendre le dossier et le classeur existants. Les cinq feuilles restent `Reprise`, `ClanShip`, `Assets`, `Chateau`, `Arrivee_QA`. `production-state.json` est la source des états techniques ; `design-data.json` conserve les briefs. Le générateur `build-workbook.mjs` contrôle les fichiers, leurs empreintes, les compteurs, le rapport CI et ses captures avant export. Les corrections manuelles d’Excel doivent être reportées dans les JSON avant régénération.

## Source et preuve

L’intérieur physique de la source `22fad968311d252310fe2fde281f71564a401a64` est qualifié par le run `41818690041` : 201 tests, 22 scénarios, TypeScript et ESLint strict réussis, zéro asset demandé manquant et zéro exception JavaScript. Le rapport identifie le commit, le checkout identique et l’arbre de travail propre. Les identifiants exacts et la provenance sont dans `production-state.json.current`.

La révision finale de présentation est qualifiée sur l’arbre `3e51bbc023720057deb28696bd16bbaa6c8b6d82`. Elle comprend le libellé de coque ancré au viewport et deux cadrages complémentaires à 320 px, dont les commandes après défilement interne. Le rapport et les onze PNG finaux sont dans `qa-interior/run-41818690041/`. Le lot provisoire a été remplacé ; la baseline historique `qa/` reste intacte.

Le run général `41818690146` a également réussi TypeScript (étape 6), build Next.js webpack (16), smoke HTTP et cinq routes protégées (17), puis lint runtime (18). Son job `126536529962` poursuivait les autres recettes au relevé ; ne pas confondre ces succès d’étapes avec la réussite globale du workflow.

La PR #104 a effectivement été marquée **prête pour revue** (`draft=false`, ouverte, fusion possible au relevé), avec head runtime `22fad968311d252310fe2fde281f71564a401a64` et base `eeb2362`. Les onze captures ont été relues par root et un relecteur indépendant : aucun défaut visuel bloquant reproduit, réserves précédentes levées. L’approbation artistique humaine reste à examiner.

## Ce qui est déjà réalisé

Sept salles parcourables : hangar, armurerie, entraînement, conseil, archives, trophées et soins. Le déplacement manuel et guidé utilise le sol, les collisions et les portes. Six services existants s’ouvrent à portée et rendent la position de la salle. La sauvegarde durable garde la salle, la reprise utilise une entrée sûre, le pont personnel et le désamarrage restent distincts. Les commandes clavier, pointeur, manette et tactiles ont leur preuve de parcours.

Sept fonds WebP (1 661 452 octets), huit props transparents (1 368 700 octets) et leurs sources individuelles sont présents. Les empreintes ont été contrôlées. Les six autres installations réemploient trois images de console, terminal et râtelier ; le bord de sol est un réemploi CSS. Les portes et le rig du chasseur réemploient aussi les ressources existantes. La production, l’intégration, les tests et l’approbation artistique humaine restent quatre états distincts ; la dernière reste à examiner.

Le classeur suit 40 exigences Clan Ship, 20 ressources de catalogue, 32 demandes de conception château/arrivée, 33 lignes château, huit plans et 22 scénarios courants. Les totaux supplémentaires sont sept fonds, huit props, neuf lieux de conception et 62 secondes de storyboard. Les formules recalculent sans erreur et les essais temporaires de statut et de durée sont restaurés.

## Limites précises

La perte native de focus a été observée ; le document est resté visible. Ne pas décrire cette preuve comme un passage observé à `document.hidden=true`. La recette des services couvre leur ouverture, leur fermeture et le retour, pas l’ensemble de leurs coûts, récompenses ou effets métier. Propriété de campagne, import et refus d’écriture conservent leurs preuves de domaine distinctes. La version de branche est 1.2.0 ; fusion et mise en production se vérifient séparément.

## Prochain travail utile

1. Vérifier que ce lot documentaire, l’Excel et la preuve finale sont publiés dans la PR #104 déjà prête pour revue ; poursuivre cette revue et relever la conclusion du workflow général encore en cours au présent relevé.
2. Reprendre ici sans recréer les sept salles, les quinze images générées, les onze captures ni le classeur à cinq feuilles.
3. Reprendre les chantiers château et arrivée depuis leurs propres worktrees et leur état réel. Les documents présents ici sont des briefs conservés hors du périmètre implémenté de la PR #104 ; ils ne décrivent pas l’absence de travail ailleurs. Aucune fusion de ces chantiers parallèles n’a été effectuée dans ce lot.
