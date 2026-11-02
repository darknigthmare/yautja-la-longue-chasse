# PR27 — diagnostic de reprise

Base initialement inspectée : `0bf37a88401f840e3902f9566b3a805e258ce533`.
Correction poussée : `05087a4bc1673a1df10ebb4435e800824883a0df`, confirmée par REST et `git ls-remote` le 1er novembre 2026.
La lecture complète REST de la base initiale recensait 156 fichiers ; la liste GraphQL initiale plafonnait à 100.
La PR est indépendante et n’est pas fusionnée par cette reprise.

## Résultats établis

Les contrôles spécialisés et TypeScript étaient verts, mais le job application `124699076072` du run `41255961460` contenait déjà des échecs sur le groupe V112, le lint, le navigateur Atlas et la palette. Une CI ciblée verte ne permet donc pas de déclarer cette PR prête.

1. Le lint exact du workflow a été reproduit : 272 fichiers, zéro erreur et dix-sept avertissements ; `--max-warnings=0` produit légitimement un échec. Les avertissements proviennent des exclusions de champs de recette et d’une fonction inutilisée. Le correctif transverse de trois fichiers a été remis au coordinateur et vérifié séparément ; aucun seuil ou contrôle global n’a été supprimé.
2. L’Atlas construisait réellement `/homeworldRouteWorkerV112.ts`, tandis que le harness ne compilait et ne servait que V111. La première capture et le diagnostic conservent le 404 réel. Le harness corrigé sert les deux vrais modules, conserve la sélection par l’hôte actuel/historique et enregistre les empreintes source/JavaScript et les requêtes observées. Les quinze contrôles originaux passent dans l’archive puis sur les sources Homeworld courantes ; les deux captures de ce dernier passage ont été ouvertes.
3. Les trois échecs de palette correspondent à treize anciens identifiants encore présents dans les filtres de compatibilité, mais migrés en champs HEX et exclus des trois types actifs. La proposition de test conserve une égalité exacte sur types actifs + treize alias nommés ; elle ajoute chaque conversion, la priorité d’un choix moderne ou null et le refus d’un identifiant inventé/prototype. Onze contrôles palette/migration passent. Cette correction est désormais appliquée dans le worktree PR27 dédié décrit ci-dessous ; ces tests ne sont pas appliqués à la branche Homeworld.
4. Douze fichiers ciblés de chasse et de suivi V112 passent 234 assertions sur les sources PR27. Ce résultat ne remplace pas le groupe mixte complet du workflow : les deux classeurs et preuves Homeworld historiques appartiennent à un runtime antérieur et doivent garder leur contexte. La cause exhaustive de l’échec du glob V112 n’est pas revendiquée ici.

Le test propre à PR27 `planet-v115-v103-compatibility-v122.test.mjs` importe du TypeScript dont les dépendances utilisent des chemins sans extension ; sa première exécution directe sous Node22 échouait avec `ERR_MODULE_NOT_FOUND`. Le lot final réutilise le chargeur TypeScript déjà présent (`homeworldSceneSsrV78().load`) ; le corps du test et toutes ses assertions restent identiques, avec SHA comparés dans le manifeste. Ce test passe désormais dans les vingt-quatre contrôles ciblés. Les tests de PR31 utilisent la compilation esbuild et fonctionnent. Un essai des quinze tests PR31 copiés dans l’archive PR27 a donné quatorze succès et un refus d’assertion de texte : les deux branches écrivent différemment la garde des propriétés V115. La branche Homeworld réunie garde la garde de PR31 et réussit bien les quinze assertions, sans changement du test.

## Limites conservées

- Les 1 134 cas visuels et les dossiers PHG non certifiés restent ouverts ; alpha, SHA, projection mathématique et build ne les clôturent pas.
- Les études chromatiques ne sont pas des textures UV officielles certifiées 1:1.
- Le test Atlas utilise le vrai composant et de vrais Workers dans une fixture React ; il ne démontre ni marche du personnage, ni campagne complète, ni rendu de production.
- Le diagnostic et les correctifs isolés ne suffisent pas pour déclarer toute la PR prête à fusionner. Il faut intégrer les dépendances, réexécuter le dernier groupe complet et traiter les preuves/certificats selon leur protocole.

Preuves et propositions : [index](preuves-pr/INDEX.json), [lint original](preuves-pr/pr27-original-ci-lint.json), [diagnostic Atlas](preuves-pr/pr27-atlas-first-failure-diagnostic.log), [Atlas actuel](preuves-pr/atlas-current/result.json), [captures inspectées](preuves-pr/atlas-current/opened.json), [palette avant](preuves-pr/pr27-palette-before.log), [patch de palette proposé](preuves-pr/pr27-palette-proposal.patch), [onze contrôles](preuves-pr/pr27-palette-proposal-11.log), [234 assertions de chasse](preuves-pr/pr27-hunt-current-234.log).

## Lot correctif appliqué au worktree dédié

Base exacte : `0bf37a88401f840e3902f9566b3a805e258ce533`, dossier de travail `/tmp/yautja-pr27-reviewfix`.
Les octets initiaux des six fichiers ont été comparés aux blobs Git avant écriture.
Le coordinateur a committé et poussé ce lot en avance rapide dans la PR27 existante. Le nouveau commit contient exactement les six fichiers testés et leurs empreintes après correction. REST et `git ls-remote` confirment tous deux `05087a4bc1673a1df10ebb4435e800824883a0df` ; la PR reste ouverte.

- [Patch de six fichiers](preuves-pr/pr27-six-file-fixes.patch) et [manifeste avant/après](preuves-pr/pr27-six-file-fixes.json).
- [Vingt-quatre tests ciblés passés sur le vrai worktree](preuves-pr/pr27-worktree-targeted-24.log).
- [Lint exact de la CI : 272 fichiers, zéro erreur, zéro avertissement](preuves-pr/pr27-final-ci-lint-272.json). Les [272 entrées sont identiques](preuves-pr/pr27-worktree-lint-input-parity.json) entre l’archive entièrement lintée et le worktree dédié ; le lint strict des trois fichiers produit corrigés passe aussi dans ce worktree.
- [Quinze contrôles Atlas passés sur ce worktree](preuves-pr/pr27-atlas-final/result.json), avec [deux captures ouvertes](preuves-pr/pr27-atlas-final/opened.json), sans erreur page/console/HTTP. Tous les cas de propriétaire, étage, placement, annulation, fermeture, suspension et réponse tardive sont conservés.
- Le support de l’hôte historique reste disponible : [diagnostic du vrai hôte def899 et de V111](preuves-pr/atlas-historical-first-diagnostic/scope.json). Ce passage limité à deux vérifications est explicitement `PASS_DIAGNOSTIC`, pas une réussite de toute la suite d’annulation.

Aucun build long ni nouveau certificat de production PR27 n’est revendiqué. Le glob V112 mixte, les qualifications artistiques et la validation d’intégration globale restent à terminer sur la nouvelle tête. Les anciens échecs et rapports restent distincts des contrôles corrigés.

## Push et nouveaux contrôles

[Événement de push vérifié](preuves-pr/pr27-push-05087a4b.json) : `0bf37a88` → `05087a4bc1673a1df10ebb4435e800824883a0df`.
Les vingt-quatre tests, quinze contrôles Atlas et lint de 272 fichiers qualifient uniquement leurs périmètres locaux documentés sur les mêmes octets désormais committés. Ils ne constituent pas une réussite de toute la CI.

À la première observation de cette nouvelle tête, les jobs Actions produit n’étaient pas encore enregistrés ; CodeRabbit était ignoré et Vercel refusait le build pour limite de débit. Ces états d’infrastructure ne remplacent pas la validation applicative. Le run précédent `41255961460` et ses échecs concernent l’ancienne tête et restent historiques ; aucune de ses conclusions n’est attribuée à `05087a4b`.

La PR27 n’est pas déclarée prête à fusionner. Les nouveaux contrôles doivent être lus sur leur tête exacte, et le groupe V112 mixte, les preuves de production et les contrôles artistiques ouverts conservent leurs limites.

### Blocage de fusion constaté après le push

L’observation suivante confirme zéro run produit sur `05087a4b`, et GitHub déclare la PR `DIRTY` / `mergeable: false` face au main `81fc1916fc285ca85d3c434737bc35b1e5f2fb7f`. Une comparaison de trois arbres en lecture seule relève quatre blocs de conflit dans trois fichiers : `PlanetGeneratorV103.tsx`, `clanWarDeploymentV103.ts` et `clanWarPlanetStrategyV114.ts`. Les deux branches proposent des variantes du même correctif de types V103/V115.

La résolution proposée conserve la garde complète et les contrats de PR31, ainsi que le helper de nettoyage de PR27 dans l’éditeur. Aucun ancien résultat de CI ne remplace la vérification de la nouvelle réunion. L’absence de job ne doit donc pas être présentée comme une réussite ni attribuée seulement à un délai de file d’attente.

### Réconciliation locale avec main

Le coordinateur a engagé la fusion de main `81fc1916fc285ca85d3c434737bc35b1e5f2fb7f` dans le worktree PR27. Les fichiers en conflit ont été résolus sans modification de l’index par l’agent de revue : les deux systèmes reprennent exactement main, et l’éditeur conserve sa garde complète avec l’import/helper de nettoyage de PR27. [Empreintes des trois résolutions](preuves-pr/pr27-main-reconciliation.json).

Sur cette réunion locale : [vingt-sept tests passent](preuves-pr/pr27-reconciled-targeted-27.log), soit les vingt-quatre contrôles précédents et les trois assertions originales de PR31 ; [TypeScript complet passe](preuves-pr/pr27-reconciled-complete-types.log) après génération des types Next, et [le lint des cinq fichiers produit concernés passe au seuil zéro warning](preuves-pr/pr27-reconciled-strict-lint.log). Aucun build de production supplémentaire n’a été exécuté pour cette résolution.

Ces résultats précèdent le commit de fusion et ne constituent pas une CI distante de `05087a4b`. Le coordinateur doit enregistrer et pousser la réunion, puis surveiller les nouveaux contrôles sur cette nouvelle tête exacte. Le runtime Homeworld principal n’est pas modifié par cette résolution dans le worktree séparé.

### Réconciliation suivante avec main V124/V125

Après enregistrement local de la première fusion (`23bec58a`), le coordinateur a engagé main `c5fc51dc42d8e04a4a8f0ca79273c44e4921f7e1`, issu de la fusion PR33. Cette réunion apporte les modules de masques/export V124 et d’index physique/matières V125 sans nouveau conflit. La seule correction manuelle supprime la déclaration inutilisée `regionOf` dans l’index physique ; tous les autres octets de ce module restent ceux du main entrant.

[Vérification locale de cette réunion](preuves-pr/pr27-main-c5-qualification.json) : [41 tests réussis](preuves-pr/pr27-main-c5-targeted-41.log), dont les 27 contrôles précédents et 14 cas V124/V125 ; [TypeScript complet réussi](preuves-pr/pr27-main-c5-complete-types.log) ; [lint strict des sept modules produit réussi](preuves-pr/pr27-main-c5-strict-lint.log), zéro avertissement. Aucun nouveau build ni certification du glob V112 mixte n’est revendiqué. Le coordinateur reste responsable du commit/push et de la surveillance de la nouvelle tête distante.

### Réconciliation poussée et CI de sa nouvelle tête

La réunion a été committée et poussée en avance rapide dans la PR27 existante : `05087a4b` → `9ad29df77e8a11ca36bf1b37f6b4c6f08db3d05d`. Ses parents sont `23bec58a092001c5b1e824a6219d69f464cdbb14` et main `c5fc51dc42d8e04a4a8f0ca79273c44e4921f7e1`.

[Push vérifié indépendamment](preuves-pr/pr27-push-9ad29df7.json) par REST et `git ls-remote` : la PR est ouverte, sans conflit (`mergeable: true`). Les sept modules de la qualification locale de 41 tests / TypeScript / lint correspondent exactement aux blobs du commit poussé. Les passages plus anciens de 24 tests, 15 contrôles Atlas et lint de 272 fichiers conservent leurs identités et ne sont pas renommés comme une nouvelle exécution sur `9ad29df7`.

Onze nouveaux workflows `pull_request` sont enregistrés sur cette tête exacte, créés à 01:11:50 UTC. Au premier relevé, ils sont en file. Le nouveau contrôle application est [run41260050569 / job124711325508](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41260050569/job/124711325508). Le run historique `41255961460` n’intervient pas dans ce verdict. La PR27 n’est toujours pas déclarée globalement prête à fusionner ; les nouvelles conclusions et les qualifications encore ouvertes restent à établir.

### Dernier relevé des contrôles propres à9ad29df7

[État horodaté](preuves-pr/pr27-ci-9ad29df7-latest.json) : 10 workflows spécialisés réussis, 1 encore en cours. Le job application a toutefois déjà échoué sur son groupe V112 mixte à l’étape7 ; son build, ses types, son classeur chasse et son parcours navigateur de chasse ont ensuite réussi. Ces succès ne remplacent pas le groupe échoué.

Une [assertion précisément reproduite](preuves-pr/pr27-9ad-certificate-guard-reproduction.json) refuse le certificat historique R4 : `ClanWarAtlasV95.tsx` compte **50 034** octets dans `9ad29df7`, contre **49 834** dans son gel historique. La garde `verifyProductionV112` refuse donc correctement d’attribuer l’ancien certificat au code actuel. [Log du seul test reproduit](preuves-pr/pr27-9ad-certificate-guard-reproduction.log). Aucune assertion, preuve ou ressource native n’est modifiée ; cette reproduction n’est pas un diagnostic exhaustif de tous les refus du glob. La PR27 reste non qualifiée pour fusion globale.
