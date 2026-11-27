# The PIT — point de reprise du 27 novembre 2026

**Suite à lire pour la reprise actuelle : [lot 2 — bonus de riposte, galerie et cinq sorties Greyback](CONTINUATION_20261127_LOT2.md).** Le présent document conserve les observations du premier lot, notamment la tentative Jungle Hunter bloquée.

## Base et objectif

- Dépôt : `darknigthmare/yautja-la-longue-chasse`.
- Base inspectée : `2769b094862aea97f10fc0e5c4f1154489a8a8bc`.
- Branche de travail : `codex/the-pit-combat-bible-extensions-20261127`.
- Demande : poursuivre The PIT et intégrer le guide de bible des jeux de combat avec ses deux extensions, en conservant les sources, la fidélité des incarnations et les limites réelles de production.

Le lot applicatif et documentaire est publié dans la [PR #195](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/195), au commit [`651125da75b76bacd2d59b66f18bb43ae30f2218`](https://github.com/darknigthmare/yautja-la-longue-chasse/commit/651125da75b76bacd2d59b66f18bb43ae30f2218). L’arbre distant `0be13c3ceb3052fab8e26578fa20ef9a7dd4a29a` est identique à celui du commit local testé `b2f000c82817bca1fa55f90c1f16677c7de17028` ; cette égalité a été vérifiée après récupération de la branche publiée. Le rapport et le script navigateur accompagnent la finalisation de cette PR. Aucune fusion ni mise en production n’est présumée ici.

## Sources récupérées et intégrées

Les trois documents sont présents intégralement dans [`combat-guide/sources/`](combat-guide/README.md) : guide général 1.0 du 25 novembre, extension 01 du 26 novembre, extension 02 du 27 novembre. Tailles vérifiées : **55 172**, **60 589** et **47 334** octets. Leur [manifeste](combat-guide/combat_guides_manifest.json) contient les SHA-256 et les sources.

L’intégration comporte la [bible dédiée](BIBLE_THE_PIT.md), la [traçabilité des 68 rubriques](TRACEABILITE_GUIDES_20261127.md), la checklist de **172 critères** et les **40 cas d’acceptation d’origine**. Le README principal et la bible de campagne renvoient à ce dossier.

## État mesuré avant les ajouts artistiques du lot

L’[inventaire exporté](INVENTAIRE_CODE_20261127.json) a été construit en évaluant les modules de production avec esbuild. Il contient les IDs exacts, noms, modes, sources limitées et empreintes de modules. Il ne remplace pas un contrôle des ressources graphiques servies.

| Élément | Mesure |
| --- | ---: |
| Identités runtime / versus | 201 |
| Première édition de progression / extensions / boss / originaux-invité / profils fournis | 12 / 4 / 2 / 3 / 180 |
| Profils partagés / adaptations individuelles | 180 / 21 |
| Variantes explicites | 416 |
| Arènes runtime / fiches de concepts historiques | 187 / 100, périmètres qui se recoupent |
| Chroniques V80 / rencontres déclarées | 201 / 1 608 |
| Atlas / clips / chemins PNG uniques du registre | 97 / 478 / 177 |
| Distinctions existantes | 18 : 12 Arcade, 5 Circuit, 1 Descente |
| Certification 1:1 globale du registre | 0 |

La file de six familles V93 représente 5 244 unités : 5 141 manquantes, 78 partielles, quatre poses tenues, 21 à revoir en pixels. Ce comptage ne couvre pas encore toutes les nouvelles familles de sélection/désélection.

## Sous-lot accès — code raccordé

[`pitContentAccessV1.ts`](../../app/game/systems/pitContentAccessV1.ts) ajoute une projection des 18 distinctions existantes : découverte, droit, disponibilité technique et compatibilité. Il fournit des conditions ET/OU, faits et compteurs, une présentation neutre pour les secrets, des raisons de refus et un remplacement qui conserve la préférence d’origine.

La projection lit les acquisitions validées par `pitSave` pour le propriétaire exact. Elle ne crée ni récompense, ni nouveau schéma de sauvegarde, ni migration. Les IDs inconnus sont ignorés pour l’affichage comme dans le panneau existant ; leur archive n’est pas modifiée. Aucun combattant, stage ou mode précédemment disponible n’est nouvellement verrouillé.

Les états de vérification externe sont non accordants. Aucun accès temporaire commercial n’est fourni. `claimRequired` et les catégories futures sont des contrats de logique ; la récupération manuelle, les coffres exploratoires et le catalogue d’un fournisseur ne sont pas raccordés par ce module.

La disponibilité par défaut des 18 distinctions concerne leur carte et leurs données existantes. Elle ne signifie pas que tous les costumes, bannières et intros suggérés par leurs noms sont des assets finalisés.

## Sous-lot sélection, distinctions et art — statut de reprise

[`pitSelectionPresentationV1.ts`](../../app/game/systems/pitSelectionPresentationV1.ts) et son raccordement dans [`PitSelectionFlow.tsx`](../../app/game/PitSelectionFlow.tsx) ajoutent huit phases explicites de présentation : survol, aperçu, confirmation, attente, changement de costume, désélection, validation de la rencontre et départ. Le réducteur de sélection reste l’autorité sur les choix. Les temporisations possèdent une génération, sont nettoyées et ne modifient ni le moteur de duel ni les sauvegardes. Le changement d’identité, de variante ou de personnage personnel ne reprend pas la phase d’un acteur précédent ; les effets de cadre respectent l’option de mouvement réduit.

Ce lot fournit des cadres, libellés et états d’interface autour des portraits existants. **Aucune animation native de sélection ou de désélection n’est ajoutée** ; transport, voix, compagnons et VFX propres à ces scènes restent à produire et raccorder. L’état « groupe » signifie ici que les deux adversaires et leur rencontre sont prêts ; aucun mode tag ne s’en déduit.

[`PitHonorsPanel.tsx`](../../app/game/PitHonorsPanel.tsx) consulte désormais la projection d’accès. Il présente les 18 distinctions par défaut, avec sceaux/cadenas SVG créés pour cette interface, conditions, progression et couleurs de palettes cachées tant qu’elles ne sont pas acquises. Les SVG ne sont ni des sprites ni des glyphes canoniques certifiés. La consultation reste sans écriture et le filtre des seules distinctions obtenues reste disponible.

La production artistique visait **quatre PNG de Jungle Hunter masqué, orientation droite** : deux poses de sélection et deux poses de désélection. **Une seule sortie a été tentée puis refusée**, HTTP 400 `moderation_blocked`. Les trois autres poses n’ont pas été tentées. Le [manifeste réel](../../art-source/the-pit/selection-20261127/jungle-hunter/manifest.json) consigne la référence inspectée, ses empreintes, la tentative et ses limites : **zéro PNG reçu, zéro admis, zéro intégré**. Aucun candidat, clip complet ou certificat 1:1 nouveau n’est annoncé. Deux futures poses ne suffiraient pas, à elles seules, à valider une animation fluide.

| Preuve de fin de lot | État connu |
| --- | --- |
| Production graphique | Bloquée à la première sortie ; 0/4 PNG, aucun asset public ajouté |
| Admission technique et revue artistique des sorties | Sans objet : aucune sortie reçue |
| Cycle UI et navigation rapide | Tests ciblés réussis ; huit phases observées dans Chromium, changements rapides et retours vérifiés |
| Mouvement réduit, nettoyage des temporisations, focus | Logique ciblée et parcours navigateur réussis ; chemin du paramètre de composant vérifié, media query du système non testée séparément |
| Commit / PR publiés | Lot applicatif `651125da75b76bacd2d59b66f18bb43ae30f2218`, PR #195 ; arbre identique au contenu testé |

## Validation connue et limites

Les trois sources documentaires ont été comparées octet par octet, par taille et SHA-256 aux copies récupérées. Les 68 sections et les 68 lignes de traçabilité sont présentes ; les 172 critères reformulés sont comptés et les 40 cas d’acceptation ont été retrouvés textuellement dans les originaux. Le contrôle documentaire du 27 novembre a vérifié 187 liens Markdown locaux sans lien cassé, ainsi que les renvois du README et de la bible de campagne. Le contrôle de différences n’a signalé aucune erreur d’espacement sur le périmètre documentaire suivi.

Ces contrôles concernent les fichiers réellement présents ; l’inventaire d’exports décrit la base indiquée plus haut, sans assimiler ce contrôle à une revue de tous les assets.

Le sous-lot d’accès dispose de **11 nouveaux tests** dans [`pit-content-access-v1.test.mjs`](../../tests/pit-content-access-v1.test.mjs), couvrant notamment vraie progression Arcade, sauvegarde/chargement, doublon, ET/OU, propriétaire, acquisition avec fichiers absents, incompatibilité, secret et sources permanentes conservées. Les régressions `pit-save.test.mjs` et `pitHonors.test.ts` complètent ce périmètre : **41/41 tests réussis** pour l’exécution ciblée suivante.

```sh
node --experimental-strip-types --test tests/pit-content-access-v1.test.mjs tests/pit-save.test.mjs tests/pitHonors.test.ts
```

Le lint ciblé et la vérification TypeScript ciblée suivants ont également terminé avec le code de sortie 0 :

```sh
node_modules/.bin/eslint app/game/systems/pitContentAccessV1.ts tests/pit-content-access-v1.test.mjs
node_modules/.bin/tsc --noEmit --strict --target es2017 --lib esnext,dom,dom.iterable --module esnext --moduleResolution bundler --skipLibCheck --resolveJsonModule --esModuleInterop app/game/systems/pitContentAccessV1.ts
```

Le lot combinant logique de présentation, réducteur de sélection et accès a ensuite passé **54/54 tests ciblés**, avec la commande suivante :

```sh
node --experimental-strip-types --test tests/pit-selection-presentation-v1.test.mjs tests/pitSelectionFlow.test.ts tests/pit-content-access-v1.test.mjs tests/pit-save.test.mjs tests/pitHonors.test.ts
```

Le typage ciblé des deux composants et des deux modules, puis le lint ciblé, ont également terminé avec le code de sortie 0 :

```sh
./node_modules/.bin/tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --jsx react-jsx --esModuleInterop --resolveJsonModule --skipLibCheck --strict --lib esnext,dom,dom.iterable app/game/PitSelectionFlow.tsx app/game/PitHonorsPanel.tsx app/game/systems/pitSelectionPresentationV1.ts app/game/systems/pitContentAccessV1.ts node_modules/next/types/global.d.ts
npx eslint app/game/PitSelectionFlow.tsx app/game/PitHonorsPanel.tsx app/game/systems/pitSelectionPresentationV1.ts app/game/systems/pitContentAccessV1.ts tests/pit-selection-presentation-v1.test.mjs tests/pit-content-access-v1.test.mjs
```

Ces résultats vérifient la logique et le typage du périmètre nommé. Le typecheck global de référence s’est arrêté avec le code 137 dans la limite mémoire disponible ; il n’est pas validé. Aucun build de production global réussi n’est affirmé.

### Contrôle navigateur achevé

Le [rapport navigateur](QA_NAVIGATEUR_20261127.json) consigne **24/24 contrôles réussis**, les sept empreintes SHA-256 des sources applicatives vérifiées et les huit captures inspectées. Le [script reproductible](../../scripts/qa-pit-guide-extensions-v1.mjs) a lui-même été exécuté avec Chromium 158.0.8127.0 et Playwright. Il assemble les vrais composants `PitSelectionFlow`, `FighterCard` et `PitHonorsPanel`, leurs dépendances et les assets originaux ; seuls l’état React englobant, les callbacks et les sauvegardes de test appartiennent au banc de contrôle.

| Parcours | Résultat |
| --- | --- |
| Desktop 1 440 × 900 | Portraits réels, huit phases, clics, Entrée, flèches, Q/E, variantes et retours vérifiés |
| Mobile 390 × 844 | Aucun débordement horizontal mesuré ; contrôles accessibles, confirmation et retour réussis |
| Mouvement réduit | Animation de confirmation désactivée ; aperçu d’arène fixe à la frame 0 |
| Arène The PIT | Plans P0–P5 réellement rendus ; callback de départ après disponibilité vérifiée |
| Distinctions | 18 cartes scellées par défaut ; une récompense révélée dans une fixture Arcade canonique, 17 restant scellées |
| Sauvegarde | Filtrage et relecture sans changement de `localStorage` ; archive corrompue ou d’un autre propriétaire signalée |
| Pannes injectées | Portrait WebP indisponible distinct d’un verrou de progression ; arène indisponible bloquant le départ ; reprises réussies |
| Erreurs | Zéro exception JavaScript, zéro HTTP 404 ; trois erreurs réseau attendues provenant uniquement des pannes injectées |

Pour reproduire, installer les dépendances normales du dépôt, disposer d’un exécutable Chromium et des assets originaux requis, puis lancer :

```sh
PIT_QA_CHROMIUM=/chemin/vers/chromium PIT_QA_OUTPUT=/tmp/pit-qa-results node scripts/qa-pit-guide-extensions-v1.mjs
```

Le script accepte également `PIT_QA_REPO`, `PIT_QA_ASSETS` et `PIT_QA_CHROMIUM_ARGS_JSON`. Il n’installe aucun paquet et ne modifie aucune source. Les captures sont des preuves internes dont les noms et empreintes figurent dans le rapport ; elles ne sont pas de nouveaux assets du jeu.

Ce contrôle couvre un banc de composants réels et une seule arène complète. Il ne constitue ni un build Next, ni un test d’application déployée, ni une partie jouée, ni une certification exhaustive des 201 identités et 187 arènes. L’acquisition Arcade du scénario est une fixture explicite construite par `createPitSave` et huit appels à `applyPitResult` ; aucune victoire jouée dans le navigateur n’est revendiquée. Les tailles mobile/desktop sont des fenêtres Chromium, pas des appareils physiques.

L’import documentaire ne prétend pas réussir tous les cas des extensions. Tag, assistances de roster, super duo, finisher collectif, clashes/QTE, nouveaux bonus, galerie exploratoire et fournisseur de soutien restent conçus ou différés avec leurs dépendances dans la bible. Les taunts, entités natives, conclusions et parcours qui existaient déjà gardent leurs limites documentées.

## Prochaines actions sans recommencer

1. Lire la PR #195 et vérifier son état de fusion avant de poursuivre sur la bonne base ; les références ci-dessus prouvent la publication du lot, pas sa mise en production.
2. Reprendre le cycle de sélection et le lot artistique bloqué par leur manifeste, sans annoncer de candidats inexistants ni promouvoir une pose en clip complet.
3. Poursuivre les deux orientations des personnages prioritaires après revue des références exactes.
4. Construire le premier profil équipe dans une recette séparée avec un duo cohérent, en gardant contrôle, ressources, KO, propriétés et replays déterministes.
5. Ajouter un bonus complet et une récompense persistante à travers les systèmes existants avant d’étendre les quantités.

La prochaine session doit lire ce fichier, la matrice et les modifications effectivement fusionnées. Un numéro de PR ou une réussite de build ne suffit pas à déclarer le jeu, les 201 kits ou la fidélité visuelle achevés.
