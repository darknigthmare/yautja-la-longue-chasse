# V76 — Perspectives et densité du Homeworld

Vérifié le 2026-10-03T03:33:50.382Z. Source `fffa1105cefc77f3272774161b3a6362ddea15b9`, identique à GitHub main ; production `dpl_4H1AJEHLiVu1Kjm4fDtcakrFRTBd` READY avec alias confirmé : https://yautja-la-longue-chasse.vercel.app.

Six bâtiments existants ont désormais une vraie façade native oblique, trois vers la gauche et trois vers la droite. Leurs images ne sont ni retournées, ni tournées, ni étirées. Les appuis, seuils, ouvertures utiles et angles réels20–24° sont mesurés ; collisions, approche, dallage et codex suivent ces points. Le tri de façade suit le segment avant à l’abscisse du héros. Les13 anciens PNG V75 sont conservés.

Les implantations ajustées sont : dock-control (-110, 20) ; trophy-mausoleum (-240, -50) ; rite-sanctum (200, -60) ; convoy-workshop (120, -40) ; convoy-store (-20, -60) pour ouvrir les allées sans réduire les volumes. Les43 portes, intérieurs et IDs demeurent présents ; toutes les portes sont reliées par des routes réellement praticables. La cité garde sa taille globale ; six parvis et une liaison latérale agrandissent localement le terrain parcourable.

Quatre PNG de mobilier intérieur apportent92 objets solides dans les43pièces : banc oblique, établi opposé, rayonnage latéral et coffre diagonal. Les anciens meubles, partitions, services et prises liées à la sauvegarde restent conservés. Les nouvelles pièces sont placées individuellement, avec accès aux zones, stations et sorties avec le corps entier plus4unités.

L’extérieur ajoute74 modules dans14quartiers (70 solides,4 ornements). Quatre nouveaux PNG de jardinière, banc latéral, auvent diagonal et rack logistique sont utilisés séparément. Les98trajets civils, douze anciennes devantures réorientées, navette et dix raccords sont contrôlés. Le codex agrégé comporte2078fiches liées, sans récompense ou interaction ajoutée.

Les14nouveaux PNG et le kit de mobilier partagé sont préchargés/décodés avant les commandes. Une image manquante ou de mauvaises dimensions maintient la pause ; la reprise retente les mêmes URLs. Les builds portable et Next, TypeScript, ESLint (3avertissements historiques, zéro erreur), CSS compilé et2597/2597tests passent. Les16recettes passent en local puis en public ; les67PNG servis sont HTTP200/SHA identiques.

| Parcours public | Résultat | Contrôles | Captures |
|---|---|---:|---:|
| exterior-decor | PASS | 12 | 7 |
| scene-assets | PASS | 3 | 3 |
| interior-decor | PASS | 16 | 11 |
| angles | PASS | 9 | 15 |
| wayfinding | PASS | 10 | 14 |
| conversations | PASS | 3 | 7 |
| landscape | PASS | 15 | 14 |
| architecture | PASS | 18 | 17 |
| identity | PASS | 15 | 24 |
| youth-motion | PASS | 27 | 13 |
| civilian-motion | PASS | 14 | 4 |
| motion-assets | PASS | 3 | 3 |
| connections | PASS | 15 | 18 |
| prologue | PASS | 8 | 26 |
| shell | PASS | 71 | 2 |
| secondary-interiors | PASS | 42 | 40 |

Les rapports JSON sont conservés dans ce dossier ; les captures sont dans work-local/v76/qa. La relecture visuelle et ses limites sont consignées séparément.

## Limites

- Original lore-compatible city and civilian furniture, not a canon1:1 city or universal monarchy.
- Native PNG perspectives are visually guided drawings, not a mathematically calibrated 3D reconstruction; the accepted facade yaw is measured20–24degrees.
- Interior collision rectangles conservatively enclose measured native supports; exterior angled supports use actual quadrilateral SAT.
- V74 civilian gait remains PARTIAL_ART. This Homeworld lot does not complete every historical animation, arena or campaign request.
- Mobile browser coverage is Chrome emulation, not a physical low-memory device. The39 source set represents about234MiB decoded pixels in total, not measured JS heap.
- New physical scenery is decoded before controls; the existing retry label still says animations, while decor failures identify their PNG in French.
- Isolated played prerequisite saves and public keyboard/touch controls; no live user save is touched.
- Real login/signup/email and account multi-device synchronization are outside this lot.
