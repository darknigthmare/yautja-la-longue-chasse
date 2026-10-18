# THE PIT — suivi des tests V92 après approbation

Le 13 octobre 2026, le joueur a approuvé la proposition de 12 fichiers préparée lors du lot V92. Le patch exact, SHA256 `637255c4a780bb3e5aff49c04b327de075c0c8c6309a1186895e26888df62b6d`, a été appliqué sur `141901b`. Aucun fichier de production, PNG, définition historique de combattant ni fixture de replay n'est modifié par ce patch.

## Ce que les contrôles vérifient maintenant

- Les nouveaux enregistrements attendent moteur11, tout en conservant le conteneur de replay3 et les vraies anciennes fixtures. Les égalités de simulation, checksum, dégâts et restauration restent strictes.
- Les fixtures d'action et l'audit PNG demandent la définition réellement portée par leur état, via `getPitCombatFighterDefinition`. Un état Samurai dédié n'est plus comparé au contre générique du registre V91. Les identités de technique, propriétaire, variante, phase et orientation restent contrôlées.
- Le HUD vérifie son libellé mécanique dédié ou son libellé historique, et l'indisponibilité d'une technique demeure explicite.
- Les compteurs correspondent au corpus natif réellement lu : 19 identités, 26 apparences, 387 clips, 161 pages déclarées, 135 sources et 775 dessins. Les tests conservent `completeMovesets = 0` et `completeGameImplied = false`.
- L'ancien lot Ahab V45/V49 est identifié explicitement, avec son SHA strict, puis les douze phases V92 sont contrôlées séparément : propriétaire exact, deux dessins par phase, orientations originales et durées11/3/20 ou6/8/26.

La relecture indépendante conserve les 688 assertions textuelles de départ et ajoute six contrôles. Aucun cas ni skip n'est ajouté ou retiré. Les anciennes fixtures ne sont pas recalculées pour correspondre au moteur courant.

## Résultat borné

**160 tests passent sur 15 fichiers, sans échec ni test ignoré** : les onze fichiers de tests historiques modifiés, leur helper PNG et quatre suites voisines V91/V92. L'audit utilise les vrais fichiers PNG, pas seulement leurs noms. La première tentative a échoué sur les permissions de lecture d'esbuild ; elle est conservée séparément du résultat réussi obtenu avec l'accès aux dépendances du projet.

La suite complète de397 fichiers est relancée séparément. Son résultat n'est pas anticipé par ces160 réussites. Avant ce patch, la source V92 avait3 524 réussites et53 échecs sur3 577 tests :32 échecs Homeworld reproduits sur la baseline, un nouvel échec d'une ancienne assertion sans étages et20 échecs Pit visés par le patch. Leur classification ne les transformait pas en réussites.

Les journaux, SHA de conservation et résultats finaux restent dans `work-local/v92/qa/`, hors publication. La portée demeure un geste animé pour chacun des deux costumes masqués Ahab et Samurai : aucun de ces contrôles ne certifie tous les movesets, le roster complet ou la fidélité canonique1:1.
