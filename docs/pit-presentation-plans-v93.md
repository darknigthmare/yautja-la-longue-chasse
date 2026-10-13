# The Pit — catalogue des présentations V93

Ce catalogue fournit une commande de production pour chaque identité et chaque apparence effectivement sélectionnable. Il ne fournit pas 201 animations terminées et ne certifie aucun geste à l'identique d'une œuvre. La source de départ reste `bd88961`, fournie par le parent. Le relevé `v93-native-admission-11-pages`, daté du 13 octobre 2026 dans `auditedAt`, ajoute la mesure des onze feuilles V93 effectivement admises, sans remplacer la preuve historique.

## Périmètre mesuré

| Élément | Quantité au relevé |
| --- | ---: |
| Définitions de combattants réellement présentes | 201 |
| Variantes utilisateur explicites | 416 |
| Corps historiques sans variante explicite | 21 |
| Apparences distinctes à traiter | 437 |
| Plans par identité, six catégories | 1 206 |
| Catégories/orientations demandées, toutes apparences | 5 244 |
| Définitions d'atlas présentes | 76 |
| Clips présents, actions de combat comprises | 409 |
| Pages déclarées / fichiers PNG distincts | 172 / 146 |
| Dessins RGBA distincts mesurés sur ces pages | 841 |

Les 841 dessins concernent l'ensemble des clips, pas 841 nouvelles présentations. La lecture des vrais PNG, la préparation de leur transparence par le même traitement que le jeu et les empreintes RGBA des cellules donnent zéro fichier absent, zéro rectangle hors image et zéro dessin touchant le bord de sa cellule. Ces contrôles n'attestent ni l'anatomie, ni la qualité du mouvement, ni une correspondance canonique ; aucune nouvelle revue anatomique des 416 images importées n'est revendiquée.

`historicalSnapshot` conserve séparément les 65 déclarations d'atlas complètes, leurs 387 clips et les SHA des 135 PNG de départ. Ce premier relevé portait sur 161 pages déclarées et 775 dessins RGBA distincts. La régénération compare les 65 déclarations intégrales, les 416 variantes et chaque SHA historique avant d'écrire le nouveau catalogue ; les anciens rapports privés ne sont pas écrasés. Les tests relisent à nouveau ces 135 fichiers, en plus des onze nouveaux PNG.

Au relevé actualisé, 5 162 catégories/orientations manquent, 78 possèdent un cycle natif partiel et quatre seulement une pose tenue. Aucun clip présent dans ce relevé ne reste sans mesure pixel, mais aucun cycle détaillé n'est certifié complet. 173 identités demandent encore une référence primaire d'identité ; les créations originales du projet n'ont pas à recevoir une fausse attribution officielle.

| Catégorie | Identifiant natif | Orientations manquantes | Cycles partiels | Poses tenues |
| --- | --- | ---: | ---: | ---: |
| Attente | `idle` | 826 | 44 | 4 |
| Introduction | `pit.presentation.intro` | 868 | 6 | 0 |
| Victoire de manche | `pit.presentation.victory` | 868 | 6 | 0 |
| Défaite de manche | `pit.presentation.defeat` | 868 | 6 | 0 |
| Attente étourdie de fatalité | `pit.presentation.dizzy` | 866 | 8 | 0 |
| Provocation | `pit.presentation.taunt` | 866 | 8 | 0 |

Une apparence choisie ne récupère pas l'animation d'un autre masque ou du corps historique. Ainsi Scar et City Hunter masqués conservent chacun leurs trois cérémonies historiques de trois dessins par orientation et disposent maintenant de leur propre idle, vertige et provocation V93, également de trois dessins par côté. Leurs anciens idles de corps `variantId: null` ne sont toujours pas transférés au costume masqué. Celtic masqué n'a pas de cérémonie dédiée. La pose finale de duel Jungle Hunter n'est pas un cycle animé.

## Commandes de production

Le JSON conserve les 201 identités, leurs apparences, références exactes, archives d'origine, règles d'anatomie et d'équipement, limites des sources, plans et recettes mesurées. Les paramètres ci-dessous sont des objectifs de production V93 ; ils ne réécrivent aucun timing du moteur ou des anciens clips.

| Plan fonctionnel | Boucle | Objectif de durée à 60 Hz | Dessins distincts minimum | Sortie attendue |
| --- | --- | ---: | ---: | --- |
| `idle` | Oui | 120 ticks | 8 | Raccord à la garde, pieds ancrés |
| `intro` | Non | 90 ticks | 12 | Garde prête, aucun coup ou équipement ajouté |
| `round-victory` | Non | 120 ticks | 12 | Pose vivante, aucun trophée matérialisé |
| `round-defeat` | Non | 96 ticks | 12 | Défaite de manche non létale |
| `finisher-stunned` | Oui | 120 ticks | 8 | Oscillation debout distincte du hitstun |
| `taunt` | Non | 90 ticks | 12 | Retour à la garde, aucune hitbox |

Les étapes de chaque plan sont explicites dans `categories[].keyPoses`. Ne pas transformer huit poses en huit dessins distincts par répétition, interpolation ou miroir. Les douze étapes d'introduction conduisent la silhouette initiale à la garde par le regard, les appuis, le bassin et les avant-bras ; les douze de défaite abaissent le centre et stabilisent le perdant sans annoncer sa mort. Le vertige a sa boucle autonome ; la provocation conserve la prise et revient à l'attente.

La provocation native est une présentation cosmétique volontaire pendant le combat. Le jeu et l'adversaire continuent normalement : aucun étourdissement, dégât, ressource, changement de collision ou invulnérabilité n'est ajouté. Un mouvement, une garde, une action ou un dégât réel interrompt le geste du joueur concerné. Pendant la fenêtre finale de KO, seul le vainqueur réel peut provoquer ; le perdant conserve sa boucle étourdie propre à cette fenêtre et son horloge indépendante. Une provocation en combat ne transforme jamais l'adversaire en perdant ou en combattant étourdi. Le chargement d'un clip natif du costume et du côté exact reste nécessaire ; un idle réutilisé ne débloque pas cette commande.

Neuf familles de mise en scène organisent ce travail : observation, poursuite urbaine, garde de duel, présence lourde, veille du pisteur, garde humaine, présence d'ancien, équipement à prise contrôlée et attribution non vérifiée. Ces familles sont des modèles de conception partagés ; elles ne constituent pas 201 chorégraphies individuelles déjà dessinées ou documentées dans les œuvres. Chaque identité conserve ses propres références et contraintes, et chaque apparence garde sa source visuelle distincte.

Les règles communes interdisent de faire apparaître une arme cachée, un masque retiré, un compagnon, un drone, un pouvoir, un trophée, un dialogue ou un rite déduit du nom. Les prises, doigts, attaches des dreadlocks et armes restent continus. Les deux orientations doivent être dessinées séparément. Une référence de taille debout est commune à la famille de source : on ne redimensionne pas chaque pose penchée pour remplir sa cellule. Les pivots au sol doivent être mesurés. Machiko et Theta restent anatomiquement humaines, même dans une armure yautja.

## API consommable

`app/game/systems/pitPresentationPlansV93.ts` expose :

```ts
getPitPresentationPlanV93(fighterId, category, variantId)
getPitPresentationProductionQueueV93(fighterIds?)
auditPitPresentationPlansV93()
```

La première fonction retourne l'identité, l'apparence, le plan, la catégorie, la famille, les sources, les règles et les couvertures séparées `left`/`right`. Une identité, catégorie ou variante étrangère retourne `null`. `undefined` sélectionne la référence par défaut propre à l'identité ; `null` signifie explicitement le corps historique et n'emprunte jamais le costume utilisateur.

```ts
const plan = getPitPresentationPlanV93(
  'scar', 'finisher-stunned', 'scar-avec-casque-6a0a69930d',
);
// plan.category.clipId === 'pit.presentation.dizzy'
// Chaque plan.facings[i] concerne exclusivement ce costume et cette orientation.
```

La file de production contient une entrée par apparence, catégorie et orientation. Elle indique la tâche restante, les dessins distincts réellement mesurés ou `null`, le minimum demandé, les références visuelles et les sources. Elle ne constitue ni une liste de PNG installés ni une autorisation de mouvement.

| Statut | Signification |
| --- | --- |
| `missing` | Aucun clip natif validé déclaré pour ce propriétaire, costume, rôle et côté |
| `held-only` | Pose tenue ou un seul dessin, pas une animation complète |
| `partial-native` | Clip mesuré, historique ou V93, sous l'objectif de dessins distincts |
| `pixel-review-required` | Clip nouveau ou modifié sans preuve pixel dans ce relevé |
| `detailed-native-pending-visual-review` | Objectif numérique atteint, anatomie/mouvement/lore encore à examiner |

Une déclaration nouvelle ne récupère jamais la preuve d'un ancien atlas : rectangle, pivot, durée, fichier, dimensions et traitement de transparence doivent tous correspondre au relevé. Les tests vérifient aussi le SHA des fichiers historiques. Les noms d'API existants `filesPresentAtBaselineAudit`, `rectsValidAtBaselineAudit` et `baselineRegisteredClips` restent conservés pour leurs consommateurs ; ils concernent désormais le relevé identifié par `sourceSnapshot` et `auditedAt`, pas un chargement réussi à l'instant. Le module ne tente pas de lire le disque côté client et ne constitue pas une admission visuelle des onze feuilles V93 : leur admission reste indépendante. Les métadonnées sont gelées et les API ne modifient aucun registre, sauvegarde, replay ou mouvement.

## Références et limite de fidélité

Les pages d'œuvres officielles identifient les personnages ou leur contexte ; elles ne documentent pas automatiquement chacune des six animations. La vérification du 13 octobre 2026 porte notamment sur [Predator](https://www.20thcenturystudios.com/movies/predator), [Predators](https://www.20thcenturystudios.com/movies/predators), [Alien vs Predator](https://www.20thcenturystudios.com/movies/alien-vs-predator), [AVP: Requiem](https://www.20thcenturystudios.com/movies/aliens-vs-predator-requiem) et [Prey](https://www.20thcenturystudios.com/movies/prey). Les gestes proposés restent des adaptations de jeu.

| Référence primaire | Ce qu'elle soutient | Ce qu'elle ne certifie pas |
| --- | --- | --- |
| [Samurai PHG, billet du développeur](https://blog.fr.playstation.com/2020/06/30/le-predator-samourai-rejoint-predator-hunting-grounds/) | Identité Samurai PHG et katana ; à distinguer d'Oni | Ses intros, victoires, défaites, vertiges et provocations exactes |
| [Valkyrie PHG, billet du développeur](https://blog.playstation.com/2021/02/16/new-year-new-mode-new-content-for-predator-hunting-grounds/) | Marteau tenu à deux mains et description de son attaque lourde | Une cérémonie de présentation entière |
| [Ahab, figurine NECA sous licence](https://store.necaonline.com/blogs/news/shipping-this-week-ultimate-ahab-ultimate-dream-sequence-jason-and-chucky-thanos-groot-head-knockers-1) | Accessoires de la figurine et apparence de cette version | Timings V92 ou geste animé issu du comic |
| [Scarface, figurine NECA sous licence](https://store.necaonline.com/blogs/behind-the-scenes/closer-look-video-game-appearance-ultimate-scarface-predator) | Apparence/accessoires de cette incarnation de jeu | Toutes les poses et animations du jeu source |
| [Enforcer, figurine NECA sous licence](https://store.necaonline.com/blogs/behind-the-scenes/closer-look-enforcer-predator-action-figure-from-series-12) | Apparence de cette figurine | Une chorégraphie de comic |
| [Machiko, recueil Dark Horse](https://digital.darkhorse.com/books/9bb496a44e944fcda26662b44db247be/aliens-vs-predator-the-essential-comics-volume-1) | Identité humaine et récit concerné | Tous les costumes ou mouvements exacts |
| [Theta, fiche Marvel](https://www.marvel.com/comics/collection/110461/) | Attribution éditoriale, via extrait de recherche primaire accessible | Une page entièrement lue ou des cycles animés |
| [Badlands, galerie officielle](https://www.20thcenturystudios.com/movies/predator-badlands) | Dek/Kwei nommés ; affiche de Dek à genou tenant une épée | Une introduction animée ou l'ajout automatique de cette arme au costume sélectionné |

Le catalogue distingue `primary-page-read`, `primary-search-excerpt` et `inherited-local-dossier`. Une source seulement héritée n'est pas présentée comme relue ce jour. La pose de Dek porte `documented-static-pose-only` avec sa limite et ne vaut que pour une apparence concordante vérifiée séparément. Aucun wiki n'est utilisé pour certifier un geste à l'identique. Tous les plans gardent `documentedGesture: false`, `fidelity: gameplay-adaptation` et `oneToOneCertified: false`.

## Feuilles admises et travail restant

Les onze feuilles mesurées apportent : Jungle Hunter masqué, idle/vertige/provocation ; Scar masqué, idle/vertige/provocation ; City Hunter masqué, idle/vertige/provocation ; Wolf masqué, vertige/provocation. Chaque feuille contient trois dessins pour la droite et trois dessins indépendants pour la gauche, soit 22 clips et 66 dessins nouveaux. Les objectifs détaillés restent de huit dessins pour l'attente ou le vertige et douze pour les autres catégories. L'anatomie n'est pas déclarée relue par ce catalogue et aucun costume n'est annoncé complet.

Wolf masqué `wolf-avec-casque-4261aca172` possède son idle historique de deux dessins par côté, mais ses introductions, victoires et défaites dédiées restent absentes. Pour poursuivre, produire ces trois cérémonies puis développer les cycles partiels des quatre costumes concernés. Ahab masqué `ahab-avec-casque-0c8ceb1c95` possède un idle dédié de deux dessins par côté et garde ses cinq autres catégories à produire. La main de City Hunter signalée par le joueur demeure un point de contrôle visuel à chaque nouvelle admission ; la mesure SHA/RGBA ne résout pas une anomalie anatomique. Les références exactes sont dans `appearance.referenceSprites` ; aucune apparence humaine n'est réutilisée pour ces chasseurs.

## Validation bornée

Les neuf cas de `tests/pit-presentation-plans-v93.test.mjs` passent sur le relevé actualisé. Ils comparent réellement les identités et variantes aux consommateurs du jeu, relisent les 146 PNG dont les 135 originaux, vérifient SHA/rectangles/pivots/durées et l'empreinte des 65 déclarations historiques complètes, puis contrôlent les six plans, les 22 nouveaux clips partiels, la file exhaustive et le gel des données. Les cas isolent notamment Scar/City masqués dans les registres ancien et actuel, l'idle Ahab, la pose tenue Jungle Hunter, les humaines, une variante étrangère et une nouvelle déclaration sans preuve pixel. Aucun test historique extérieur à ce nouveau catalogue n'est modifié par le rafraîchissement.

Les mesures détaillées et la recherche restent dans `work-local/v93/catalog/`. Le suffixe `-v93-native-refresh` distingue les nouveaux rapports des preuves originales conservées. Les tests ne remplacent pas la revue visuelle des nouvelles feuilles, le contrôle de leurs mains et pieds au rendu réel, ni une validation du cycle sur écran. La certification détaillée et canonique demeure à zéro dans ce catalogue actualisé.
