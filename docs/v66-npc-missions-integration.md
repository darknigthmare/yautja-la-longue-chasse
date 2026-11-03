# V66 — Les passages de retour

Chaîne originale de deux demandes de la **Soigneuse des délégations** (`clan-healer`), rencontrée au point `medbay-service` à l'intérieur de `clan-lodge`. Le récit concerne les passages de retour déjà présents dans les deux expéditions du jeu ; il ne décrit pas une institution médicale canonique. Les Marches et le Désert sont réutilisés et rejoués, pas comptés comme nouveaux niveaux.

1. Accepter « Un retour praticable », refaire les Marches, ouvrir le raccourci et rentrer par la navette, puis revenir physiquement à la soigneuse. Le débrief distingue le passage vérifié de la fausse affirmation que toute la région serait sûre.
2. Accepter « Le verre sous les pas », refaire le Désert, accomplir sa traversée et ouvrir le pont, puis revenir à la même interlocutrice. Le débrief doit correspondre à la route réellement empruntée. Le dialogue conserve la décision prise sur la balise.

Un rapport acquis avant l'acceptation ne compte pas. Quitter l'expédition ou consulter le journal ne termine aucune demande. Chaque remise attend une action au vrai PNJ, dans le bon intérieur V64 et à proximité actuelle. Aucun honneur, trophée, inventaire, soin gratuit, accès à une région ou rite n'est accordé. Le résultat est uniquement l'inscription des deux relevés au carnet de cette maison. Les prérequis des expéditions et le parcours Unblooded restent inchangés.

## Contrat de persistance

Ajouter `homeworld.npcMissionsV66: NpcMissionsV66` à `HomeworldProgress`, initialisé par `defaultNpcMissionsV66()` et normalisé par `normalizeNpcMissionsV66()`. Format :

```ts
{ version: 1,
  ash: { accepted: false, report: null, delivered: false },
  glass: { accepted: false, report: null, delivered: false } }
```

L'absence du champ dans les sauvegardes précédentes vaut un carnet vide. Une sous-version future doit être protégée par le contrôle de version de `save.ts` avant normalisation/import/autosave. `isNpcMissionsV66()` refuse les états incohérents comme une remise sans rapport ou la deuxième mission avant la première remise. Ne pas normaliser un état futur puis l'utiliser comme base d'une écriture.

## Raccords du moteur hôte

- **Dialogue Homeworld** : le composant `HomeworldNpcMissionsV66` reçoit `{ value, npcId, autonomousHunter, disabled, onAction }`. `value` est le carnet sauvegardé. L'action est une `NpcMissionActionV66` (`accept` ou `debrief`). Le composant n'écrit rien et ne simule aucune réussite locale.
- **Soumission** : dans le Hub, relire les refs du propriétaire de campagne, suspension/pause, point du dialogue, intérieur et acteur actuels. Appeler `applyNpcMissionsV66(value, action, { autonomousHunter, interiorId, pointId, npcId, actor, suspended })`. Le modèle vérifie aussi l'intérieur et le véritable socket V64. Si `changed`, persister le nouveau Homeworld avant de remplacer la ref et d'annoncer le succès. Une écriture refusée doit conserver l'ancien carnet et autoriser une nouvelle tentative explicite.
- **Rapports vivants** : seulement dans `completeHomeworldExpedition` et `completeGlassDesert`, après les gardes de preuve et de propriétaire déjà présentes, appeler `recordNpcMissionReportV66(current.homeworld.npcMissionsV66, rawProof)`. Fusionner `result.state` **dans la même écriture durable** que le rapport de la région. Ne pas enregistrer la demande dans une seconde transaction. Un registre incompatible (`ok:false`) doit bloquer cette écriture plutôt que réinitialiser le carnet.
- **Aucun rattrapage rétroactif** : ne jamais appeler le recorder à l'hydratation, depuis `homeworld.expeditions`, à l'ouverture du journal ou lors de l'acceptation. Le callback doit provenir d'une sortie vivante après la demande. Ce système valide des données locales ; il ne prétend pas fournir de signature anti-triche.
- **Journal** : `HomeworldNpcMissionsJournalV66({ value, autonomousHunter })` affiche l'objectif courant et la destination. `npcMissionsJournalV66()` donne `phase`, `pointId`, `completed/total` et le texte. Le journal n'offre pas de remise à distance ni de téléportation.
- **Autonomie** : utiliser la même condition que les expéditions existantes (`prologue` absent pour les campagnes historiques, ou rang de chronique différent d'Unblooded). Un rang adulte de kit ne doit pas remplacer le vrai rang du parcours de jeunesse.

## Fichiers et contrôles

`app/game/systems/homeworldNpcMissionsV66.ts` contient le modèle pur et la validation physique. `app/game/HomeworldNpcMissionsV66.tsx` contient la présentation. La documentation Next locale `node_modules/next/AGENTS.md` et le guide Server and Client Components ont été lus avant le TSX. Le composant est client et n'accède pas directement au stockage.

`tests/homeworld-npc-missions-v66.test.mjs` couvre les deux routes du Désert et les deux dispositions de balise, la séquence entière, l'absence de validation rétroactive, les preuves incomplètes, l'immuabilité du premier rapport, les états futurs/incohérents et les gardes de proximité/intérieur/jeunesse. La recette du raccord dans les vrais callbacks, le refus d'écriture, les sauvegardes/rechargements et le parcours navigateur restent à exécuter une fois les raccords hôtes présents. Ces tests ne prétendent pas valider un parcours jouable à eux seuls.
