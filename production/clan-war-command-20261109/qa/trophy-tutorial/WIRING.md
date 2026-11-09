# Raccordement BUILD5-09 / TR-M01..03

Les quatre nouveaux fichiers métier/UI/tests appartiennent au lot courant.
Ils ne modifient ni `TrophyWorkshop` (quatre épreuves historiques), ni les
trophées gagnés, ni les promotions. L'objet utilisé est le modèle pédagogique
explicitement autorisé par TR-M01. Ses identifiants ne peuvent devenir une
`TrophyClaim`.

## Propriétaire et API

```ts
import {
  acceptTrophyTutorialCheckpointV6,
  inspectTrophyTutorialV6,
  type TrophyTutorialStateV6,
} from './systems/trophyTutorialV6';
```

`TrophyTutorialStateV6` contient `version: 1`, `owner = SaveGame.createdAt`,
`objectId = tutorial-model:${owner}`, `completedSteps` (0..18), `revision`,
`events` (21 au maximum), la position et le trajet parcouru.

Les trois vues du geste 9 sont confirmées séparément. Elles augmentent la
révision et le journal, sans terminer le geste avant les trois observations.
**Ne pas imposer `revision === completedSteps`** : la fin est 18 gestes et
21 événements. Cette distinction permet de quitter après la seule face puis
de reprendre au profil et au revers, conformément à la réplique V6.

- `inspectTrophyTutorialV6(undefined, owner)` : ancienne sauvegarde sans activité,
  statut `absent`. Aucun objet ni progrès n'est ajouté pendant la lecture.
- Une entrée reconnue donne `valid` et son état normalisé/rejoué.
- `null`, propriétaire différent, faits non observés, progression falsifiée,
  étapes hors ordre ou position illégale : `invalid`, état nul.
- Une version supérieure à 1 : `future`, état nul. Aucun reset automatique.
- `acceptTrophyTutorialCheckpointV6(current, candidate, owner)` renvoie le
  prochain état seulement pour un événement/révision supplémentaire,
  préfixe du journal inchangé et séquence métier entièrement valide.
  Cela constitue le CAS métier local, pas une autorité serveur.

## `types.ts` et `save.ts` — à appliquer par le propriétaire de l'intégration

Champ optionnel de `SaveGame` :

```ts
trophyTutorialV6?: import('./systems/trophyTutorialV6').TrophyTutorialStateV6 | null;
```

Dans `normalizeSave`, sur le modèle des autres ledgers optionnels :

```ts
...(source.trophyTutorialV6 === undefined ? {} : {
  trophyTutorialV6: inspectTrophyTutorialV6(
    source.trophyTutorialV6, validIsoDate(source.createdAt, fallback.createdAt),
  ).state,
}),
```

Dans `inspectSavePayload`, **avant** de normaliser/publier la sauvegarde :

```ts
const tutorial = inspectTrophyTutorialV6(
  value.trophyTutorialV6, typeof value.createdAt === 'string' ? value.createdAt : '',
);
if (tutorial.status === 'future') return { save: null, failure: 'future-version' };
if (tutorial.status === 'invalid') return { save: null, failure: 'invalid-save' };
```

Les octets importés restent sous la responsabilité du mécanisme actuel
d'export/récupération. Un état invalide ne doit pas être converti en activité
vide par le chemin d'import. `defaultSave` n'a pas besoin de créer le champ.
La version principale 13 peut conserver ce champ optionnel sous son validateur
explicite, suivant les autres extensions du dépôt.

## `GameClient.tsx` — unique writer durable

Ajouter `trophyTutorialV6` à la fois au `Pick<SaveGame, ...>` et à
`updateSerialized` dans `persistSocialProgress`, afin que la réconciliation
d'une écriture interrompue compare réellement ce champ.

Charger paresseusement `TrophyTutorialBay`. Ouvrir son parcours depuis le
**vrai écran `trophies`**, déjà atteint par `openStationScreen` depuis le service
physique Homeworld/ShipHub/Clan Ship. Conserver le lieu et le poste de retour.
Ne pas l'ouvrir depuis un bouton global contournant le déplacement.

```tsx
<TrophyTutorialBay
  owner={save.createdAt}
  save={save}
  initialState={save.trophyTutorialV6}
  onCheckpoint={commitTutorialCheckpoint}
  onExit={() => setTrophyTutorialOpen(false)}
  suspended={settingsOpen || archiveTransferBusy || Boolean(archiveRecoveryIssue) || campaignSaveBusy}
/>
```

Le callback doit vérifier les mêmes verrous que les autres interactions
physiques, `screen === 'trophies'`, le propriétaire monté, la présence actuelle
du tutoriel, l'absence de rite/hunt en cours et le focus actif. Ensuite :

```ts
const current = saveRef.current;
const next = acceptTrophyTutorialCheckpointV6(
  current.trophyTutorialV6, candidate, current.createdAt,
);
if (!next) return false;
return persistSocialProgress({ trophyTutorialV6: next });
```

`onCheckpoint` est synchrone et renvoie un booléen. Le composant n'avance pas
le geste, les observations ou l'objet si le writer refuse ou lève une erreur.
Une nouvelle confirmation peut réessayer exactement le même candidat ; la
réconciliation existante appartient au writer. Le composant n'a aucun accès
à `localStorage`, IndexedDB ou un writer secondaire.

Pendant le parcours, masquer/inhiber les commandes du registre historique et
désactiver le pad de conservation `conservationPadActiveV112` pour éviter une
double entrée. Le déplacement clavier/toucher du tutoriel est local, relâché
au blur, à la suspension et au démontage. Aucun essai de manette physique
n'est revendiqué. Fermer l'activité en quittant l'écran/son propriétaire.

## Recette attendue dans le vrai Next après intégration

1. Atteindre physiquement l'atelier Homeworld avant Blooded (QA5-18), ouvrir le
   parcours sur modèle. Aucun vaisseau ne doit apparaître ni être acquis.
2. Refuser une manipulation distante et des faits inventés, puis accomplir les
   18 gestes, avec déplacements continus et six transports du même objet.
3. Interrompre/recharger après le relevé (geste 3), après la face seule du geste
   9, puis après la plaque (geste 16). Vérifier même objet, même poste stable,
   aucun geste déjà validé à répéter.
4. Refuser une écriture, vérifier que le geste et l'objet n'avancent pas ;
   réessayer, puis recharger.
5. À 390 et 320 px, lire, faire défiler, agir, revenir au vrai poste.
6. Vérifier profil/rang, vaisseaux, récompenses et vrais trophées inchangés.

Les tests du domaine et une fixture du composant ne remplacent pas cette
recette du vrai `GameClient`. Le dossier ne prétend pas clôturer BUILD5-02,
les 18 gestes sur un original réellement chassé, les chaînes avancées,
la fidélité canonique ni l'avis artistique humain.
