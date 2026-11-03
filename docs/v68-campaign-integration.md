# La Cohorte des Aspirants — intégration V68

La sortie complète reprend après « La Piste sans guide ». Le joueur recrute deux aspirants, choisit un itinéraire commun, franchit les roches, consigne une trace en groupe, aligne les trois relais, ouvre une clairière sous des charges télégraphiées, soigne Saar avec le medicomp du refuge, regroupe la triade et revient physiquement au maître. Le rapport puis la reconnaissance finale restent deux étapes distinctes. Treize reçus ordonnés sont conservés.

La reconnaissance finale officialise **Young Blood** par le rite existant `unguided-hunt-recognition`. Elle n’accorde aucun rang Blooded, équipement adulte, trophée de mise à mort ou vaisseau. La formation en triade est une création du clan du jeu, fondée sur les exigences de la conversation récupérée ; ce n’est pas une reproduction du rite d’AVP ou du Temple des Trois Ombres.

## Fichiers et API

- `app/game/systems/firstHuntSoloV68.ts` : simulation fixe 60 Hz, entrées, normalization et objectifs.
- `app/game/systems/campaignSoloV68.ts` : `normalizeSoloV68Campaign`, `soloV68MatchesSave`, `canStartSoloV68`, `startSoloV68Campaign`, `withSoloV68Checkpoint`, `withSoloV68Progress`, `soloV68NeedsScene`.
- `app/game/FirstHuntSoloV68.tsx` : mêmes props que V67 : `checkpoint`, `bindings`, `externallyPaused`, `reducedMotion`, `persistenceError`, `onCheckpoint(state):boolean`, `onProgress(receipts,state):Promise<boolean>`, `onExit()`, `onReturnToCity():Promise<boolean>`, `onOpenSettings()`.
- `app/game/firstHuntSoloV68Rendering.ts` : atlas natifs V48/V49/V52/V53 existants, orientations indépendantes. Les deux compagnons originaux partagent l’atlas du rival ; leur nom, taille et marqueur les distinguent. Aucune animation nouvelle n’est revendiquée.

## Sauvegarde et validation anciennes

Ajouter `soloV68?: SoloV68Campaign | null` au `SaveGame`, défaut `null`, parser/check strict avant normalisation, protection version future et routage `soloV68NeedsScene` vers la scène active. Utiliser les mêmes garde-fous de propriétaire, révision, écriture durable et reprise que V67. `soloV68MatchesSave(raw)` refuse une reconnaissance isolée, exige les chapitres précédents complets et exige le rite Young Blood si et seulement si le chapitre V68 est terminé.

Les anciennes validations ont actuellement des clauses strictes `chronicle.rites.length===1` / `item.id!=="nursery-recognition"`. Les compléter **sans accepter un rite autonome** :

1. Dans les prérequis `campaignSoloV66.ts` et `campaignSoloV67.ts`, accepter une chaîne de deux rites uniquement si `normalizeSoloV68Campaign(raw.soloV68)?.status === "completed"` ET `soloV68MatchesSave(raw)` sont vrais. Sinon garder exactement le rite nursery unique. Le modèle V68 lit les anciens normalizers mais n’appelle pas leurs `MatchesSave`, évitant une récursion.
2. Dans `youthCampaignMatchesSave`, autoriser en plus `unguided-hunt-recognition` uniquement sous la même preuve V68 complète valide. Les autres rites restent refusés. Les trois preuves `first-tracks`, `training-completed`, `unguided-hunt` restent rattachées à leurs chapitres existants.
3. `normalizeNurseryCampaign` accepte déjà les rites futurs valides normalisés pour un prologue terminé. Ne pas relâcher son état actif.
4. Parse/checker du `save.ts` appelle `soloV68MatchesSave` en plus de V66/V67/youth, avant de reconstruire le save ; conserve le champ complet au normalize/export/import.

La progression chronicle gagne Young Blood. Le `profile.rankId` historique garde sa valeur pour éviter de modifier l’ancien système d’honneur, puisqu’un nouveau joueur portait déjà un `profile.rankId` young-blood malgré son statut narratif Unblooded. Les accès doivent continuer à consulter la chronicle réelle.

## Départ et reprise

Après les neuf reçus V67 et le salut réel du chef/mentor, proposer un bouton distinct `data-solo-v68-enter` au mentor du dojo. Après lancement durable, `soloV68NeedsScene` réouvre automatiquement le checkpoint actif après un rechargement. Après `complete`, le retour à la cité ne se fait qu’une fois le dernier reçu écrit ; la chronique conserve deux rites.

Le bouton tactile `Suivre / Attendre` correspond à `pit.p1AttackMedium` (Y sur manette). À moins de 85 unités d’un compagnon joint et non blessé, une nouvelle pression alterne le suivi. La mise à couvert des partenaires pendant la clairière est gérée par leur déplacement réel, sans téléportation. Leur blessure conserve leur position réelle au refuge. La reprise exige un relâchement des touches.

## Sources et limites

Source locale `work/v36/progression-art-specs/progression-thread.json`, thread `6aa9f019-c838-83eb-9cb1-e58acfb2027e`, « Progression des rangs Predator » : formation + chasse autonome + évaluation au retour ouvrent Young Blood ; cohorte de 12 à 40 jeunes mise en scène, terrain centré sur une triade ; Blooded reste un rite ultérieur contre une proie reconnue. Le texte précise qu’il s’agit d’une tradition du clan jouable, pas d’une hiérarchie universelle.

Le Temple des Trois Ombres, la chasse réelle au Quatza-Rij et le Premier Sang contre un xénomorphe ne sont pas livrés par ce chapitre. Aucun brouteur n’est renommé Quatza-Rij et aucun décor d’entraînement n’est déclaré copie 1:1 d’un lieu canonique. Les marqueurs du refuge désignent une cache de secours ; le rendu ne présente pas de dessin improvisé comme medicomp canonique.
