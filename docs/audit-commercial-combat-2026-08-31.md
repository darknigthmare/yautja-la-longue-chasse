# Audit combat, contrôles et reprise — 31 août 2026

## Périmètre et niveau de preuve

Lecture du code réel de `HuntCanvas.tsx`, `systems/huntSystems.ts` et `sound.ts`, puis correctifs et exécution de tests des fonctions utilisées par le jeu. La carte fournie dans `ExplorationMap.tsx` / `systems/explorationMap.ts` est intégrée au panneau pause et aux checkpoints de chasse.

Ce document ne constitue ni une certification commerciale, ni une partie jouée dans un navigateur ou sur une manette physique. Aucun benchmark FPS, test perceptuel audio, parcours complet des huit biomes ou validation d’un exécutable natif n’a été effectué dans ce périmètre.

## Défauts identifiés et corrigés

| Priorité | Constat avant modification | Correction et preuve |
| --- | --- | --- |
| P1 | Les projectiles ne testaient que leur position finale : une couverture fine pouvait être traversée entre deux pas. La première couverture du tableau pouvait absorber le tir avant un adversaire réellement situé devant elle. | Balayage du segment complet avec le rayon de la hitbox existante ; ordre spatial des impacts ; priorité de couverture à distance égale ; récupération des armes au point d’impact. `sweptProjectileImpactTime` et `updateProjectiles`. Neuf tests couvrent obstacles fins, diagonales, tirs hostiles, ordre des cibles, objets détruits et récupération. |
| P1 | Seul `getGamepads()[0]` était lu. Débrancher une manette ne mettait pas la chasse en pause. Start pouvait agir alors que le document n’avait plus le focus. | Sélection d’un slot réellement connecté, conservation du contrôleur actif, protection contre les refus de l’API, pause avant simulation à la perte de focus/déconnexion, retour obligatoire au neutre avant une nouvelle action. |
| P1 | Les dialogues pause et mort jetaient les actions A/haut/bas : réessayer ou choisir un bouton exigeait clavier/souris. | Navigation haut/bas et activation A dans le dialogue réellement ouvert ; focus DOM réutilisé ; aucune action sur une interface absente. Les dialogues terminaux ne sont plus « dépausés » par Start. |
| P1 | Après usage de la souris, LT pouvait conserver sa dernière position comme cible. | La visée assistée manette ne reprend plus ce pointeur périmé ; la visée souris conserve sa position exacte. Les neuf tests d’entrée exécutent le polling, la pause, les dialogues et la fonction de visée réels. |
| P1 | Un snapshot borné et muni d’un checksum pouvait encore contenir santé nulle, dimensions négatives ou éléments `null` dans les collections de combat ; la restauration les acceptait avant consommation par le runtime. | Validation physique supplémentaire du joueur/boss/ennemis et des projectiles ; contrôle des éléments des collections ; refus d’une reprise vivante à santé nulle. Neuf mutations invalides sont testées. Ce n’est pas un système antitriche ni une validation exhaustive de toutes les règles de campagne. |
| P2 | `startAmbience` pouvait terminer après `stopAmbience`, ou une ancienne demande asynchrone remplacer le lieu demandé ensuite. | Numéro de requête et invalidation lors de l’arrêt ; seules les demandes courantes installent une voix. Cinq tests vérifient arrêt, ordre inversé, doublons, retour au lieu actif, destruction et absence de navigateur. |

## Ajout visible : carte de la chasse

Le panneau pause affiche les secteurs réels, leur découverte, la position du chasseur et l’objectif. Aucun passage ni verrou d’aptitude fictif n’est ajouté. Les noms des secteurs non visités restent masqués par le composant de carte.

- `GameState` et l’instantané UI transportent les secteurs visités.
- Le checkpoint copie la liste sans partager sa référence ; la sérialisation conserve le format existant et son checksum.
- Les anciennes sauvegardes sans cette propriété restent compatibles et révèlent le secteur de reprise.
- Les identifiants étrangers ou inconnus sont filtrés.
- Un nouvel essai conserve les lieux déjà connus pendant cette chasse, y compris avant le premier relais.
- Une entrée de secteur est enregistrée avant un checkpoint capturé sur le même pas de simulation.
- Le panneau pause peut défiler sur les petits écrans ; ses boutons restent accessibles au clavier et à la manette.

La découverte reste attachée à la chasse et à sa reprise. Il n’existe pas encore de journal permanent de découverte partagé entre toutes les missions ou parties. Une disparition de la sauvegarde de chasse ne recrée pas artificiellement cet historique.

## Ce qui était déjà présent et a été conservé

La boucle utilise des pas fixes de 1/60 s et borne le delta reçu. La perte de focus et `visibilitychange` mettaient déjà le clavier en pause ; ce dispositif est conservé et complété pour la manette. Les dialogues ont déjà un piège de focus et rendent leur arrière-plan inerte. La reprise active reste en pause, sans les soins accordés à un retry. Les invulnérabilités, Second Wind, télégraphes, coûts d’armes, règles d’honneur et dégâts de zone n’ont pas été rééquilibrés.

Les suites existantes continuent de vérifier suspicion/recherche/coordination de l’IA, traces et odeurs, télégraphes d’attaque, identités des cinq armes, retour du Smart Disc, atténuation des dégâts de zone et mécaniques des boss. Cela vérifie leurs règles automatisables, pas leur intérêt sur plusieurs heures de jeu.

## Travail restant avant une sortie commerciale

| Priorité | Travail restant | Pourquoi ce n’est pas annoncé comme terminé |
| --- | --- | --- |
| P1 — validation | Parcours joués des huit biomes avec morts, retry, extraction, changements de périphérique et reprise après fermeture réelle. | Les tests actuels isolent la logique ; ils ne remplacent pas des sessions sur le rendu complet. |
| P1 — validation | Profiler les scènes les plus chargées et les sessions longues sur les machines ciblées, y compris allocation des projectiles, nombre de dessins, mémoire et audio. | Aucun budget mesuré CPU/GPU/FPS/latence de commande n’est disponible dans cet audit. |
| P2 — déplacement | Définir puis tester tolérance de saut après bordure, mémorisation d’un saut pressé juste avant l’atterrissage et hauteur de saut contrôlée. | Le saut actuel repose sur une impulsion fixe et un appui lorsque `grounded` est vrai ; ces aides de précision ne sont pas implémentées. |
| P2 — combat | Revue perceptuelle des portées, fenêtres actives de mêlée et silhouettes d’adversaires ; envisager hitboxes par animation, impact et interruption cohérents. | La mêlée résout immédiatement une zone de portée ; les collisions restent géométriques et ne suivent pas les pixels de chaque animation. Le balayage corrige la trajectoire, pas cette direction de combat. |
| P2 — manette | Remappage des boutons, visée manuelle au stick droit, réglage de zones mortes et retours haptiques adaptés aux périphériques ciblés. | Le mapping de chasse reste fixe et LT utilise la visée assistée. Le correctif permet la continuité de contrôle sans prétendre offrir un système complet de profils manette. |
| P2 — audio/accessibilité | Écoute des superpositions, du volume de confort et de la lisibilité des alertes avec différents équipements ; revue des effets visuels et besoins individuels. | Le moteur audio reste procédural et les contrôles techniques n’évaluent ni fatigue sonore ni perception des signaux. |

La collision continue rend certains tirs auparavant traversants correctement bloqués. Les zones physiques et statistiques restent inchangées, mais cette correction nécessite une revue de difficulté sur le jeu rendu.

## Vérifications exécutées

- **73/73 tests ciblés réussis**, dont **28 nouveaux tests** : neuf entrées/dialogues/visée, neuf projectiles, cinq carte/reprise, cinq audio.
- Les suites existantes combat/campagne/Gardien/reprise sont incluses dans ces 73 tests.
- ESLint ciblé et TypeScript sans émission exécutés avec succès pendant ce lot ; les gates globaux et leur résultat final relèvent du rapport de publication principal.
- Rapport de commandes : `outputs/qa-commercial-audit/combat-checks.log`, code de sortie `combat-checks.exit.txt = 0`.

Commande reproductible :

```powershell
node --test --test-concurrency=1 tests/hunt-input-runtime.test.mjs tests/hunt-projectile-runtime.test.mjs tests/hunt-exploration-save-runtime.test.mjs tests/sound-lifecycle.test.mjs tests/hunt-systems.test.mjs tests/hunt-campaign-runtime.test.mjs tests/guardian-adaptation.test.mjs tests/game-client-active-hunt.test.mjs
```

Aucun commit, push, déploiement ou build de production n’est revendiqué par ce rapport spécialisé.
