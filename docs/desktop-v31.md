# Édition PC 1.0.31 — livraison V31 qualifiée

Cette édition portable Windows x64 correspond au contenu V31 du commit source et runtime `c3f39e080197e639e10e68672101ad12ee394bd9`. Elle reste un jeu de fan non commercial, non signé et en développement. Le numéro 1.0.31 ne constitue ni une certification commerciale, ni une validation de campagne complète, ni une certification Steam Deck.

## Construction exécutée

La construction a été produite dans `tmp/desktop-release/v31/Yautja-La-Longue-Chasse-win32-x64/`. Le digest des sources est :

    ab468a19b161c3909cd45b259399b0bd4959c9ea9bcdcfd9698545d7340aa71c

Les éditions V25 et V29 restent dans leurs répertoires historiques ; la sortie V31 est isolée.

## Résultats desktop

| Élément | Résultat |
| --- | --- |
| Métadonnées 1.0.31 / V31 | PASS |
| Recette EXE | PASS — `2026-09-12T16:15:46.160Z` |
| EXE SHA-256 | `6459cd47f201c11965123cce7a7580f54f6199662fae3d421a3f04d946547c62` |
| Inspection `app.asar` | PASS — 2 132 entrées |
| `app.asar` SHA-256 | `fe31fc3ff906114583cc40647da5c14fffac173eee50774636d1fdf70a6333b6` |
| ZIP portable | PASS — 77 entrées |
| Taille du ZIP | 465 811 593 octets |
| ZIP SHA-256 | `c3c222f1a61cada9e04d0e812e72abfdbbb19198edc4a951bbbb3b0cfac97e1d` |
| Recette archive | PASS — `2026-09-12T16:16:48.992Z` |

Le ZIP qualifié se trouve dans `tmp/desktop-release/v31/Yautja-La-Longue-Chasse-PC-V31.zip`. La preuve suivie complète est [desktop-v31-qa.json](desktop-v31-qa.json).

## Publication Web distincte

Le déploiement `dpl_CLqvEZyH37nCWxLSnqMW5HmUNtjK` est `READY` sur [yautja-la-longue-chasse.vercel.app](https://yautja-la-longue-chasse.vercel.app), cible `production`, SHA Git `c3f39e0`. Cette publication Web ne signifie pas que le ZIP Windows est distribué publiquement.

## Limites

La recette automatisée valide le package et les parcours consignés. Elle ne certifie pas la cadence sur matériel cible, une manette physique, une session longue, un installateur, une signature, Steam Deck, une campagne commerciale complète ou les droits de commercialisation. Les 264 entrées d’animation manquantes restent une dette de production distincte.
