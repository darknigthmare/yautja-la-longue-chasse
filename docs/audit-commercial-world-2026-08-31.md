# Audit commercial — monde, progression et exploration

Date : 31 août 2026. Périmètre : campagne Yautja, topologie, progression, carte, objectifs, relais, fin de jeu et validation de niveaux. Ce document ne certifie ni une commercialisation autorisée de la franchise, ni un portage console, ni une durée de jeu mesurée. Il complète les audits contrôles/combat, sauvegarde et distribution.

## Conclusion de conception

Le contenu jouable comprend huit chasses de six secteurs chacune, des plateformes, des grimpes, des couvertures, des surfaces et des dangers spécifiques, une campagne à prérequis, des trophées, des améliorations d'arsenal, cinq sceaux de maîtrise par mission et une fin ouvrant Elder. Ce sont de vrais systèmes, pas seulement des écrans de présentation.

En revanche, le monde est encore constitué de huit parcours horizontaux de 8 400 px. Chaque parcours relie ses secteurs successifs ; le sol global reste continu et les compétences de déplacement ne déverrouillent pas progressivement de nouvelles zones. Le qualifier maintenant de metroidvania commercial complet serait inexact. La nouvelle carte de pause rend l'exploration lisible mais ne transforme pas la topologie.

## Constats classés

| Priorité | État vérifié | Preuve et conséquence | Suite nécessaire |
| --- | --- | --- | --- |
| P1 | Topologie metroidvania manquante | `worldScreens.ts:177` construit une chaîne, `:790` l'applique à toutes les missions, `:984` refuse les connexions non adjacentes. Les 48 secteurs ne forment ni boucles ni embranchements persistants entre régions. | Concevoir puis jouer une première région avec boucle, branche facultative, porte accessible depuis l'autre côté et retour après acquisition ; étendre seulement après validation. |
| P1 | Verrous de capacités non branchés | `systems/worldBlueprints.ts:144-158` définit `requirements`, `advantages` et `waypointIds`. Leurs consommateurs sont le catalogue et ses validateurs ; `HuntCanvas` ne les utilise pas pour autoriser un passage. Grimper, scanner et se camoufler sont déjà disponibles. | Des capacités nommées doivent modifier la simulation et ouvrir des passages identifiables. Aucun faux verrou n'a été ajouté à la carte. |
| P1 | Géométrie encore organisée comme une chasse latérale | `HuntCanvas` impose le sol à `state.world.floorY` pour tout x ; les plateformes utilisent une réception descendante. Les données actuelles sont toutes `one-way`. Le type `solid` du contrat n'est pas une implémentation de murs/plafonds. | Avant d'introduire des salles fermées, implémenter et tester murs, plafonds, passages, zones verticales et transitions sans perte d'état. |
| P1 | Carte de terrain absente à l'état initial — ajoutée dans ce lot | `ExplorationMap.tsx` et `systems/explorationMap.ts` exposent les vrais secteurs, les passages connus, la position et le pourcentage ; les noms non visités restent cachés. | Branchée dans la pause ; historique enregistré au checkpoint et à la suspension, connaissance conservée après mort. Cette carte décrit la chasse en cours ; elle n'est pas un atlas persistant de toute la campagne. |
| P1 | Secrets et retour sur anciennes régions non structurés | Pas de contrats dédiés pour secret collecté, capacité permanente, porte ouverte ou raccourci inter-région dans `types.ts`/le modèle de campagne inspecté. La collection existante est surtout trophées et découvertes d'ennemis. | Ajouter des secrets authored avec récompense unique, persistance, indice et raison de revenir. Vérifier les anciens saves et l'absence de récompense dupliquée. |
| P1 | Validation de niveaux trop permissive — corrigée | Les comparaisons `<`/`>` seules acceptaient NaN dans les collisions, les spawns et extractions n'étaient pas contrôlés ; un ID de route pouvait servir de faux waypoint. | Les validateurs et tests du lot rejettent désormais ces cas sans déplacer la géométrie publiée. Ce sont des garde-fous de production, pas une preuve automatique de franchissabilité. |
| P2 | Progression de campagne linéaire assumée | `data.ts` chaîne les huit `prerequisiteMissionId`. `save.ts/applyMissionResult` débloque la mission d'ordre suivant. Les prérequis actuels concordent, donc aucun softlock n'a été démontré ici. | Pour ouvrir des branches de campagne, remplacer explicitement l'hypothèse d'ordre par un graphe de prérequis, avec test de tous les états d'acquisition. |
| P2 | Longévité présente mais limitée à la reprise maîtrisée | `missionMastery.ts:37` calcule cinq sceaux cumulatifs ; la fin `GameClient` ouvre Elder ; trophées, rites et variantes d'ennemis soutiennent les relances. Pas de NG+ ou boss rush autonome repéré. | Prioriser les motifs d'exploration et rencontres facultatives avant d'ajouter des modes. NG+ et boss rush sont des choix de production, pas des cases obligatoires de tout jeu commercial. |
| P2 | Attribution de méthode de trophée déduite | `systems/progression.ts:558` attribue une méthode à partir de la mission/espèce en l'absence de télémétrie de coup final. Le rite « Arsenal maîtrisé » utilise ensuite ces méthodes. | Persister la véritable méthode de la prise ; conserver « inconnue » pour les archives sans preuve. Une inférence de contexte ne doit pas servir de mesure de maîtrise réelle. |
| P2 | Durée de campagne non validée par playtest | Les huit pars authored totalisent 116 minutes ; cela ne mesure ni la découverte, ni les échecs, ni le rythme réel. | Mesurer les premières parties et relances, temps bloqué, morts, abandon, économie d'honneur et accès aux améliorations avec de vrais joueurs. |

Aucun P0 de corruption de progression ou de softlock permanent n'a été démontré par les tests exécutés dans ce périmètre. Cela ne remplace pas une campagne intégralement parcourue en conditions de sortie.

## Ce qui est déjà en place et doit être conservé

- Placement des objectifs récupérables et relais hors dangers, avec marges explicites : `safeObjectiveGroundPositions` et `safeCheckpointPositions` dans `systems/worldBlueprints.ts`.
- Dangers cycliques avec avertissement distinct de la phase active : `hazardPhaseAt` et les tests d'objectifs.
- Difficultés avec deux, un ou zéro relais ; reprise de chasse et reprise au relais sont des contrats séparés. Les compteurs de ressources, objectifs et adversaires appartiennent au checkpoint runtime.
- Huit missions aux biomes distincts, combat d'Apex, extraction et débrief ; fin narrative après le Gardien et difficulté Elder débloquée.
- Trophées, atelier, présentation dans le vaisseau, rites, configurations d'équipement et entraînements. Ne pas les remplacer par un inventaire fictif.
- Déblocages d'arsenal à honneur et mission requis ; sceaux de maîtrise et progression de récompense sur les relances. Les sceaux sont volontairement cumulatifs, ce n'est pas un bug.

## Changements de ce lot

1. `worldScreens.ts` : valeurs finies, identités de features uniques à l'échelle de la mission, parallaxe valide, absence de doublon physique de connexion.
2. `systems/worldBlueprints.ts` : tailles et coordonnées finies, spawn/extraction/arène dans le monde, profils de vent et cycles de danger valides, réponses numériques non négatives, dismounts valides, waypoints obligatoirement physiques.
3. `systems/explorationMap.ts` : normalisation des données de visite, découverte au passage réel, calcul de carte borné, conservation de l'ordre authored, masquage des noms inconnus.
4. `ExplorationMap.tsx` : carte consultable en pause, repère du joueur, progression native accessible et liste lisible au lecteur d'écran. Aucune téléportation ou porte inventée.

Les validateurs ne changent pas les plateformes, les collisions ou les valeurs de difficulté existantes. Les huit blueprints actuels restent valides.

## Vérification exécutée

Commande ciblée :

```powershell
node --test --test-concurrency=1 tests/world-blueprint-validation.test.mjs tests/world-screens.test.mjs tests/exploration-map.test.mjs tests/objective-placement.test.mjs tests/mission-mastery.test.mjs
```

Résultat : **32 tests réussis, 0 échec**, dont rendu réel du composant React en HTML statique, limites de secteurs, reprise avec carte vide ancienne, noms cachés, huit cartes complètes, absence de mutation des huit blueprints, NaN/Infinity, fausses références et objectifs sûrs. ESLint ciblé : réussi après correction d'un nom de variable de test.

Ce contrôle React statique ne constitue pas un test interactif de navigation clavier/manette ni une preuve de rendu à toute résolution. Le branchement pause/reprise et l'historique ont également été contrôlés par `node --test tests/hunt-exploration-save-runtime.test.mjs` : **5 tests supplémentaires réussis**, exécutant les fonctions réelles de checkpoint, checksum et restauration. Le responsable de publication exécute les vérifications globales.

## Prochain lot metroidvania recommandé

La priorité est une région pilote jouable de bout en bout : insertion → bifurcation visible → acquisition de capacité → retour dans un secteur déjà visité → ouverture d'un passage réellement bloqué auparavant → récompense persistante → raccourci → Apex → extraction. Le hub et la carte doivent expliquer ce parcours sans imposer de longues consignes textuelles.

Critères d'acceptation : chemin principal franchissable sans farming imposé ; branche optionnelle réellement facultative ; portes et secrets conservés après mort/suspension/rechargement ; aucun verrou dont la capacité se trouve derrière lui ; retour possible depuis toute branche ; lecture correcte des collisions sur tous les plans ; contrôle clavier/manette à cadence de simulation variable ; playtest réel documenté. Cette région ne peut pas être remplacée par l'ajout de lignes dans un catalogue.
