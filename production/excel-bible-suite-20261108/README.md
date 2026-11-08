# Avenant — suite Excel et bible du 8 novembre 2026

Cette passe reprend le commit `04eb4caa217ad114faf1cf63b301b4df67736b2d`.
Elle traite le trophée contesté du Clan Ship (`OPS-B03`) et le retour du
Berceau (`R2-M027`). Les deux parcours sont raccordés et passent leurs tests
de comportement ; leurs critères complets restent partiels. Ce document ne
clôture pas les autres ouverts du projet.

## Raccords de cette passe

### OPS-B03 — La trace du véritable porteur

Le dossier original C-37 distingue la strie de prélèvement B-17 de la
ligature de transport T-04. Le joueur examine le support, confronte le
relevé de chasse C-37/01 au relevé de transfert C-37/02 et entend Balafre de
Cendre. Les indices permettent de déduire les rôles de Balafre et de Trace
Froide avant de choisir une conclusion.

Deux conclusions étayées sont proposées : attribuer la chasse à Balafre en
conservant le portage documenté de Trace, ou inscrire explicitement les deux
rôles sur la plaque. Attribuer le prélèvement au porteur ou effacer toute
mention du portage renvoie vers le relevé concerné. Les observations déjà
acquises restent dans le dossier. La conclusion recueille ensuite la réaction
de Trace puis celle de Balafre, à leurs postes respectifs.

Chaque entretien exige la présence réelle de son interlocuteur. Une
affectation à un autre quartier du Clan Ship déplace le point d’entretien ;
la réserve, les soins, la suspension ou le vaisseau personnel ne produisent
pas une réplique à distance. Le dossier concerne un trophée de présentation
du clan, sans prélèvement dans la collection du joueur. Son récit et ses
inscriptions sont des créations originales du projet. La clôture crédite une
seule fois 35 marques ; elle n’accorde aucun rang ni rite et ne modifie pas
la collection historique.

Le critère Excel conserve sa formulation « devant deux témoins ». Le raccord
présent est une restitution en deux entretiens successifs, conforme aux deux
réactions décrites par la spécification §12.3. Aucune scène de réunion
simultanée ni télémétrie en direct n’est attribuée à cette livraison.
La phase d’intégration reste donc qualifiée **partielle** au regard du
critère source complet, avec un parcours de comparaison et de restitution
séquentielle raccordé.

Le journal des incidents accepte les dossiers V1 historiques sans les
réécrire à la lecture ; une nouvelle action confirmée utilise V2. Le dossier
et la gratification suivent l’écriture de campagne existante. Les règles de
reprise, les prérequis et les choix sont détaillés dans la
[note du trophée](trophee/README.md) et son
[rapport de vérification](trophee/verification.json).

### R2-M027 — Ce que la reine a changé

Le retour se déroule dans l’intérieur du vaisseau personnel de l’expédition.
Le joueur consigne le contrôle et le nettoyage à la baie médicale, rejoint
la galerie pour examiner la crête réellement prélevée ou les seuls relevés
rapportés, puis choisit entre le dépôt aux archives du clan et l’analyse
personnelle à l’atelier. Le parcours passe par les salles et leurs portes ;
un simple état de navigation ne suffit pas à confirmer une opération.

Le journal optionnel `returnVisit`, versionné, enregistre les trois étapes
et le choix final. Il ne réécrit pas le snapshot de terrain. Les données
historiques sans journal, y compris les anciens retours déjà rapportés,
restent compatibles. Une nouvelle sortie réinitialise le journal de retour
sans perdre les modifications du monde. La présence de la crête dépend du
prélèvement attesté et de la coque de l’expédition ; les points de vie du
chasseur ne servent pas à inventer un état de détérioration de l’objet.

Le dépôt au clan utilise les archives personnelles et n’ajoute pas de dialogue
de PNJ. Le contrôle et le nettoyage sont consignés ; cette séquence ne
revendique pas une nouvelle simulation médicale ni des effets de soin animés.
La visite physique du mentor, les VFX de nettoyage, l’audio dédié et une
détérioration propre de l’objet restent à réaliser. L’illustration de crête
réutilise un asset existant, sans nouvelle génération d’image pour ce retour.
Le panneau possède aussi un accès manette et un retour de focus vers la scène.
La [relecture indépendante](qa/retour-berceau/relecture-independante.md) et le
[sondage des commandes](qa/retour-berceau/input-routing-probe.json) vérifient
les branches de commande sur le code livré, sans revendiquer un essai sur
manette physique ni une session de navigateur.

## Suivi et sources

Le suivi de suite se trouve dans
le [classeur de suite](suivi/Yautja_Suite_Excel_Bible_20261108.xlsx) et son
[`suivi/qualification-suite.json`](suivi/qualification-suite.json).
Chaque référence renvoie au registre consolidé précédent ou aux blocs natifs
de la bible de campagne. Les textes sources et leurs anciens statuts restent
distincts des nouvelles preuves.

Les **108 classeurs d’origine**, le
[classeur consolidé précédent](../excel-bible-20261108/suivi/Yautja_Suivi_Excel_Bible_20261108.xlsx)
et ses données ne sont pas réécrits. Le registre complet conserve ses
8 625 sujets Excel, 4 304 cartes de bible V6, 4 257 blocs de campagne et
118 critères d’annexes. Ces ensembles se recoupent et ne donnent pas un total
de fonctionnalités manquantes.

Le fichier [`suivi/historique-preserve.json`](suivi/historique-preserve.json)
fixe aussi les empreintes des **92 fichiers de la passe précédente**. Le
builder et le vérificateur indépendant contrôlent ces empreintes, celles des
108 classeurs et les preuves de la nouvelle qualification. Le suivi de suite
contient quatre références : les deux raccords, la recette globale `OPS-Q26`
et la prochaine ouverture `OPS-B04`.

## Règles de qualification de cette suite

- `OPS-B03` doit conserver les observations de provenance, les interlocuteurs
  et une conclusion étayée. Il ne retire aucun trophée antérieur et n’invente
  ni rang ni règle canonique universelle.
- `R2-M027` reste **partielle** tant que le mentor, les effets, le traitement
  complet des objets et les recettes correspondantes ne sont pas livrés.
  La mort de la Matriarche, le prélèvement de crête, le retour et le débrief
  demeurent des événements distincts.
- `OPS-Q26` reste **partielle**. Le retour individuel du Berceau ne réalise
  pas `OPS-B04`, qui exige une équipe visible accompagnée jusqu’aux soins.
- Les états produit, intégré, testé en simulation, parcouru en navigateur et
  validé artistiquement restent indépendants.

Le nouvel [essai navigateur](qa/cradle-resume-20261108/README.md) échoue avant
le chargement de la page : Chromium ne peut pas créer son socket Unix
(`EPERM`). Aucun parcours visuel réussi n’est attribué à cette tentative.

## Vérification de l’intégration

Le [rapport commun figé](verification.json) consigne les commandes, leurs
résultats et les empreintes du code et des journaux.

| Vérification | Résultat | Preuve |
| --- | --- | --- |
| Suite commune, 23 fichiers de tests | **426 réussites, 0 échec** | [Journal](qa/tests-run.txt), [commande exacte](qa/tests-command.json) |
| Retour du Berceau, sous-ensemble inclus | 53 réussites, dont 10 nouveaux tests et 43 régressions | [Journal](qa/retour-berceau/tests-run.txt) |
| Incidents et trophée, sous-ensemble inclus | 27 réussites, dont 13 nouveaux tests et 14 régressions | [Journal](trophee/tests-run.txt) |
| Nouvelle vérification B03 après l’ajustement des étiquettes | 13 réussites ; mêmes tests réexécutés | [Journal](qa/trophy-final-presentation.txt) |
| Build de production et TypeScript | Réussis | [Build](qa/production-build.txt), [typecheck](qa/typecheck.txt) |
| Lint commun des 17 fichiers concernés | Réussi, aucun diagnostic | [Journal](qa/lint.txt) |

Les **23 nouveaux tests** et les sous-ensembles 53/27 sont compris dans le
total de 426. Le nouvel essai de présentation B03 réexécute 13 tests ; il
n’augmente pas ce total. Le commentaire de type qui nomme B03 a été actualisé
après le build, sans modification du type ni du comportement, comme consigné
dans le rapport commun.

La QA du classeur possède son propre
[rapport](suivi/verification-classeur.json) et ses
[aperçus](suivi/apercus/01-suite.png). Elle ne transforme pas une simulation,
un rendu React serveur ou un build en preuve de parcours navigateur.
Les deux feuilles ont été rendues et inspectées sur quatre aperçus. La
relecture ZIP/XML compare **856 cellules**, vérifie les quatre références,
les résultats de formules et **28 empreintes de preuves** ; elle ne relève
aucune cellule d’erreur. Les quatre scénarios de qualification calculée
réagissent correctement, puis les valeurs originales sont restaurées.
Les quatre PNG d’aperçu documentent ce classeur ; ce ne sont pas de nouveaux
assets artistiques du jeu.

## Reproduction du suivi

Le builder `scripts/build-excel-bible-suite-20261108.mjs` produit un classeur
de suite à deux feuilles, **Suite** et **Sources**, à partir du JSON de
qualification. La première présente les changements et leurs limites. La
seconde conserve les références et empreintes des classeurs d’origine et du
suivi précédent. Le classeur consolidé reste le point d’entrée des autres
ouverts.

1. Actualiser les comportements réellement livrés et les preuves dans le JSON.
   Passer `readyForWorkbook` à `true` seulement après les vérifications.
2. Exécuter le builder avec le Node du runtime primaire, depuis un dossier
   temporaire possédant un lien `node_modules` vers les dépendances fournies.
   Indiquer `--repo-root` et `--output-dir` avec des chemins absolus.
3. Le builder contrôle les empreintes historiques, résout les critères par ID,
   recalcule les formules, vérifie leurs réactions aux entrées, crée les
   aperçus puis exporte le XLSX et son rapport. Il copie la livraison finale
   dans `suivi/` sans modifier la passe précédente.
4. Exécuter `scripts/verify-excel-bible-suite-20261108.py` pour relire le XLSX
   en ZIP/XML et vérifier références, phases, résultats de formules et absence
   de cellules d’erreur.

Les contrôles du classeur portent sur son contenu et ses calculs. Les preuves
de gameplay conservent leurs propres rapports et leur portée.
