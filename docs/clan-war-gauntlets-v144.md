# V144 — Protection des guerres de clans contre deux onglets concurrents

**En cours de développement dans la [PR #42](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42), restée en brouillon sur la branche de la PR #40.** Aucun passage dans `main`.

## Défaut réel traité

Le panneau stratégique V143 avait une barrière contre le double clic et les écritures en cours ; les archives locales utilisaient déjà un **verrou transactionnel IndexedDB V94**. Cependant, lorsque deux onglets avaient chargé le même front, le second pouvait encore afficher un état périmé. Un clic dessus pouvait appliquer une résolution **temporaire en mémoire**, que le verrou de sauvegarde refusait ensuite de persister. L'utilisateur voyait des ordres obsolètes jusqu'au rechargement.

La V144 ajoute :

- `WarSessionSnapshotV85.staleWar`, uniquement pour un conflit **effectivement observé**. Le mode sans stockage garde `staleWar=false` et reste jouable en mémoire, sans promettre une sauvegarde.
- `observeExternalStorageChange(key)` dans `clanWarSessionV85.ts` : compare en lecture seule les octets réellement présents à ceux précédemment hydratés. Le signal localStorage arrive à l'autre onglet, et un second contrôle est effectué au retour du focus ou de la visibilité.
- Une **alerte de conflit accessible** dans `ClanWarPanelV85`, ainsi que l'interdiction des réservations, déplacements, ordres de garnison, annulations, fin de tour et remise à zéro lorsqu'un front est périmé.
- Une **seconde protection au niveau de la session elle-même** : aucun appel direct `setSimulation` ou `unlockWarAfterExplicitReset` ne modifie ce front périmé.
- `inspectWarTurnGateV143` comprend désormais `conflict`, indépendant de `writing`, `loading` et de la simple mémoire temporaire.

L'archive **n'est pas fusionnée automatiquement**, les sources de données de campagne `SaveGame V13` et les récompenses de chasse sont inchangées, et la vue classique et la projection holographique affichent exactement le même front.

## Vérifications

- `tests/clan-war-multitab-v144.test.mjs` : deux sessions partageant un même stockage, notification d'un changement externe, mémoire périmée verrouillée, refus de reset/écriture, réouverture sur la bonne version et mode sans stockage conservé.
- `scripts/qa-clan-war-multitab-v144.mjs` : **deux vrais onglets Chromium** hébergeant `ClanWarPanelV85`, `createWarSessionV85`, `ClanWarAtlasV95` et le vrai registre IndexedDB, sans remplacer les règles du jeu. Vérifie 1→2 dans A, B marqué périmé, B refusant les actions, B rechargeant puis 2→3, A devenant à son tour périmé, et l'intégrité du registre IDB `confirmed` et d'une sentinelle de sauvegarde indépendante.
- `.github/workflows/clan-war-v144-multitab.yml` : export de captures et du rapport dans l'artefact `clan-war-v144-two-real-tabs-idb-evidence`.
- [Excel V144](Yautja_ClanWar_V144_Conflits_Onglets.xlsx) : six onglets et 22 scénarios de sécurité, dont les cas non couverts explicitement identifiés.

## Tests qui restent ouverts

1. Deux **appareils différents** et une synchronisation distante : aucun cloud n'est branché par cette correction.
2. Le conflit entre onglets sur **toutes les planètes** et pendant chaque sous-mode V115 : test complémentaire nécessaire.
3. Le parcours complet depuis le titre, l'armurerie, les gauntlets débloqués et la navigation de `GameClient` : ces tests se concentrent sur le vrai panneau de guerre, pas sur toute la campagne.
4. Revue artistique **1:1 de 54 modèles** : toujours **0 certifié**. Les sprites restent des études originales ou des prototypes de référence. Les droits de franchise et les tests humains restent à accomplir.

**Critère de succès technique :** aucune écriture du front le plus ancien ne peut remplacer l'archive du dernier onglet ; un onglet périmé doit montrer clairement l'erreur et pouvoir relire la version courante sans perte du tour, sans modifier une autre sauvegarde.

**Statut CI :** renseigner uniquement avec l'exécution vérifiée du **dernier commit** ; l'ajout du code et des tests n'établit pas, à lui seul, un test Chrome réussi.
