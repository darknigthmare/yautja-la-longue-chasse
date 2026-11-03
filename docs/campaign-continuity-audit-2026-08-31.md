# Audit de continuité de campagne — 31 août 2026

Périmètre : campagne existante de **Yautja : La Longue Chasse**, comparée aux identités demandées dans le brief partagé. Audit du code et tests exécutés sur cette copie de travail. Les huit missions existent et la chaîne de progression est cohérente. Cela ne signifie pas que toutes les descriptions du bestiaire et des phases sont simulées.

Source du brief : https://chatgpt.com/share/6a953a3a-3580-83eb-b024-13aaa284e2e2. Les noms et les comportements détaillés ci-dessous sont confrontés aux données du projet, pas présentés comme des faits du canon officiel Predator. Les instructions Unreal/SNL du contexte ne changent pas ce projet web existant.

## Matrice des huit missions

| Mission | Comportement effectivement branché | Limites par rapport au brief | Références |
| --- | --- | --- | --- |
| **Oseris-IV — Vey** | Trois traces, récupération du transpondeur, boss puis trophée/extraction. IA régulière avec couverture, suspicion, recherche et partage de contact entre alliés. Vey possède quatre fusées, camouflage de boue après perte de ligne de vue, deux renforts à 65 % de vie, attaque au couteau et vulnérabilité accrue à 30 %. | Le scan n'explique pas précisément la contre-mesure observée. Les fusées ont un effet de révélation immédiat lors de leur décision, pas un vrai halo persistant placé dans le monde. La suppression est surtout traduite par projectile et secousse. Le roster endémique est choisi par le deck V8; le seul nom d'une vague ne garantit pas sa composition humaine. | `data.ts:538`, `huntSystems.ts:1725` (`stepVey`), `HuntCanvas.tsx:6923` (`updateRegularEnemy`), `spawnEligibleWaves`, `updateBoss`. |
| **Nivalis-K — Cryostalker** | Trois traces et quatre éliminations avant l'Alpha. Trois plaques réellement cassables par charge contre les piliers du niveau; chaque plaque augmente les dégâts reçus. Appel de meute à 55 %, visibilité thermique faible et état enfoui, phase exposée à 22 %, glace tombante. | Les traces dites bioélectriques sont des points de scan génériques; aucun calibrage spectral spécifique n'est requis. L'état enfoui modifie mouvement/visibilité, mais ne constitue pas un réseau de tunnels ni un effondrement destructible de toute la caverne. | `data.ts:769`, `huntSystems.ts:1831` (`stepCryostalker`), fin de `HuntCanvas.tsx/updateBoss` : collision avec `i-pillar-*`. |
| **Cinder-12 — Bad Blood** | Rival Yautja, alternance disque/plasma et camouflage; duel à 58 % avec verrouillage des armes énergétiques et sanction des tirs à distance. Purge à 18 %, délai de 45 s, trois consoles distinctes, trophée bloqué tant que la purge menace la prise. La purge continue même si le rival est déjà mort. | Les arènes et sanctions existent. La narration de duel est plus riche que la locomotion 2D actuelle; pas de nouvelle simulation complète de duel rapproché ni de destruction géométrique du sanctuaire. | `data.ts:994`, `huntSystems.ts:1941` (`stepBadBlood`), `HuntCanvas.tsx/interact`, début de `updateBoss`. |
| **Naraka-Delta — Hydre** | Sols boue/eau, racines et dangers de marée, scan/éliminations/capsules, charge/coup de queue/projectile. À l'entrée des phases 2 et 3, marée qui retire de l'endurance, pousse et révèle le camouflage; hauteur suffisante ou couverture protège de cet effet. | Les trois gueules ne sont pas trois menaces indépendantes. Pas de véritable variation du niveau de l'eau, réseau de chenaux navigable ou embuscade aquatique simulée. | `data.ts:1230`, `huntSystems.ts:2078`, `HuntCanvas.tsx/updateBoss` : `hydra-tidal-surge`, matrice des surfaces V8. |
| **Serekh-9 — Sandmaw** | Sable/pierre et dangers silice/chaleur/effondrement; vitesse, durée des empreintes et bruit changent selon le matériau. Charge, mêlée et onde. À l'entrée des phases 2/3, déplacement du boss sur un flanc du joueur avec avertissement visuel. | Le boss ne reçoit ni matériau sous le joueur, ni bruit/vibration dans son contrat sensoriel. Courir sur le sable ne gouverne donc pas sa détection. Le déplacement souterrain est une relocalisation, pas un trajet calculé. Pas de parois qui renvoient la charge ni de verre destructible. | `data.ts:1297`, `worldBlueprints.ts/surfaceBehavior`, `HuntCanvas.tsx/updateHuntSignals`, `huntSystems.ts/BossMechanicInput` et `stepExpansionBoss`. |
| **Pelagos-M — Léviathan** | Plateformes/récifs et routes hautes; surfaces corail/eau; vagues, évents, surtensions. Charge/mêlée/sonar. Vague aux phases 2/3 : dégâts, projection et camouflage révélé; hauteur ou couverture offrent un refuge. | Le « bond de l'abîme » exécute une charge horizontale; pas de trajectoire de saut du boss entre fosses. Pas de destruction des plateformes, fermeture progressive d'arène ou foudre liée à chaque sonar. | `data.ts:1364`, `HuntCanvas.tsx/executeBossAttack`, effet `leviathan-rogue-wave`, `worldBlueprints.ts`. |
| **Mycora-V — Cœur-Mère** | Sol mycélien, spores/acidité/entraves, ennemis réguliers partageant un contact suivant leurs factions. Trois nœuds scannés, six adversaires, deux graines. Vrille, nuage, projectile; aux phases 2/3, perte d'énergie, délai de scan et camouflage interrompu. | Aucun graphe de relais sensoriels destructibles, historique des routes utilisées, floraison déclenchée par répétition ou adaptation mémorisée du Cœur. Le partage d'information est l'IA commune, pas une conscience planétaire distincte. | `data.ts:1431`, `huntSystems.ts:1433` et `2078`, `HuntCanvas.tsx/updateBoss` : `hivemind-spore-pulse`. |
| **Acheron-Sigma — Gardien** | Stèles, sentinelles, deux prismes, phase finale de campagne. Matériaux ruines/obsidienne et dangers gravitation/nanites/laser. **Corrigé :** trois tirs énergétiques observés, ou l'entrée des phases 2/3, déclenchent un avertissement de 1,6 s, puis un champ de 4,5 s si le joueur reste exposé. Couvert, camouflage et distance permettent de l'éviter. Le plasma proche exposé est neutralisé, les armes cinétiques restent utilisables. Le vent est nul. | L'adaptation concerne les tirs énergétiques observés, pas toute arme ni l'imitation des feintes/altitudes. Pas d'effacement progressif des plateformes. Le vide n'annule pas encore bruits/odeurs dans les systèmes communs. | `data.ts:1498`, `worldBlueprints.ts:1156`, `huntSystems.ts/stepGuardianAdaptation`, `stepExpansionBoss`, `HuntCanvas.tsx/playerWeapon`, `updateBoss`, `drawGuardianAdaptiveField`; `updateHuntSignals` et `perceivedNoise`. |

Les fichiers `data.ts`, `HuntCanvas.tsx`, `ecologyEncounterV8.ts` et `trophyVisualRegistry.ts` se trouvent dans `app/game/`; `huntSystems.ts` et `worldBlueprints.ts` dans `app/game/systems/`. Les noms de fonctions restent les repères principaux si les lignes évoluent.

## Continuité et répétition

- Ordre confirmé : **Oseris-IV → Nivalis-K → Cinder-12 → Naraka-Delta → Serekh-9 → Pelagos-M → Mycora-V → Acheron-Sigma**. Chaque mission exige la précédente; les anciennes sauvegardes reçoivent les cinq nouveaux emplacements sans perdre les trois premiers.
- Le transpondeur de Vey mène à la colonie de glace, sa balise au Paria, puis les fragments de route, glyphes et graines-mémoires conduisent à la cité finale. Cinder-12 est une étape; `storyCompleted` est acquis à l'issue de la huitième chasse.
- **Acheron-Sigma** est cohérent dans les missions, le codex planétaire, le roster écologique, la décoration et la planète de la carte. « Système Acheron », « Acheron-Tau » et « Marches d’Acheron » sont d'autres niveaux/objets de navigation, pas un renommage erroné de la destination finale.
- Les cinq dernières missions utilisent exactement la fabrique `expansionMission` : **3 scans → 6 éliminations et 2 récupérations → boss → extraction**, avec trois vagues (5/4/3 unités). Elles disposent d'identités, matériaux et attaques différents, mais leur structure d'objectifs reste répétitive.
- `stepExpansionBoss` partage aussi sa sélection d'attaque, ses déplacements et seuils 60 %/25 %. Les effets propres à Naraka, Serekh, Pelagos et Mycora n'arrivent qu'à l'entrée des phases 2 et 3; le Gardien possède désormais aussi un compteur de tirs observés. Les textes `phaseBehaviors` et `phaseHazards` ne constituent pas des scripts exécutés.
- Les huit niveaux possèdent six secteurs connectés, trois routes et une géométrie jouable vérifiée. `expansionWorldBase` transforme des gabarits existants; cela ne prouve pas huit level designs intégralement indépendants.

## Scan, leurre et perception

| Sujet | État vérifié | Travail restant |
| --- | --- | --- |
| Scan du biomask | Consomme 8 unités d'énergie, rayon 430 pour les traces et 470 pour les proies. Valide les objectifs, marque les adversaires, révèle des informations de suivi/barre de vie, contribue à l'honneur et à la qualité des prises secondaires. **Corrigé : seules les proies vivantes et actives peuvent être marquées**, idem pour le capteur. | Ajouter des renseignements tactiques spécifiques réellement exploitables : contre-mesure révélée, piste permettant de choisir un appui ou un itinéraire. La calibration bioélectrique/sismique/sonar reste narrative. |
| Accès aux outils | Capteur et leurre disponibles dès le début; scan natif sans achat. Les quatre types de prélèvement ne demandent aucun outil verrouillé. Netgun après Vey, piège après la glace. | Aucun verrou circulaire d'outil requis identifié dans les objectifs actuels. Vérifier à nouveau si une future mission rend un équipement avancé obligatoire. |
| Leurre audio | Produit une pulsation toutes les 0,5 s. L'IA régulière compare les forces de signaux et recherche une position de bruit estimée; elle ne remplace pas automatiquement le leurre par la position exacte du joueur. Portée, couvert, âge du bruit, vent et famille d'IA interviennent. | Les boss n'utilisent pas cette boucle de recherche. Leur update reçoit position/distance exactes du joueur et ne consomme pas les événements du leurre. Ne pas promettre un leurre pleinement opérant sur l'Apex. |
| Surfaces | Modifient réellement vitesse, bruit de pas, tenue des traces et odeurs, boue/camouflage. Les dangers actifs appliquent dégâts, ralentissement et parfois révélation. | Les attributs textuels et certains multiplicateurs de lore n'ajoutent pas spontanément de nouvelle physique. Distinguer sable bruyant commun et véritable capteur sismique de Sandmaw. |
| Vide d'Acheron | Profil de vent entièrement nul, couvert et limites de poursuite testés. | Les émissions d'odeur/bruit restent actives; décider explicitement des capteurs électroniques/vibratoires du Gardien. Le test existant intitulé « Acheron vacuum » ne vérifie que le vent, pas une propagation physique sans atmosphère. |

Références : `HuntCanvas.tsx/playerScan`, `revealWithinEffect`, `updateHuntTraps`, `updateHuntSignals`, `updateRegularEnemy`, `updateBoss`; `huntSystems.ts/stepHuntTrap`, `perceivedNoise`, `stepAiBrain`; `data.ts/GEAR`.

## Prélèvement et identité du trophée

| Cible | Prise sauvegardée | Type | Image exacte en chasse et au mur |
| --- | --- | --- | --- |
| Vey | Insigne de Vey | `insignia` | `trophy-vey.webp` |
| Cryostalker | Crâne de Cryostalker | `skull-and-spine` | `trophy-cryostalker.webp` |
| Bad Blood | Masque du Paria | `mask` | `trophy-bad-blood.webp` |
| Hydre | Crâne trifide de l'Hydre | `skull-and-spine` | `trophy-swamp-hydra.webp` |
| Sandmaw | Mandibules de Sandmaw | `skull` | `trophy-desert-sandmaw.webp` |
| Léviathan | Crête du Léviathan | `skull-and-spine` | `trophy-ocean-leviathan.webp` |
| Cœur-Mère | Noyau du Cœur-Mère | `skull` | `trophy-fungal-hivemind.webp` |
| Gardien | Masque du Gardien | `mask` | `trophy-ruins-ancient-guardian.webp` |

Les types `skull`/`skull-and-spine` sont des catégories techniques historiques : ils ne justifient plus de dessiner un crâne humain générique pour le noyau du Cœur-Mère ou les mandibules de Sandmaw.

Corrections réalisées dans cet audit :

1. `drawNamedTrophyAtAnchor` utilise en priorité la découpe transparente V15 de la **définition exacte**, pendant le prélèvement et le portage. Chargement d'un seul trophée de campagne par mission, respect du ratio et des limites alpha. Les huit images existantes sont réutilisées, aucun art fabriqué ou remplacé.
2. Le contrat V15 source/runtime est explicitement étendu de `trophy-wall` à `trophy-wall` + `hunt-trophy`; le registre, la politique et l'audit concordent. Les découplages avec les couches d'équipement enregistrées du rig sont conservés.
3. Masques et insignes ne produisent plus de particules de prélèvement anatomique. La phrase de validation annonce la récupération/scellage de l'objet nommé. Même protection appliquée aux prises secondaires non anatomiques.
4. Les claims conservent déjà `definitionId` et `partId` jusqu'à l'extraction, la sauvegarde et le mur. Le rite rythmé et les protections d'embarquement sont conservés.

Les anciens visuels de secours restent accessibles si une image échoue à charger. Cette intégration garantit le choix de l'objet et son cadrage via test; l'appréciation du rendu final en déplacement demande encore une vérification navigateur de la récolte.

## Suite gameplay — contre-mesure du Gardien

Le défaut initial de verrou remis à `false` au tick suivant est corrigé par un état temporisé dans `bossMechanics`. Le champ dure 4,5 s et conserve sa propre échéance; un changement de phase ou de nouveaux tirs ne le prolongent pas. Les checkpoints sauvegardent cet état; les anciens checkpoints sans ce champ restent acceptés, initialisent un état neutre et n'inventent aucune adaptation déjà acquise. Une ancienne sauvegarde qui conservait un verrou après la mort du boss le perd à la restauration, en reprise comme en nouvel essai.

- Seuls les tirs énergétiques réellement acceptés par `playerWeapon` alimentent le compteur. Le Gardien doit avoir une ligne de vue, voir un joueur non camouflé et se trouver à moins de 720 unités. La mémoire expire après 8 s sans nouveau tir observé; un tir cinétique observé casse la répétition. Les tentatives bloquées ne consomment rien et ne comptent pas.
- Au troisième tir observé, ou à une entrée de phase pertinente, un avertissement de 1,6 s suspend l'attaque du boss. Le HUD et un cercle dans le monde donnent le délai et les issues. Briser la ligne de vue, se camoufler ou quitter le rayon annule l'activation.
- Si le joueur reste exposé, le champ retire 24 unités d'énergie une seule fois. Il neutralise uniquement les projectiles de plasma du joueur proches et sans couvert; flèches, disques, tirs ennemis et plasma hors champ ou protégé restent présents. Aucun délai global d'arme n'interdit la réponse cinétique.
- Un couvert, le camouflage ou la sortie de portée libèrent immédiatement les armes énergétiques; rentrer dans le champ avant son expiration les brouille de nouveau sans repousser sa fin. La mort du boss conserve la libération existante du verrou.

Le correctif ne crée ni imitation des trajectoires, ni adaptation à toute arme, ni nouvelle perception des leurres par les boss. Le rendu du cercle et la lisibilité du combat à vitesse réelle restent à apprécier dans le navigateur; les tests exécutent les décisions et les fonctions Canvas réelles.

## Vérifications exécutées

- **55/55 tests passés**, sans skip, dans une seule exécution :
  `node --test tests/hunt-campaign-runtime.test.mjs tests/trophy-visuals-v15.test.mjs tests/enemy-trophy-runtime-v18.test.mjs tests/hunt-systems.test.mjs tests/planet-expansion-v8.test.mjs tests/mission-honor-rules.test.mjs tests/trophy-ritual.test.mjs`.
- Les sept nouveaux tests de `hunt-campaign-runtime.test.mjs` exécutent les déclarations réelles du Canvas après extraction AST : scan/capteur face à une vague différée, quatre types de prélèvement et priorité/cadrage de l'image exacte. Ce ne sont pas des copies de l'implémentation ni de simples recherches de texte.
- **Audit V15 réussi** : `node scripts/audit-trophy-assets.mjs` — huit prises originales, source/runtime et alpha vérifiés.
- **Lint ciblé réussi** : `npx eslint app/game/HuntCanvas.tsx app/game/trophyVisualRegistry.ts scripts/audit-trophy-assets.mjs tests/hunt-campaign-runtime.test.mjs tests/trophy-visuals-v15.test.mjs`.
- **TypeScript réussi** : `npm run typecheck`, relancé après correction par l’agent principal d’un attribut JSX dupliqué signalé pendant les modifications parallèles. La compilation/publication et la QA globale finale restent distinctes de cet audit.
- **Suite Gardien : 46/46 tests passés**, sans skip : `node --test tests/guardian-adaptation.test.mjs tests/hunt-systems.test.mjs tests/hunt-campaign-runtime.test.mjs tests/active-hunt-save.test.mjs`. Les 12 nouveaux tests couvrent les tirs acceptés/bloqués, la mémoire, la réponse cinétique, les trois moyens d'évitement, la persistance et l'expiration du champ, les sauvegardes anciennes/récentes, le verrou hérité d'un boss mort et le filtrage réel des projectiles du Canvas.
- **Lint et TypeScript de la suite réussis** : `npx eslint app/game/HuntCanvas.tsx app/game/systems/huntSystems.ts tests/guardian-adaptation.test.mjs tests/hunt-systems.test.mjs`, puis `npm run typecheck`.
- **Revue indépendante effectuée** : tirs comptés après acceptation, couvert réel de la carte, états sauvegardés, armes cinétiques et mort du boss. La migration du verrou post-mortem signalée lors de cette revue a été corrigée et testée.
- Aucun commit, push ou déploiement n'a été effectué par cet audit. Aucun parcours navigateur intégral des huit chasses n'est revendiqué.

## Priorités restantes

**P1 — cohérence gameplay :** rendre la perception des boss et les leurres compatibles, spécialiser la lecture des traces, clarifier les capteurs dans le vide. Le verrou temporisé et évitable du Gardien est désormais branché; la perception générale des Apex reste à traiter. Les effets de phase doivent rester lisibles et évitables.

**P2 — identité et variété :** varier les objectifs des cinq dernières missions; introduire progressivement vibration Sandmaw, relais Mycora, menaces multiples Hydre et vrais bonds du Léviathan. Ne pas présenter ces systèmes comme déjà existants à partir de descriptions, d'images ou de trois seuils de vie.

**QA de livraison :** tester visuellement une récolte anatomique et une non anatomique, l'extraction/retour vaisseau, puis la chaîne complète avec sauvegarde/reprise et les réglages d'accessibilité. Les suites automatisées couvrent de vrais contrats et décisions, mais ne remplacent pas huit parties complètes. Vérifier aussi la lisibilité du nouvel avertissement du Gardien et sa reprise en situation réelle.
