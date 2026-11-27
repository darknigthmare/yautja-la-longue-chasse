# THE PIT — contrôle navigateur de la revue Greyback

**Date :** 27 novembre 2026. **Résultat : 9/9 scénarios réussis** dans Chromium `158.0.8127.0`, après correction du comportement de superposition en cas d’image candidate manquante.

Le contrôle monte le vrai composant [`GreybackSelectionReview`](../../app/pit-lab/selection/GreybackSelectionReview.tsx), sa feuille de style et les PNG publics. Il ne valide pas une animation de combat ni la fidélité artistique 1:1.

## Lot réellement présenté

Le [manifeste public](../../public/game/review/the-pit/greyback-unmasked-20261127/manifest.json) décrit six fichiers PNG : une référence d’origine et cinq sorties générées, correspondant à quatre poses et une correction de la première pose. Les six copies publiques ont été comparées octet par octet aux fichiers indiqués dans leur provenance, puis vérifiées par taille et SHA-256.

La page conserve `runtimeAdmitted: false`, `oneToOneCertified: false` et zéro clip natif activé. Elle ne comporte ni lecture automatique ni animation CSS des images. Les premiers dessins, la correction reçue et les corrections encore manquantes restent distingués dans les textes.

## Contrôles effectués

| Scénario | Résultat observé |
| --- | --- |
| Provenance | Six PNG identiques aux fichiers sources et aux empreintes du manifeste ; cinq sorties, quatre poses, une correction reçue. |
| Affichage ordinateur | Référence et première pose corrigée chargées ; statut de candidat non admis visible ; liens atelier et manifeste corrects. |
| Choix des dessins | Quatre boutons, une seule pose active ; le choix de première sortie/correction V2 ne concerne que la première pose. |
| Superposition et fond clair | Comparaison correcte, proportions conservées par `object-fit: contain`, aucun miroir, aucune animation et aucune écriture. |
| Clavier | Activation d’une pose par Entrée et focus visible maintenu sur sa commande. |
| Mobile | Format 390 × 844, comparaisons empilées, contrôles d’au moins 44 pixels, pas de débordement horizontal, fonctionnement avec mouvement réduit. |
| Candidat indisponible | Message explicite et aucun dessin substitué ; la référence superposée est supprimée tant que le candidat manque ; une autre pose reste consultable. |
| Référence indisponible | Message indiquant que la comparaison ne peut pas être validée ; aucune superposition de référence manquante. |
| Erreurs et ressources | Aucune exception JavaScript et aucune erreur HTTP inattendue ; les deux échecs d’image sont des fautes injectées pour les scénarios précédents. |

La première passe fonctionnelle avait découvert que la référence restait superposée lorsque l’image candidate échouait. Le composant exige désormais que **la référence et le candidat soient tous deux disponibles** avant de proposer cette superposition. Le scénario final maintient ce contrôle pour éviter qu’un fichier manquant ressemble à une sortie produite.

Les captures ont été relues pour vérifier la disposition, la lisibilité des commandes, les corps entiers dans leurs cadres et le message d’erreur. Cette revue des écrans ne constitue pas une admission des dessins ou de leurs raccords.

## Preuves et reproduction

- [Rapport machine, détails et empreintes des sources](qa/selection-review-20261127/report.json)
- [Page sur ordinateur](qa/selection-review-20261127/greyback-review-desktop.png)
- [Superposition sur fond clair](qa/selection-review-20261127/greyback-review-overlay-light.png)
- [Comparaison sur mobile](qa/selection-review-20261127/greyback-review-mobile.png)
- [Candidat manquant, sans image de substitution](qa/selection-review-20261127/greyback-review-candidate-error.png)
- [Runner reproductible](../../scripts/qa-pit-selection-review-v1.mjs) et [fixture](../../tests/browser/pit-selection-review-v1.fixture.tsx)

```sh
PIT_QA_CHROMIUM=/chemin/vers/chromium PIT_QA_OUTPUT=docs/the-pit/qa/selection-review-20261127 node scripts/qa-pit-selection-review-v1.mjs
```

`PIT_QA_CHROMIUM_ARGS_JSON` permet de transmettre les options requises par un exécutable portable. L’exécution locale a utilisé le Chromium portable déjà présent et les arguments fournis par `@sparticuz/chromium`. Le runner importe `playwright-core` et `esbuild` depuis les dépendances verrouillées du dépôt ; il n’installe rien.

Les composants réels Next `Image` et `Link` sont conservés. Le bundler du banc fournit les valeurs d’environnement client de production et un pont d’export CJS/ESM sélectionnant `Image` dans `next/dist/client/image-component`. Ce pont ne remplace pas le rendu par une image simulée. Le banc ne monte toutefois ni serveur Next complet ni routeur d’application : métadonnées de route, navigation complète et déploiement demandent leurs propres preuves.

Le lint ciblé du runner et de la fixture, ainsi que le typage ciblé de la fixture et de ses imports, ont terminé avec le code de sortie 0. Les captures, les résultats navigateur et une compilation réussie ne changent aucun statut artistique du manifeste.
