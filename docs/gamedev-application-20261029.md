# Application des guides gamedev — 29 octobre 2026

## Périmètre

Première application du [guide du projet](GAMEDEV_AGENT_GUIDE.md) à des défauts
reproduits dans le code de production. Base :
`14f39339ed83eeb953930e9a619dfd6577dbe2c3`, branche de la PR #25.
Cette livraison ajoute deux corrections de logique et deux suites de régression.
Elle ne déclare pas une nouvelle version globale du jeu.

## 1. Sauvegardes de guerre de clans : valider les types réellement utilisés

**Guide appliqué :** `save-systems`, avec les contrats existants de session et de
génération procédurale.

`readWarSimulationV85` vérifiait plusieurs champs après conversion avec `String`,
puis conservait leur valeur originale. Un tableau JSON tel que `status: ["fit"]`
ou `territoryId: ["CON-T01"]` pouvait donc passer la validation alors que les
comparaisons strictes du jeu ne le reconnaissaient pas. La reproduction exécutée
avec un état de production faisait passer une garnison de **1 garde à 0** après
chargement. Une version objet contenant un `toString` non appelable provoquait
aussi une exception avant le contrôle de son type.

La validation exige désormais des chaînes pour les statuts, types d'ordre,
objectifs et identifiants territoriaux concernés, et une version numérique avant
le contrôle des versions autorisées. Les tableaux/objets incompatibles sont
refusés. Le mécanisme de session existant conserve alors les octets de l'archive
endommagée ; un exercice en mémoire ne la remplace pas implicitement. Une mise à
jour invalide conserve aussi l'état jouable et la sauvegarde précédents.

Les régressions utilisent Korthas, un monde V102 et un monde V103. Elles couvrent
la réouverture indépendante, un ordre de reconnaissance réel résolu après
rechargement, les anciens champs facultatifs, les marqueurs à zéro et le contrat
V1/V2 des convois. Les générateurs, graines, recettes et identités des mondes ne
sont pas modifiés.

**Avant correction :** la première suite reproduisait 9 échecs sur 12 cas ; le cas
supplémentaire de version objet échouait également. **Suite finale : 14/14.**

## 2. Sprites Homeworld : conserver chaque contrat de dimensions

**Guide appliqué :** `create-game-assets`, pour la conformité technique des
ressources au chargement.

Le collecteur de `useHomeworldMotionAssetsV74` dédupliquait les déclarations par
URL seulement. Une déclaration correcte placée après une déclaration de dimensions
incorrectes masquait cette dernière, permettant au lot de devenir prêt malgré le
contrat incompatible d'un consommateur.

La clé de déduplication inclut désormais URL, largeur, hauteur et rôle scène ou
animation. Deux contrats identiques partagent toujours un chargement. Des contrats
contradictoires sont tous vérifiés et maintiennent le lot non prêt si l'un échoue,
quel que soit leur ordre. La relance utilise toujours les URL exactes du rendu.

**Avant correction : 3 échecs sur 5 cas. Après correction : 5/5.** Les tests de
régression utilisent des dimensions de décodeur contrôlées et le vrai chargeur.
Les tests existants du chargeur Homeworld lisent également les dimensions des
24 PNG natifs sélectionnés. Aucune incohérence d'un PNG de production ni aucune
validation artistique nouvelle n'est affirmée.

## Vérification finale

| Suite | Résultat final |
| --- | --- |
| `planet-archive-validation-v103.test.mjs` | 14/14 |
| `homeworld-motion-source-contracts-v113.test.mjs` | 5/5 |
| `native-image-preload-v94.test.mjs` | 17/17 |
| `homeworld-motion-assets-v74.test.mjs` | 8/8 |
| **Total du passage final** | **44/44 ; aucun échec, aucun test ignoré** |

Commande exécutée :

```bash
node --experimental-strip-types --test --test-isolation=none --test-concurrency=1 --test-reporter=spec \
  tests/planet-archive-validation-v103.test.mjs \
  tests/homeworld-motion-source-contracts-v113.test.mjs \
  tests/native-image-preload-v94.test.mjs \
  tests/homeworld-motion-assets-v74.test.mjs
```

La [trace du passage final](qa/gamedev-application-20261029/final-tests.log)
conserve les noms et résultats individuels.

Un passage préalable a réussi **51/51** contrôles sur les archives, l'intégration
V103, le générateur V103, les convois V105 et les sessions V85. Il comprenait les
12 premiers cas de la nouvelle suite : il ne faut donc pas additionner 51 et 44
comme s'il s'agissait de tests distincts. Ce passage vérifiait notamment les
empreintes publiées des mondes V103 et les archives historiques des convois. Les
contrôles géographiques n'ont pas été répétés après la dernière modification du
seul contrôle de type de version ; les 14 cas finaux l'ont bien été.

Vérification TypeScript stricte réussie sur les deux modules et leurs imports :

```bash
node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target es2022 \
  --module esnext --moduleResolution bundler --resolveJsonModule --esModuleInterop \
  --jsx react-jsx --lib es2022,dom \
  app/game/useHomeworldMotionAssetsV74.ts app/game/systems/clanWarV85.ts
```

`git diff --check` a également réussi. Environnement de vérification : Node
24.22.1, TypeScript 5.9.3, esbuild 0.25.12 et React 19.2.8. Les dépendances et le
verrou de versions du dépôt n'ont pas été modifiés.

## Identité du code vérifié

Les empreintes portent sur les fichiers de production et de test du passage
final, avant l'ajout de ce compte rendu documentaire.

| Fichier | SHA-256 |
| --- | --- |
| `app/game/systems/clanWarV85.ts` | `b8d785eb51b064e3c40b873719d6759b661e014826c58ce3f169e4f68136b945` |
| `app/game/useHomeworldMotionAssetsV74.ts` | `b3654458386074c70dda6811428016ba087bccdc080aca123546c7b9a9853f5c` |
| `tests/planet-archive-validation-v103.test.mjs` | `e93a158230898d6f9f7076b9294f77308612b01e489bc7adab62e2ae7c099f17` |
| `tests/homeworld-motion-source-contracts-v113.test.mjs` | `c8d43ad3a66edacd767af2f1d95d013e7c170496ad5b2b2f23efb0b8bd7c5ce4` |

## Portée des résultats

Une revue indépendante du code et des scénarios de régression n'a relevé aucun
point bloquant. Le contrôle Homeworld a retrouvé les enveloppes d'usage et les
contraintes de navigation existantes ; aucun défaut de placement suffisamment
reproduit n'a justifié une modification de géométrie dans ce lot.

Les vérifications ci-dessus sont des tests de logique, de chargement avec
décodeur contrôlé et de rendu serveur dans les tests existants. Elles ne valent
pas parcours navigateur complet, revue artistique, mesure de FPS, build complet
ou qualification commerciale du jeu. Les preuves et statuts artistiques
historiques sont conservés.
