# V77 — décision de livraison des rites, 3 octobre 2026

Les rites de chasse sont livrables comme **sous-ensemble fonctionnel**, pas comme la totalité de la conversation source. Le modèle, le runtime, le menu et la persistance sont intégrés dans les vraies sources. Dépecer et suspendre restent explicitement indisponibles. La correspondance visuelle/canonique 1:1 des outils, gestes et supports non produits n'est pas annoncée.

## Source et version contrôlées

La demande de référence est conservée dans `work-local/new-chat-20261003/ritual-6ac0654f.transcript.md`, depuis le partage `https://chatgpt.com/share/6ac0654f-d210-83ed-9f80-c7930a0a88b2`. Son texte constitue le besoin à satisfaire, pas une preuve que chaque capacité décrite existe dans le jeu.

Sources finales gelées :

- `app/game/HuntCanvas.tsx` : SHA256 `a2ba15e6c91b9b21c66f0b765d7aac7f4b7292ea5e0dd0a0a12a53a8d2fbd31c`.
- `app/game/HuntRitesMenuV77.module.css` : SHA256 `d72e54031036f81a31c492f808472f2d9048306f8abbb7c2629ce218928fc0c7`.
- `app/game/HuntRitesMenuV77.tsx`, `app/game/systems/ritesOfHuntV77.ts` et `app/game/systems/huntRitesRuntimeV77.ts` : intégrés ; aucune modification de GameSave/types/save par ce chantier.

Les empreintes Canvas et CSS ont été relues dans les fichiers le 3 octobre avant la baseline du candidat 4 ; elles restent identiques à celles du banc Canvas contrôlé final. Les captures plus anciennes des candidats précédents et leurs erreurs restent archivées ; elles ne sont pas réétiquetées comme résultat final.

## Décision par capacité

| Capacité | État et limite |
|---|---|
| Corps d'un ennemi ordinaire réellement vaincu | Intégré : identité exacte, chute native au sol, pose de mort issue de sheet existante ou silhouette sobre. Boss exclus de ce nouveau menu. |
| Menu contextuel qui ne met pas la chasse en pause | Intégré près d'un corps réel. Absence de corps = absence de menu. |
| Analyser, marquer, laisser, effacer | Intégrés ; durée, interruption aux dégâts cumulés ou à l'éloignement, pause qui fige le geste. |
| Persistance/reprise de corps et gestes | Intégrée au checkpoint existant ; propriétaire, mission/rencontre, acteur réellement mort, source, position et instant recoupés. Anciennes saves sans rites n'inventent aucun corps. |
| Témoins et réaction de peur | Intégrés pour témoins réellement présents/actifs avec orientation, portée, couverture et murs ; investigation de la dépouille sans connaître gratuitement le héros. Les valeurs chiffrées sont des règles originales du jeu. |
| Dépecer / suspendre | Verrouillés. Flaying Tool réellement acquis, supports authorés et animations dédiées manquants. Aucun accomplissement fictif ni callback de contournement. |
| Biographies des victimes, dégradation, météo, charognards, persistance après clôture de chasse | Non implémentés par ce lot. |
| Gains de trophées, rang, inventaire ou découvertes de bestiaire | Aucun nouveau gain attribué par les rites ; systèmes existants séparés. |

## Gates de preuve indépendants

1. **Sources / logique / SSR** : 12/12 contrôles de rites sur le vrai Canvas, 51/51 régressions ciblées, 6/6 accessibilité, TypeScript 0 et ESLint ciblé 0. Les chemins des sorties exactes figurent dans `docs/v77-rites-qa-2026-10-03.md`.
2. **Canvas dans navigateur contrôlé** : 11 scénarios et 11 captures réellement ouvertes, zéro erreur page/console/asset. Ce banc emploie explicitement des fixtures de placement/vulnérabilité sur des acteurs authorés et un vrai coup de mêlée. Il ne constitue pas une mission jouée depuis une nouvelle partie.
3. **Vrai GameClient candidat 4** : recette versionnée `scripts/verify-gameclient-baseline-v77.mjs`, SHA256 `a1bd0bedce1d8ee1242257d82460ce6a13186feb44447219b5fe203ad787a853`, output `work-local/v77/qa/baseline-final-candidate4-local`, serveur compilé 4198, identité `v77-candidate4-local`. Résultat **`PASS_REAL_GAMECLIENT_BASELINE` : 5 gates, 22 nouvelles captures réellement ouvertes, zéro erreur page/console/HTTP et zéro requête applicative non lecture**. La recette couvre la vraie création/reprise à froid du prologue puis un duel gagné au clavier, The Pit desktop/mobile, ainsi qu'un départ de chasse natif, pause/reprise, suspension et checkpoint vide de rites dans un contexte `defaultSave` isolé déclaré. Le claim de reprise conserve propriétaire/mission/rencontre/ledger et ouvre la chasse en pause. Elle ne prétend ni tuer une proie ni compléter un rite dans une mission réelle. Les rapports antérieurs `baseline-final-local` au port 4196 et `baseline-final-candidate3-local` au port 4197 restent historiques ; ils ne sont pas réemployés pour ce PASS.
4. **Publication** : commit/push, déploiement READY, HTTP public et baseline publique sont des gates séparés à collecter par le parent. Le runner accepte une release HTTPS avec `V77_BASELINE_QA_OUTPUT` distinct, en conservant un CDP local et des contextes isolés. Aucun compte du joueur ni sauvegarde privée n'est utilisé.

Une baseline publique passante pourra confirmer le chargement du vrai GameClient et son checkpoint natif sur cette URL. Elle ne transformera pas les onze fixtures Canvas en preuve de campagne complète. La manette, le handset physique, les sauvegardes de compte synchronisées et l'intégralité de la campagne restent hors de cette preuve.

Les trois essais antérieurs sont conservés dans `baseline-first-infra-fail` (esbuild bloqué par le sandbox), `baseline-second-pause-read-race` (snapshot lu avant le flag de pause) et `baseline-third-loading-selector` (sélecteur QA ambigu sur le texte de loading). Les deux derniers ont été résolus dans le banc par l'attente du vrai flag/assets et le ciblage du statut de loading, sans changer les sources applicatives gelées. Le rapport final ne réétiquette aucun de ces anciens FAIL. Le détail visuel et les réserves de la baseline figurent dans `docs/v77-gameclient-baseline-2026-10-03.md`.

## Réserves visuelles

Au point d'insertion du scénario contrôlé, la végétation de premier plan et une prise secondaire occultent une partie de la dépouille ; le registre et l'ancrage au sol restent présents. Le panneau mobile des rites a été remonté et agrandi, mais exige encore un défilement dans le petit Canvas. Le HUD général de la chasse conserve son cadrage précédent. Cette livraison n'est ni une refonte plein écran générale ni une complétude artistique de tous les rites.
