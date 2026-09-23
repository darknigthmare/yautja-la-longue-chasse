# V45 — icônes légères du roster THE PIT

Les 177 identités fournies `user-*` affichent désormais une miniature de leur première apparence dans la case du roster. Les 18 personnages historiques/extension conservent leur présentation existante. Le catalogue reste donc à 195 cases ; les variantes restent regroupées sous leur identité.

Le menu ne télécharge plus les PNG pleine définition de ces 177 personnages pour leurs petites cases. Les illustrations choisies dans l’aperçu et en combat utilisent toujours les originaux V44 : aucune définition de combat, variante, progression ou animation n’est modifiée par ce lot.

## Fichiers et dérivation

- `app/game/data/pitRosterIconsV45.json` : catalogue des 177 miniatures, choix de variante, SHA-256 source et dérivé, dimensions et tailles.
- `app/game/pitRosterIcons.ts` : `getPitRosterIcon(fighterId)` retourne la miniature ou `null`, avec contrôle de propriété propre pour les identifiants inconnus.
- `public/game/sprites/v45/roster-icons/` : 177 WebP à encodage lossless après réduction proportionnelle ; aucun recadrage, miroir ou recoloration.
- `scripts/build-pit-roster-icons-v45.mjs` : reconstruction déterministe depuis le catalogue V44. `--check` régénère en mémoire et compare chaque octet, sans écriture.

Le cadre maximal mesure 128 × 192 px. 176 sources ont produit une miniature de 128 × 192 px ; la dernière mesure 128 × 154 px pour préserver son rapport d’aspect. Le terme lossless qualifie l’encodage WebP du rendu réduit ; les miniatures ne prétendent pas conserver la résolution initiale. Les PNG fournis restent inchangés et leur SHA-256 est vérifié avant et après chaque rendu.

## Mesure de transfert

Les 177 premières apparences représentent 420 990 650 octets en PNG source. Leurs miniatures représentent 4 753 040 octets, soit **98,87 % de données en moins pour ces cases**. La plus grosse miniature mesure 37 694 octets. Cette mesure ne concerne ni les portraits historiques ni les deux aperçus sélectionnés ni les décors. Aucune amélioration chiffrée du temps de chargement matériel n’est revendiquée.

Les images restent chargées paresseusement et décodées de façon asynchrone. Un échec de miniature garde le remplacement textuel existant sans télécharger silencieusement le PNG de plusieurs Mo. Au plus 24 cases restent montées à la fois.

## Vérification effectuée

- `node scripts/build-pit-roster-icons-v45.mjs --check` : PASS, 177 fichiers identiques à une nouvelle dérivation.
- `node --test --test-concurrency=1 tests/pit-roster-icons-v45.test.mjs tests/pit-user-selection-v44.test.mjs` : 8 tests PASS.
- ESLint ciblé sur le composant, le module, le générateur et les tests : PASS.
- Les tests décodent les 177 fichiers, comparent tous les SHA source et dérivé, vérifient le budget de taille et la transparence, puis comparent chaque pixel visible et alpha de trois silhouettes aux rendus réduits attendus.
- Le rendu React de toutes les pages vérifie que chaque case fournie référence sa WebP et n’inclut aucune URL PNG V44. Les variantes et les portraits historiques restent intacts. Cette vérification est un rendu SSR ciblé, pas une certification navigateur du lot complet.

La compilation, les contrôles navigateur réels et la publication sont suivis dans la livraison V45 globale.