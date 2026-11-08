# Démarrer l’arrivée après la fin du chargement

Le [run Spatial `42504681958`](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42504681958)
de `bdc2b4af6d124519ac3539b6b1eef279d7b0bde7` réussit 65 contrôles, puis
échoue au lancement natif `/dev`. L’attente de `playing` expire : le rapport
observe `paused`, plan `orbit`, temps 0 ms, images prêtes et aucune erreur
de page ou ressource manquante. La [capture originale](prior-failure.png)
affiche « La fenêtre est inactive. ». L’[extrait du rapport](prior-failure-extract.json)
conserve les champs originaux nécessaires et l’empreinte du rapport complet.

Le [run Spatial `42504679597`](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42504679597)
de `d68bc7e9deca40e559d046c0d3c7fc9d5583c161` réussit ses 71 contrôles,
dont le parcours natif complet. Les 29 empreintes de sources déclarées par
ces deux rapports sont identiques. Les six finales photographiques sont
acceptées dans chaque run, avec un essai initial rejeté conservé dans chacun.
Ces deux résultats restent distincts ; le succès d68 ne requalifie pas bdc.

## Course reproduite et correction

La promesse de préchargement appelait `setLoading(false)`, puis publiait
immédiatement une chronologie `playing` dans la référence partagée. Avant
le nettoyage de l’ancien effet, un callback d’animation conservant
`loading=true` pouvait voir cette chronologie et la mettre en pause à 0 ms.
Le test reproduit cet entrelacement en exécutant les callbacks, effets et
reducers réels, avec le passage au prochain rendu contrôlé par la fixture.
Il échoue avant correction : **7 tests réussis sur 8**, avec `paused` obtenu
à la place de `prepared`. Après correction, les **8 tests réussissent**.

Le correctif retire les quatre lignes de démarrage dans la promesse. L’effet
déjà présent devient seul responsable du démarrage après validation du
chargement. Il exige toujours un document visible, aucune suspension, aucune
écriture concurrente et une arrivée `prepared`. Une arrivée reprise reste
en pause ; un checkpoint refusé conserve son erreur sans nouvelle tentative
automatique. La perte réelle de visibilité met toujours la séquence en pause.

La revue indépendante confirme la correction et l’ordre nettoyage puis
installation des effets dans React DOM installé et dans la copie compilée
de Next. Le test établit un ordonnancement possible ; il ne constitue pas
une trace React DOM du run bdc. Le reçu de ce run ne mesure pas les événements
de visibilité, donc une transition réelle de `document.hidden` ne peut pas
être exclue rétrospectivement.

## Vérification et portée

Les journaux [avant](before-fix.log.gz) et [après](after-fix.log.gz) conservent
leurs octets d’origine par compression. Le lint strict passe. La suite locale
élargie réussit **205 tests sur 213** ; les huit échecs proviennent de fichiers
image absents du sparse checkout, recensés dans le
[manifeste des 162 fichiers requis](missing-local-assets.json). Leurs blobs
suivis et tailles distantes sont vérifiés, mais leurs 111 Mio n’ont pas été
téléchargés pour cette correction de logique. Aucun test ni seuil n’est retiré.

Les trois commandes TypeScript locales ont été interrompues par `SIGKILL`,
sans diagnostic TypeScript : tentative initiale, tentative sérialisée avec
heap de 3 Gio, puis heap de 1,5 Gio. Leurs reçus restent conservés. Elles ne
valident pas le typage. Une nouvelle compilation locale complète n’est pas
revendiquée. Les contrôles TypeScript, la compilation, les 213 régressions et
la recette native complète doivent réussir en CI sur chaque tête publiée.

Le relevé V113 courant est régénéré séparément pour chacune des deux bases.
Dans chaque relevé, seule l’entrée `PlanetArrivalCinematic.tsx` change,
avec 168 octets en moins ; les neuf gels historiques sont préservés.
Les contrôles locaux de ce dossier s’exécutent dans l’arbre C37 et ne sont
pas présentés comme des exécutions distinctes dans l’arbre de base.

La recette Spatial, `ready()`, le script X11, les temps des huit plans,
les fenêtres d’acceptation, la limite de trois essais et tous les contrôles
photographiques gardent leurs octets. Les fixtures photographiques démarrent
déjà en pause et sont reprises après chargement ; le correctif concerne le
démarrage automatique d’une arrivée neuve. Aucun résultat de cadence ou de
performance n’est déduit de ce changement.

Le [reçu de vérification](verification.json) réunit les empreintes, les
commandes, les résultats locaux et les références des deux runs antérieurs.
