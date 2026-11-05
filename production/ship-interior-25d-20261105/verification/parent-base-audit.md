# Base des cinématiques et synchronisation du vaisseau

## Périmètre

Le code et les sept images du nouvel intérieur sont qualifiés sur **`86f593bad2c7d00259dc4cf0a7d1ad40eac1d719`** : [14 tests unitaires et 17 contrôles navigateur réussis](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42013765672). Ce reçu ne qualifie pas tous les parcours de campagne.

La base de la PR 115 est la [PR 114](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/114). Le bilan historique ci-dessous porte exclusivement sur **`1951e17f01f1951d7c961b4ed3938741966e3007`** : 17 workflows terminés, 14 réussis et 3 échoués. Ces exécutions précèdent l’ajout de `ShipInterior25D`.

## Trois échecs historiques vérifiés

| Parcours | Résultat avant arrêt | Observation et portée |
| --- | --- | --- |
| [Dev, run 42009684967](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42009684967) | 11 contrôles réussis, puis timeout de 90 s | La recette cherchait `[data-mission-opening-v78]` sous le canvas de chasse. Le briefing est rendu par `HuntViewportDialogV79` avec `createPortal(children, document.body)`. Le périmètre du sélecteur était incompatible avec le DOM réel. |
| [Wolf, run 42009684875](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42009684875) | 18 contrôles réussis, puis timeout de 20 s | Après la victoire, le trajet retour `royal-service-pass → royal-council → royal-audience` n’atteignait pas la condition « interaction activée et marche arrêtée ». Le test n’avait pas encore activé le refus d’écriture de récompense. Les logs seuls ne déterminent pas la cause runtime. |
| [Spatial, run 42009684795](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42009684795) | 22 contrôles réussis, puis assertion | Le détail final du trio était déjà à `complete` lors de l’observation avant PNG, au lieu de `playing`. Les tentatives de reprise ne couvraient alors que la fin survenant pendant l’acquisition. La photo finale et les contrôles suivants n’étaient pas validés. |

Leurs journaux ont été relus. Le détail du sélecteur Dev et du portail a également été confronté aux sources. Il serait incorrect d’attribuer ces trois échecs au nouvel intérieur, ou de déduire de son succès que les trois parcours sont maintenant qualifiés.

## Suivi reçu de la base

La base a ensuite publié **`8cee6ec4d7a1334ffd74af6eb9b29b161f561b15`**, arbre `4867642315ea924f4c6f1037aa8e253d6e86b776`, avec trois scripts QA et cinq fichiers de preuve. Ses sources applicatives restent identiques à `1951e17`.

- **Dev** cible le dialogue accessible par son titre exact, en conservant le périmètre de session et les assertions d’instance unique.
- **Wolf** observe tous les clics natifs avant filtrage. Une seule nouvelle pression est admise si aucun clic n’a atteint le document et si la scène reste inchangée, immobile et disponible. Un clic reçu n’est pas rejoué.
- **Spatial** préarme une observation native en lecture seule, liée au même root, au même run et au même plan, pour demander la capture pendant la fenêtre finale. Les gardes avant/après et la durée native de 62 secondes restent en place.
- Les recettes dupliquent après fermeture du navigateur une partie de leurs preuves dans le journal CI, pour permettre une revue distante durant l’indisponibilité de l’environnement local.

Sources et résultats propres à ce suivi : [commit de la base](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/8cee6ec4d7a1334ffd74af6eb9b29b161f561b15), [dossier de preuves](https://github.com/darknigthmare/yautja-la-longue-chasse/tree/8cee6ec4d7a1334ffd74af6eb9b29b161f561b15/production/insertion-trio-20261105/verification/qa-followup-1951e17), [PR 114](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/114).

## Intégration dans la PR 115

La synchronisation reprend les fichiers de preuve et les recettes Spatial/Wolf de la base, et fusionne la recette Dev avec les adaptations existantes à `ShipInterior25D`. Elle ne modifie ni le jeu, ni les images, ni la recette dédiée `qa-ship-interior-25d.mjs`, ni son workflow.

Les résultats du nouvel intérieur restent donc attribués au commit réellement exécuté `86f593ba`. Aucune réussite des nouveaux parcours généraux n’est déduite de cette fusion. La PR 115 reste en brouillon ; la revue visuelle finale, la comparaison artistique 1:1 et la qualification complète de la base demeurent distinctes.

## Résultats observés sur le suivi 8cee

- [Wolf, run 42015349691](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42015349691) : **32/32 contrôles réussis**, sans erreur navigateur ni asset manquant. Les 48 clics de station ont tous été livrés dès le premier essai. Le retour d’audience et le reçu de récompense passent.
- [Dev, run 42015349452](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42015349452) : **17 contrôles réussis, puis 1 échec**. Le portail de briefing passe après Skip et après l’arrivée naturelle. Le nouveau défaut intervient dans `clanReady`, lors du premier chargement du hangar dans un navigateur vierge : l’ancêtre de session est absent au moment de l’observation. Le rapport annexe décrit une autre page ; il ne permet pas de conclure à une redirection ou à une régression de l’intérieur personnel.
- [Spatial, run 42015349423](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42015349423) : **62 contrôles réussis, puis 1 échec**, sans erreur navigateur, console ou asset manquant. Les huit captures finales desktop/mobile des quatre variantes sont acceptées au premier essai. L’échec restant concerne un échantillon `airborne` absent pour Saketh en vaisseau desktop : les observations passent du seuil à 59 217 ms au sol à 60 017 ms. Cela démontre une observation incomplète ; l’absence de l’animation n’est pas établie.

Le rapport natif Spatial a été lu depuis l’archive **13410491059**, dont le SHA256 vérifié est `ae038ae652c12a5fbe51258c578f6b2636a41c3e842dba12459783477a87063c`. Le relevé final des 17 workflows de 8cee est désormais 15 réussites et 2 échecs (Dev et Spatial) ; V94 a terminé avec succès. Les trois anciennes causes sont donc franchies dans ces recettes, avec deux nouveaux points de vérification encore ouverts.

## Dernière synchronisation : 94b5

La base a ensuite publié `94b5e0f156c8eff9cbbc03bcf2088d3b96db03ea`, arbre `710c3831a1b4981a474ed764678153b1ca1b6332`, parent direct 8cee. Ses sept fichiers touchent seulement deux recettes générales et cinq preuves. La recette Dev lit l’ancêtre de session dans la même chaîne de locators et capture le bon contexte du navigateur vierge ; sa fusion conserve les six adaptations du vaisseau. Le fichier Spatial et les preuves sont repris exactement. Aucun code applicatif, asset, workflow, inventaire ni recette dédiée au vaisseau n’est modifié. Les résultats propres à 94b5 restent suivis dans la PR 114 ; ils ne sont pas déduits de la recette 17/17 de l’intérieur.
