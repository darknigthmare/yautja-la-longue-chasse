# PR62 : reprise nécessaire après la publication R7

Audit distant en lecture seule du 2 novembre 2026, avant fusion de la PR89. La tête relue de la [PR62](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/62) est `e4a6c64a1e77edad8865aa05ca7c2901d62bfa09`, base `main` à `f3a1acec8c2603b3442da774457dfe75947d97d8`. À cet instant ses huit workflows et Vercel réussissent ; GitHub la déclare sans conflit. Cela concerne son propre arbre, pas sa réunion avec R7.

Les apports distincts à reprendre sont l’atelier suspendable sans nouveau débit, les commandes remappées, les sorties accessibles, le guide contextuel, les tests de catalogue/repli, les qualifications navigateur/CPU et le classeur chasse de 21 onglets. La lecture de la logique pause/reprise et de sa persistance n’a pas identifié de défaut concret. Aucun nouveau test ni examen de PNG n’a été exécuté dans cet audit.

Trois incompatibilités empêchent de recommander une fusion directe après PR89 :

- `check-homeworld-publication-history-v112.mjs` exige sur les métadonnées courantes les blobs de la publication ancienne `a5ed39…`. Le gel attendu `e77d418…` diffère du blob R7 `66117020…`, SHA256 `c35f8b454ec26d1b05852cabbe4f6ee111d71e7413aef80282582d3ca5ee6a3e`. Les attentes sur l’inventaire et le registre diffèrent aussi. La comparaison des octets prouve cette incompatibilité ; le contrôleur n’a pas été exécuté contre l’arbre réuni.
- PR62 refuse le repère initial à `(6140, 5020)` et exige cinq admissions/cinq refus. R7 déplace le nouveau repère à `(6270, 4990)`, garde six admissions/quatre refus et protège 64 positions fixes/30 trajets réels. Les assertions de refus synthétique et les nouvelles réserves ne sont pas interchangeables.
- Douze chemins modifiés se recoupent et PR62 modifie 14 entrées du gel R7. Ses checks actuels ne certifient pas le produit résultant.

La suite consiste à reprendre les améliorations de chasse sur le R7 intégré, conserver les réserves et reçus réels, résoudre les variantes de projection et de Worker puis séparer correctement contrôle de publication historique et contrôle courant. Ce nouvel arbre devra avoir son gel, son build et ses preuves propres. Cet audit ne clôture aucune exigence Excel et n’autorise pas à recopier les certificats R7 sur un runtime modifié.
