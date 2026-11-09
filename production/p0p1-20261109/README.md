# Priorités P0/P1 — 9 novembre 2026

Ce lot poursuit la bible et les Excel depuis `39b601ce`, après intégration de
`main` au commit `19317af4` (PR #130). Il contient des corrections jouables,
des ressources candidates, un rapprochement documentaire exhaustif et des
preuves bornées. **Il ne clôture pas tous les P0/P1 du jeu.**

Le [nouveau classeur](suivi/Yautja_Priorites_P0_P1_20261109.xlsx) conserve les
sept feuilles historiques B05 et ajoute six feuilles de suivi. Les 112 classeurs
antérieurs restent inchangés. Les 2 577 sujets rapprochés comprennent 773 P0 et
1 804 P1 : **29 qualifications bornées nouvelles, une antérieure, 1 958 partiels
et 589 ouverts**. Aucun sujet n'est laissé « à rapprocher ». Une qualification
porte sur son critère explicite et ne certifie pas toute la fonctionnalité.

## Changements concrets

- Guerre des clans : archivage canonique `operations.fenced.v2`, adoption
  explicite de l'ancienne archive, conservation de cette dernière, reprise des
  intentions interrompues et refus des écritures obsolètes. Un ancien client
  peut continuer son ancienne branche sans écraser la nouvelle.
- Retour extérieur : le rappel retraverse uniquement les portions réellement
  atteintes, y compris au milieu d'un passage ou après un reroutage.
- Atlas : les exports JSON/CSV et les objectifs affichés utilisent la géographie
  et le climat V126. Les données historiques V120 restent identifiées.
  « Normandie » et « Grand Palais » ne sont plus classés montagneux à cause
  d'une correspondance trop large sur le texte.
- Clan Ship : neuf commandes utilisent le moteur audio existant après une
  nouvelle révision durable. Les lectures, rechargements, pauses et commandes
  silencieuses ne rejouent pas les sons.
- Personnalisation : le recoloriage de l'armure conserve le découpage des
  pièces, corrigeant les fragments détachés observés sur Samurai.
- WARP : module pilote à deux salles accessible via `/dev?lieu=warp-module`,
  avec déplacement, collisions, sas, console, prérequis et sortie. Deux nouveaux
  PNG P0 y sont intégrés avec trois originaux réutilisés. Dix-sept nouveaux PNG
  P1 restent des candidats sources, consultables dans la
  [galerie](../../public/game/warp-universe/20261109-p1/index.html).
- Bible : cinq contradictions de progression corrigées, avec
  [concordance](../../docs/campagne/CONCORDANCE_P0_P1_20261109.md) et
  [dossier de provenance](lore/README.md). Les étapes documentaires ne sont pas
  déclarées implémentées par leur seule correction textuelle.
- CI : nouvelle sélection de 70 fichiers de tests, vérification des vrais
  résultats TAP et des entrées nécessaires en checkout partiel. La recette a
  été exécutée localement dans un checkout froid ; GitHub Actions n'a pas été
  exécuté à distance dans ce lot.

## Vérification

Le [rapport global](verification.json) épingle les reçus et leurs SHA256.

| Vérification effective | Résultat | Limite |
| --- | --- | --- |
| Suite finale unique, Node 22 | 689 réussis, 0 échec, 0 ignoré ; 70 fichiers | Les anciennes passes et les répétitions ne sont pas additionnées. |
| Build de production Next et TypeScript | Réussis ; build `lSBcQd-2LuUCPafGoIZvC` | Aucun déploiement testé. |
| ESLint sur 48 fichiers modifiés/ajoutés | Réussi, zéro avertissement | Périmètre source du lot. |
| Six recettes dans le vrai Next | 105 contrôles réussis | Les reçus précisent les fixtures et les versions. |
| Archive, fixture du vrai composant | 17 contrôles réussis | Distinct des 15 contrôles de migration dans Next. |
| Quatre chasses natives ciblées | Quatre nouveaux reçus de victoire | Prérequis historiques injectés via les vrais réducteurs ; campagne complète non jouée. |
| Endurance PHG T15 | 3 600,0029 secondes réelles, 77 matières, 300 confirmations | GPU logiciel SwiftShader ; aucune certification de VRAM physique. |
| Ressources WARP | 22 PNG décodés et hachés, dont 19 nouveaux | 17 candidats P1 ne sont pas admis dans les missions. |

Les recettes PHG, chasse, audio et WARP ont utilisé le build immuable
`RYl37_8hN58IOB8jDpRj1`. Leurs sources ciblées sont identiques au rendu final.
La migration d'archive et les derniers exports ont été rejoués sur le build
final `lSBcQd-2LuUCPafGoIZvC`. Les tentatives échouées restent datées dans les
preuves. La trace d'endurance est conservée en gzip sans changer ses octets
décompressés ; le vérificateur contrôle cette identité.

Contrôles de livraison en lecture seule depuis la racine du dépôt :

```bash
python3 production/p0p1-20261109/tools/verify-tracker.py --check
python3 production/p0p1-20261109/qa/phg-endurance/verify.py
node scripts/snapshot-runtime-v113.mjs --check docs/qa/current-integration-20261103/runtime-inputs.json
```

## Travail restant

Le [registre courant](suivi/registre-priorites.json) conserve chaque critère,
sa source et son admission manquante. Parmi les chantiers encore ouverts :
serveur autoritaire de guerre des clans, raccordements complets de campagne,
scènes et variantes non construites, admission des ressources graphiques,
animations non réalisées, références primaires inaccessibles et validation
artistique humaine. Les 97, 208, 209 et 210 ne sont pas livrés comme images
générées. Les contrôles de manette synthétique ne valent pas essai physique.

Les 1 811 sujets PHG et 588 sujets Guerre des clans ont un diagnostic détaillé ;
ce diagnostic ne remplace ni les ressources manquantes ni leur implémentation.
Les audits Homeworld identifient les modules non admis et les placements à
valider, sans ajouter artificiellement de géométrie aux zones déjà accessibles.
