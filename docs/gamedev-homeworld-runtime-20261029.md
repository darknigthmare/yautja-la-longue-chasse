# Homeworld : collisions réutilisées et annulation des trajets

## Résultat et base de comparaison

Cette étape réduit le travail répété des collisions et corrige l'annulation des
calculs de trajet dans l'Atlas. Sur la nouvelle série alternée, la médiane de
première réponse du Worker passe de **5 388,5 à 4 663,2 ms**, soit **13,4601 %**
de moins, avec le même plan complet. L'intégration React et Worker passe
**15 contrôles sur 15**, après reproduction de cinq scénarios de course avec
l'ancien composant.

La référence de départ est
`842d513fef9e1c80adc7c6d6b25cd2ae4b081fca`. Le
[rapport précédent](gamedev-navigation-performance-20261029.md) conserve ses
propres mesures. Sa médiane de 4 207,2 ms appartient à une autre série :
elle ne sert pas de dénominateur ici.

La démarche applique les guides [performance-optimization][performance] et
[game-ai][game-ai], épinglés au commit
`19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9` dans le
[guide du projet](GAMEDEV_AGENT_GUIDE.md) : isoler le coût, conserver les
contraintes de déplacement, comparer des scénarios identiques et distinguer
les preuves. Les [empreintes et l'inventaire](qa/gamedev-homeworld-runtime-20261029/evidence.json)
rattachent les résultats aux sources et aux fichiers conservés.

## Réutiliser les données de collision

Le changement de performance concerne seulement
[homeworldCourtArtV80.ts](../app/game/systems/homeworldCourtArtV80.ts) et
[homeworldCivicDecorV80.ts](../app/game/systems/homeworldCivicDecorV80.ts).
Les interrogations répétées recalculaient les projections des supports natifs
de la cour et reconstruisaient quatre tableaux pour leurs bornes, même lorsque
les objets n'avaient pas changé.

Le cache privé de la cour conserve son polygone natif et ses bornes. Il vérifie
position, échelle, art, pivot, échelle par pixel, projection et coordonnées du
support, y compris une modification en place. L'API publique native continue
de fournir des copies indépendantes. Pour les objets hérités de V76, le cache
reprend le polygone effectivement retourné par l'API existante.

Le cache civique conserve uniquement les bornes du polygone public existant.
Un instantané numérique détecte ses modifications de coordonnées ou de longueur.
L'identité et la sémantique du cache public restent celles d'avant. Les
comparateurs, tolérances, empreintes, projections et prédicats de collision sont
inchangés ; les modules de navigation V77, V99, V109 et V111 ne sont pas modifiés.

La [preuve avant](qa/gamedev-homeworld-runtime-20261029/collision-red.log)
échoue précisément sur le travail répété : pour 100 interrogations hors emprise
après préparation, 100 projections natives et 400 constructions de tableaux de
bornes. La [preuve après](qa/gamedev-homeworld-runtime-20261029/collision-green.log)
ramène ces deux compteurs à zéro, avec **5/5 cas réussis**. Elle compare aussi
les contacts, bords, corps de tailles différentes, valeurs non finies et mutations
aux prédicats précédents. Aucun seuil de durée n'est imposé.

## Mesure du Worker natif

La [comparaison archivée](qa/gamedev-homeworld-runtime-20261029/workers/comparison.json)
utilise le même checkpoint audience → port, produit auparavant par la manutention
et le guidage natifs. Chaque ligne démarre un navigateur et un Worker neufs ; la
première réponse inclut le démarrage du Worker. L'ordre a été fixé avant
exécution, sans reprise sélective des mesures :

| Ordre | Variante | Première réponse |
| --- | --- | ---: |
| 1 | Avant | 4 156,0 ms |
| 2 | Après | 3 856,1 ms |
| 3 | Après | 4 663,2 ms |
| 4 | Avant | 6 449,9 ms |
| 5 | Avant | 5 388,5 ms |
| 6 | Après | 5 320,0 ms |

Les six exécutions utilisent Node 24.22.1, Chromium 153.0.8010.0,
Playwright 1.62.1 et esbuild 0.25.12. Les empreintes confirment que seuls les
deux modules de collision diffèrent entre variantes. Les **24/24 contrôles**
couvrent résultat initial, répétition identique, refus d'un état de sol périmé
suivi d'une récupération et absence d'erreur navigateur, console ou HTTP.

Le plan complet possède dans les six cas le SHA-256
`c8c4a2539a3cff7c808db31201899e7e5fce2d9a25b15cb7857108ea12d880e5`.
La [garde de coût](qa/gamedev-homeworld-runtime-20261029/navigation-cost.log)
conserve 16 points et 7 101,073952597615 unités pour la jambe au sol, sans
recours à la recherche fine globale V77. Le
[parcours guidé](qa/gamedev-homeworld-runtime-20261029/guided-roundtrip.log)
passe ses six cas, atteint l'audience et revient au poste utilisable avec le
moteur réel. Son retour de 9 609,7625 unités reste identique au parcours publié.

Les médianes des répétitions dans le même Worker sont 27,5 et 19,8 ms. Ces chiffres
restent indicatifs : trois mesures par variante, une seule fixture et une machine
partagée sous pression mémoire ne définissent ni un budget matériel cible ni un
gain de FPS. Les instantanés d'environnement accompagnent chaque exécution.

La [mesure exploratoire de 13 051,7 ms](qa/gamedev-homeworld-runtime-20261029/initial-worker-before.json)
est conservée séparément et exclue de cette série. Le
[premier lancement du runner](qa/gamedev-homeworld-runtime-20261029/environment-setup.json)
avait échoué avec ENOSPC avant toute mesure et avant tout Worker. Seul le dossier
reproductible et ignoré .next a été supprimé ; sources, dépendances et preuves ont
été conservées. Le protocole a ensuite repris dans l'ordre annoncé.

## Annuler avant qu'une réponse tardive arrive

Dans [HomeworldWorldMapV77.tsx](../app/game/HomeworldWorldMapV77.tsx),
une fermeture pouvait attendre une frame avant de révoquer la demande.
Une réponse déjà disponible pouvait alors installer un guide après fermeture,
suspension ou réouverture de la carte.

Le bouton Fermer, Escape et la manette révoquent maintenant immédiatement le jeton
de demande et terminent le Worker avant d'appeler le parent. Les transitions
externes passent par useLayoutEffect. Seule la présentation attend une frame,
protégée par une révision : une ancienne mise à jour ne peut effacer ni arrêter
un nouveau calcul. Le plan déjà confirmé est conservé lors de l'annulation de
son remplacement. Le recalcul volontaire depuis le guide reste possible carte
fermée ; une suspension interdit de lancer une nouvelle demande.

Les tests Node passent de [2/10 avant](qa/gamedev-homeworld-runtime-20261029/cancellation-red.log)
à [10/10 après](qa/gamedev-homeworld-runtime-20261029/cancellation-green.log).
Ils exécutent les callbacks du vrai composant avec un adaptateur de hooks,
Worker et RAF contrôlés. Leurs réponses de fixture sont admises par le validateur
V111 ; ils n'exécutent ni le solveur ni React dans un navigateur.

La preuve complémentaire utilise React monté et le véritable Worker V111.
Une réponse réellement calculée est retenue, puis livrée pendant que les frames
sont différées. flushSync appartient uniquement à la fixture. Le
[rapport avant final](qa/gamedev-homeworld-runtime-20261029/atlas-before/result.json)
obtient **10/15** : cinq courses reproduites concernent le bouton Fermer, Escape,
la fermeture externe, la réouverture avant RAF et la suspension.
Le [rapport après](qa/gamedev-homeworld-runtime-20261029/atlas-after/result.json)
obtient **15/15**, avec zéro erreur JavaScript, console et HTTP.

Cette comparaison remplace **seulement l'ancien composant Atlas** ; Worker,
caches et harnais restent courants. Le
[premier essai conservé](qa/gamedev-homeworld-runtime-20261029/atlas-initial/result.json)
avait obtenu 9/15 : les mêmes cinq courses, plus une assertion de texte V109
devenue obsolète dans le guide V111. La correction de cette assertion explique
le passage à 10/15 avant correctif ; il ne s'agit pas d'un sixième défaut du jeu.

Les captures du [détour confirmé](qa/gamedev-homeworld-runtime-20261029/atlas-after/actual-worker-cargo-detour.png)
et du [registre à 390 pixels](qa/gamedev-homeworld-runtime-20261029/atlas-after/mobile-cargo-register.png)
accompagnent ces scénarios isolés. Elles ne constituent pas une validation
artistique de la cité ni un parcours de campagne complet.

## Vérifications et CI

Le [bilan des tests Node](qa/gamedev-homeworld-runtime-20261029/unit-summary.json)
compte **48/48** : 5 collisions, 10 annulations, 1 coût de navigation, 6 parcours
guidés, 4 V99, 3 revue V99, 8 V109 et 11 V111. Ces résultats restent distincts
des 24 contrôles Worker et des 15 contrôles React/navigateur.

Le TypeScript strict du composant et de ses imports a terminé avec succès,
avec les bibliothèques esnext, dom et dom.iterable. Le
[lint local](qa/gamedev-homeworld-runtime-20261029/lint-unavailable.log)
n'a pas pu démarrer : l'exécutable ESLint était absent. Le workflow ajoute les
deux modules de collision au lint ciblé, les deux nouvelles suites au groupe
gamedev et le script Atlas avec conservation de son seul JSON pendant sept jours.

Le [relevé CI](qa/gamedev-homeworld-runtime-20261029/parent-ci.json) concerne
exclusivement le parent 842d513 : **cinq jobs réussis et 59 étapes réussies**
pour le job application. La nouvelle CI n'était pas encore lancée à la rédaction.
Ce relevé ne certifie donc pas les nouveaux changements.

## Reproduire

Depuis la racine, avec les dépendances verrouillées et Chrome disponibles,
les suites peuvent être regroupées ainsi ; les résultats archivés proviennent
d'exécutions séparées :

```sh
node --experimental-strip-types --test --test-reporter=spec --test-concurrency=1 \
  tests/homeworld-collision-cost-v113.test.mjs \
  tests/homeworld-route-cancellation-v113.test.mjs \
  tests/homeworld-navigation-cost-v113.test.mjs \
  tests/homeworld-connector-detour-v113.test.mjs \
  tests/homeworld-navigation-v99.test.mjs \
  tests/homeworld-navigation-review-v99.test.mjs \
  tests/homeworld-dynamic-navigation-v109.test.mjs \
  tests/homeworld-objectives-v111.test.mjs
```

Pour reconstruire les préimages et relancer la même alternance dans un nouveau
dossier, sans remplacer les preuves archivées :

```sh
yautja_runtime_tmp=$(mktemp -d /tmp/yautja-runtime-repro.XXXXXX)
mkdir "$yautja_runtime_tmp/baseline"
for yautja_runtime_module in homeworldNavigationV77 homeworldNavigationV99 \
  homeworldNavigationV109 homeworldWayfindingV111 \
  homeworldCourtArtV80 homeworldCivicDecorV80
do
  git show "842d513fef9e1c80adc7c6d6b25cd2ae4b081fca:app/game/systems/$yautja_runtime_module.ts" \
    > "$yautja_runtime_tmp/baseline/$yautja_runtime_module.ts"
done
git show 842d513fef9e1c80adc7c6d6b25cd2ae4b081fca:app/game/HomeworldWorldMapV77.tsx \
  > "$yautja_runtime_tmp/baseline/HomeworldWorldMapV77.tsx"
AUDIT_CHROME_CHANNEL=chrome python3 \
  docs/qa/gamedev-homeworld-runtime-20261029/compare-workers.py \
  "$PWD" "$yautja_runtime_tmp/baseline" "$yautja_runtime_tmp/workers"
```

Le contrôle Atlas avant doit reproduire les cinq échecs et sortir en erreur ;
le contrôle courant doit réussir :

```sh
AUDIT_CHROME_CHANNEL=chrome \
YAUTJA_ATLAS_V109_BASELINE_HOST="$yautja_runtime_tmp/baseline/HomeworldWorldMapV77.tsx" \
YAUTJA_ATLAS_V109_OUTPUT="$yautja_runtime_tmp/atlas-before" \
node scripts/qa-homeworld-atlas-browser-v109.mjs

AUDIT_CHROME_CHANNEL=chrome \
YAUTJA_ATLAS_V109_OUTPUT="$yautja_runtime_tmp/atlas-after" \
node scripts/qa-homeworld-atlas-browser-v109.mjs
```

Ces commandes mesurent et vérifient un scénario identifié. Elles ne modifient
aucune sauvegarde utilisateur et n'effectuent aucune publication.

[performance]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/performance-optimization/SKILL.md
[game-ai]: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/game-ai/SKILL.md

