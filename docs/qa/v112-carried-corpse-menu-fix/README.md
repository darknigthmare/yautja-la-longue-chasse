# Dépose de la carcasse portée — régression native séparée

Quand deux corps se superposent, le portage déplace le corps tenu devant le chasseur. L’autre corps peut alors devenir plus proche et remplacer la cible du menu. Le bouton « Déposer la carcasse » disparaissait alors que le portage restait actif. Le [rapport géométrique antérieur](../v112-ground-deposit-composition/operator-report.json) conserve ce contre-exemple construit dans son contexte de source initial ; il n’est pas réécrit.

`huntRiteMenuSnapshotV77` conserve désormais la carcasse portée comme cible prioritaire si elle est préparée, non effacée, non suspendue, physiquement valide et à la portée native de 88 pixels. Il réutilise `nearestRiteCorpseV77` pour cette portée. Si le corps ne satisfait pas ces conditions, la sélection du corps le plus proche reste le comportement de repli. Aucune portée, physique, récompense ou condition d’action n’est élargie.

Le [rapport de régression](native-report.json) contient vingt cas. La fixture admet deux acteurs natifs et un outil, puis utilise la mise à mort, la préparation et le callback de portage du moteur. Le vrai composant `HuntRitesMenuV77` est rendu côté serveur ; le bouton de dépose est présent et actif. Le callback de production, extrait tel quel par AST, dépose ensuite le corps. Tous les autres champs du checkpoint, les acteurs, le stock, la provenance, les reçus d’usure et les objectifs restent identiques. La sélection est également testée sur un registre profondément gelé.

Les cas invalides couvrent identité absente, effacement, suspension, ancrage incohérent, préparation manquante, masse nulle/excessive/non finie, position non finie et acteur invalide. La frontière de 88 pixels, la sortie de portée horizontale et verticale, le champ de masse legacy et l’indisponibilité du menu sont vérifiés. Ce sont des tests natifs construits, pas de nouvelles campagnes ni un parcours GameClient monté dans un navigateur.

Commandes exécutées avec Node 24.19.0, code 0 :

```sh
YAUTJA_CARCASS_MENU_QA_REPORT=docs/qa/v112-carried-corpse-menu-fix/native-report.json node --experimental-strip-types --test tests/hunt-carried-corpse-menu-v112.test.mjs
node --experimental-strip-types --test --test-concurrency=1 tests/hunt-carried-corpse-menu-v112.test.mjs tests/field-tools-rites-v111.test.mjs tests/hunt-field-stash-runtime-v112.test.mjs tests/hunt-field-load-v112.test.mjs tests/hunt-carcass-runtime-v112.test.mjs
node_modules/.bin/eslint app/game/systems/huntRitesRuntimeV77.ts tests/hunt-carried-corpse-menu-v112.test.mjs
```

Le changement porte uniquement sur la cible du menu, sans modification de styles. La revue indépendante de rendu_fidelite n’a relevé aucun blocage : garde de portée conservée, repli classique, registre non muté et fixtures explicitement distinctes des campagnes. `npm run typecheck` repasse avec code 0 après le renommage, par son propriétaire, d’un snapshot documentaire `.ts` en `.ts.txt`. Aucune qualification du repli terrestre avec charge maintenue, de matériel physique ou de compréhension humaine n’est ajoutée par ce correctif.
