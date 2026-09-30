# V61 · gestes conditionnels et nouvelles ambiances

Les registres `app/game/data/pitStageLifeV61.json` et `pitStageStoryV61.json` sont indépendants des75ambiances natives V60. Leur contrat se trouve dans `pitStageStoryV61.ts`. Les7nouveaux triplets utilisent le directeur déterministe V60 sans modifier son sac de3événements, ses délais ni les données publiées. Un triplet V61 validé remplace le cast générique V54 de ce stage uniquement.

Une correction explicite de stage V60, telle que Hydra169, exige `replacesV60Stage:true`, les mêmes3identités dans le même ordre, et `reusedV60EventId` sur chaque copie inchangée. Ces copies doivent conserver exactement SHA/cellules/pivots/placement/cadence des sources V60 et ne sont jamais comptées comme de nouveaux dessins. Le triplet corrigé remplace le rendu de l'ancien, sans modifier les75données publiées ni doubler les acteurs.

Chaque PNG natif conserve ses dimensions, SHA256, rectangles non nécessairement uniformes, pivots et bornes alpha>2. Un atlas possède6dessins distincts, une cadence, des poses de repos/accessibilité et un placement dans P1/P2/P3. `height` est la hauteur de la première cellule ; toutes les autres conservent la même échelle de pixel. Ni reflet, ni déformation, ni recoloration. Paths : `/game/sprites/v61/pit-life/<stageId>/<asset>.png` ou `/pit-story/`.

Un motif de locomotion V61 peut ajouter `idleVisibility:'hidden'`, `travelX:[from,to]` (ancragesX absolus), `clipWorld:{x,y,width,height}` et `opacity` entre0.05et1. Il requiert un ancrage `world`. Les6dessins natifs traversent linéairement cette ouverture pendant leur créneau du sac ; aucune pose de course n'est tenue immobile avant/après. La même profondeur transforme le clipping et le motif. En réduction des mouvements, le traversant reste caché. Le sac conserve ses3entrées et les2autres motifs continuent normalement. Aucun ancien motif V60 ne reçoit implicitement ce comportement.

## Déclencheurs réellement raccordés

- `round-start` : phase combat `round`, présentation `fight` du même round, après les deux introductions et les3secondes de compte à rebours. Horloge : ticks écoulés dans ce round. Aucun déclenchement dans le laboratoire d'entraînement.
- `round-victory` : résultat du round courant avec vainqueur non nul, présentation `round-result` ou `match-result`. Aucun salut sur match nul.
- `round-end` : même contrôle de résultat, accepte aussi les matchs nuls. L'ancien185 utilise ce signal.
- `match-end` : seulement `match-over` + `match-result`, après le duel complet. Garde140 et patrouille142 ne réagissent jamais à une manche intermédiaire.

Les transitions ordinaires continuent sur les ticks de simulation historiques. Le résultat terminal utilise uniquement l'horloge de présentation déjà existante, gelée en pause, onglet masqué et chargement. Le directeur est une projection pure : pas de minuterie supplémentaire, RNG, mutation combat, sauvegarde ou format de replay.

Un geste dure `frames.length / fps` secondes puis libère l'acteur. `replacesAmbientEventId` remplace temporairement un acteur précis, même si sa profondeur diffère, uniquement lorsque le nouveau PNG peut réellement être dessiné. Un PNG absent, invalide ou une transformation impossible ne fait pas disparaître l'original. Le sac ambient conserve les3événements et son ordre ; aucune reprogrammation liée au geste.

`idleVisibility:'hidden'` est obligatoire pour les remplacements et les cues narratifs. Un nouvel objet comme le gong peut utiliser `'rest'` pour rester physiquement présent avant et après le coup. `excludedFighterIds` évite un doublon pour un futur acteur identifié. Les poses réduites restent natives et fixes.

## Signaux narratifs non raccordés

`narrative-cue` requiert `cue` et `encounterId` explicites. Le futur contrôleur transmet un `PitStageNarrativeCuesV61` avec le même stage, même rencontre, un identifiant d'occurrence non vide et des ticks écoulés valides. PitCanvas n'accepte ce contexte que pour la rencontre narrative correspondante et jamais dans un replay ordinaire.

-162 `engineer-preboss` : pas de séquence préboss dans les quatre rencontres V57.
-178 `first-incident` : aucun événement d'incident Bloodshed ; un impact n'en est pas un.
-179 `objective-beacon` : aucun objectif de scénario terminé ; gagner un round n'en est pas un.
-180 `chapter-captive` : aucun chapitre Sandpiper et roster de captifs validés.

Ces quatre signaux n'ont **aucun émetteur actuel**. L'existence de l'API ou d'un PNG préparé ne signifie pas que leur scène est jouable. `afterPlayback:'hold-last'`, réservé aux cues narratifs, permet ultérieurement de maintenir une balise éteinte ou un incident atteint jusqu'au retrait du cue. Il ne fabrique pas cet événement.

Les dossiers126/051/130/119 existent comme arènes de catalogue mais ne figurent ni dans les13liaisons `pitStageJourneyRoutes` ni dans les4rencontres `pitNarrativeTrialsV57` ; aucune variante de chapitre/équipement n'est implicitement déduite de leur sélection.

## Vérification

`tests/pit-stage-story-v61.test.mjs` contrôle le compte à rebours réel, les résultats/matchs nuls, pause, recherche temporelle, non-invention de cues à partir d'impacts, identités exclues, alpha/rectangles contractuels, remplacement sans double corps, chargement sélectif, erreur/retry et immutabilité combat/caméra/V60. `scripts/audit-pit-stage-v61.mjs` compare les PNG runtime aux reçus natifs acceptés et aux copies producteurs, remesure toutes les cellules, vérifie les bords et refuse les faux dessins dupliqués.

Les attributs canvas `data-pit-stage-life-v61-*` et `data-pit-stage-story-v61-*` exposent stage, acteurs dessinés, événements, frames, occurrences, états `active/held/visible`, chemins manquants et IDs remplacés. La QA réelle de l'application et la revue visuelle des appuis restent des preuves séparées de l'audit natif.
