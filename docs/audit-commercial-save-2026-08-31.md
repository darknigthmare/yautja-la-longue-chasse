# Audit de persistance — 31 août 2026

Périmètre : `app/game/save.ts`, `app/game/systems/activeHuntSave.ts` et tests de sauvegarde. Relecture des transactions correspondantes de `GameClient.tsx`, intégrées par l’agent principal. Le schéma partagé `SaveGame` reste en version 4 ; aucun champ de `types.ts` n’a été ajouté.

## Défauts confirmés et correctifs

| Priorité | Défaut observé avant correction | Traitement |
| --- | --- | --- |
| P1 | Une campagne corrompue ou d’une version future était chargée comme une partie vierge ; l’autosave suivant pouvait remplacer les données originales. | Chargement avec statut explicite ; lecture sans mutation ; écriture normale protégée ; remplacement réservé à un import/reset explicite. |
| P1 | Aucune copie de récupération de la campagne principale. | Copie du précédent instantané valide dans `<clé>.backup`, après réussite de l’écriture principale. Récupération annoncée, sans écriture pendant le chargement. Une version future n’est pas remplacée par un ancien backup. |
| P1 | Une autre session pouvait remplacer la campagne chargée entre deux sauvegardes. | Comparaison du contenu primaire effectivement chargé/écrit avec le stockage courant ; conflit signalé sans écrasement automatique. |
| P1 | La protection des chasses actives ne concernait que les séquences d’un même `runId`. Un ancien onglet pouvait écrire sur une nouvelle chasse ou la supprimer. | Un `runId` différent est refusé, indépendamment de l’horloge ; identité d’un run immuable ; suppression conditionnelle `expectedRunId`. Le lancement d’une nouvelle chasse effectue un abandon explicite préalable. |
| P1 | Le résultat de mission supprimait la reprise avant d’enregistrer les récompenses. Une erreur de quota pouvait perdre les deux. | Défaut signalé et correction relue dans `GameClient` : écriture de campagne avant retrait de la reprise ; résultat en mémoire et reprise conservés si l’écriture n’est pas confirmée. Validation intégrée finale à la charge de l’agent principal. |
| P2 | Aucune fonction d’export/import de campagne validée. | Export JSON identifié, import des exports et anciens JSON bruts, validation avant toute écriture, limite de 1 Mio mesurée aussi en UTF-8. |
| P2 | Les tableaux JSON pouvaient contenir des accesseurs ou une sérialisation personnalisée non inspectée. | Validation des descripteurs de chaque indice ; rejet sans exécution des getters et traitement des proxies qui lèvent une exception. |
| P2 | Des compteurs numériques corrompus pouvaient excéder les entiers représentables exactement. | Normalisation limitée aux entiers sûrs. |

Aucun défaut P0 démontré dans ce périmètre. Cette conclusion ne qualifie pas l’ensemble du jeu de prêt pour une commercialisation.

## Contrats de stockage

- `loadSaveWithStatus()` retourne la campagne, `loaded`, `source` (`primary`, `backup`, `fresh`) et un motif lisible par l’interface. `loadSave()` reste disponible pour compatibilité.
- `writeSaveWithStatus()` ne remplace pas silencieusement une campagne illisible, future ou appartenant à un autre profil. `SaveWriteFailure` est exporté.
- `replaceSaveWithStatus()` et `importSaveWithStatus()` sont destinés à une action de remplacement confirmée. Un reset vers un autre propriétaire conserve la copie de secours jusqu’à confirmation de la nouvelle campagne principale. Si l’écriture du nouveau backup échoue ensuite, son retrait est tenté seulement après cette confirmation ; si les deux opérations sont refusées, l’ancienne copie peut rester présente et cette limite ne doit pas être présentée comme un effacement complet.
- `parseSaveImport()` ne touche jamais au stockage. `exportSave()` inclut uniquement la campagne principale : ni chasse active ni configuration/progression du vaisseau séparée. L’interface doit maintenir cette distinction.
- Les chasses actives restent bornées à 512 Kio, 16 niveaux, 512 éléments par collection et 25 000 nœuds. Une enveloppe de version/révision future est signalée et protégée des écritures ordinaires.
- Un échec de confirmation après `setItem` est **incertain** : la valeur principale peut avoir été écrite avant une erreur de lecture de contrôle. Il faut conserver/exporter la session en mémoire, et ne pas promettre que l’ancienne valeur est toujours présente.

## Vérifications réalisées

Commande exécutée avec succès :

```text
node --test --test-concurrency=1 tests/save-recovery-import.test.mjs tests/active-hunt-save.test.mjs tests/save-v2.test.mjs tests/save-storage-status.test.mjs
```

**58 tests réussis, aucun échec** après ajout des deux régressions de remplacement de campagne. Cela couvre migrations existantes, profils/apparences, trophées, progression, corruption, versions futures, récupération, UTF-8/import volumineux, erreurs de quota, écritures silencieusement ignorées, confirmation incertaine, reset, conflits de campagne et de run, getters/proxies.

ESLint réussi sur les cinq fichiers de code/tests modifiés. La nouvelle suite de récupération compile en mémoire avec esbuild, sans recopier les assets ni créer de build global.

## Limites et contrôles restant nécessaires

- La lecture du Canvas confirme les hooks pause/blur/pagehide/visibility et l’autosave périodique de 15 secondes ; ce constat source n’est pas une preuve de fonctionnement dans un navigateur mobile ou lors d’un arrêt forcé du processus.
- Les positions, collisions et objectifs d’un checkpoint appartiennent au schéma Canvas. Leur validation de reprise et les cas de blocage de mission sont audités par l’agent combat/monde ; ils ne sont pas certifiés par l’enveloppe générique.
- L’écriture d’une clé `localStorage` et sa copie de secours ne forment pas une transaction atomique multiclés. Le backup est facultatif si le quota est plein. Un effacement des données du site supprime aussi la sauvegarde de secours locale ; un export externe reste nécessaire.
- La détection de concurrence empêche les écrasements séquentiels observables. Elle n’est pas un verrou distribué ni un compare-and-swap atomique entre processus ; deux écritures strictement simultanées restent une limite du stockage choisi.
- L’export de campagne n’est pas une sauvegarde exhaustive de tous les sidecars. Leur regroupement futur nécessite un format commun et une stratégie d’import cohérente.
- Pas de revendication de test navigateur, synchronisation cloud, chiffrement/anti-triche, endurance longue durée, build global ou publication par cet audit. Ces validations sont distinctes.


## Complément : propriétaire du sidecar vaisseau

Le sidecar du vaisseau passe de V2 à **V3** avec `ownerSaveCreatedAt`. Aucun champ du schéma principal `SaveGame` n’est modifié. Les déblocages, rites, entraînements, traitements et configurations d’un propriétaire différent ne sont pas repris par la normalisation/lecture, même si les écritures et suppressions sont toutes refusées.

- V1/V2 compatibles : leur progression est conservée, liée au propriétaire courant et réécrite en V3 dès le chargement si le stockage l’autorise. Une campagne primaire illisible, future ou d’un autre propriétaire interdit cette écriture de migration.
- Legacy sans propriétaire : adoption seulement si `updatedAt` est valide et ne précède pas la création de campagne. Cela empêche une nouvelle partie de reprendre un ancien sidecar. Ce contrôle chronologique ne constitue pas une preuve d’identité.
- `writeShipProgressionWithStatus()` expose les échecs et refuse les écritures d’un ancien onglet sur un propriétaire de campagne différent, ainsi que les sidecars futurs. Le wrapper `writeShipProgression()` est conservé pour compatibilité.
- `resetShipProgressionWithStatus(save)` retourne `{ state, persisted, failure }`. Il tente de remplacer le sidecar par la projection initiale de la campagne, puis de le retirer si le quota bloque l’écriture. L’interface doit utiliser l’état retourné et annoncer tout reset non confirmé.
- Limite explicite : un import conservant **le même** `createdAt`, ou une ancienne donnée V1/V2 dont le propriétaire n’a jamais été écrit, ne peut pas être distingué parfaitement d’une continuation légitime si toute écriture/suppression est refusée. Un échec du reset n’est donc jamais annoncé comme un effacement réussi. Un propriétaire V3 différent reste, lui, ignoré à chaque lecture.

Validation dédiée : `tests/ship-progression-owner.test.mjs`, `tests/ship-progression.test.mjs`, `tests/ship-catalogue.test.mjs` ; propriétaire étranger, migration conservatrice V1/V2, quota, suppression de secours, ancien onglet, format futur et absence d’écriture pendant une hydratation de campagne invalide. **27 tests réussis, aucun échec**, puis ESLint réussi sur le périmètre vaisseau.


## Complément : propriété des reprises entre onglets

`claimActiveHuntSave(candidate, newRunId)` compare la proposition normalisée complète avec le stockage courant avant de donner une nouvelle identité à la session reprise. La configuration, le checkpoint et la séquence sont conservés ; les anciens écrivains et nettoyages ne peuvent plus viser cette nouvelle identité. Aucune suppression préalable n’est effectuée. La comparaison suivie d’une écriture reste non atomique entre processus.

Le nettoyage conditionnel par `expectedRunId` et/ou `expectedSequence` exige désormais une enveloppe entièrement valide à la révision attendue. Même avec les mêmes champs de propriété, un format futur, une enveloppe incomplète ou corrompue et une valeur vide sont conservés octet pour octet, sans suppression ni écriture de remplacement. Une clé absente reste un succès idempotent ; le nettoyage explicite sans garde reste disponible pour l’abandon volontaire, l’import ou la réinitialisation.

Validation complémentaire : `node --test tests/active-hunt-ownership.test.mjs tests/active-hunt-save.test.mjs` — **24 tests réussis, aucun échec** (10 tests de propriété et 14 tests existants). La suppression indue d’une enveloppe future a d’abord été reproduite par le nouveau test, puis corrigée. ESLint réussi sur `activeHuntSave.ts` et `active-hunt-ownership.test.mjs`. Cette vérification ciblée ne constitue pas un test navigateur multi-onglets.
