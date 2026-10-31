# V144 — Preuve de campagne sur le véritable panneau Guerre des clans

**PR de développement :** https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42 · base #40 · **draft**, aucune fusion sur `main`.

## Correctif : codec de préférence après étude débloquée

Le module de sauvegarde `SaveGame V13` est depuis V134 la source autorisée des études réclamées. Le module de préférence V132 restait cependant limité aux modèles « starter » ou « par rang ». Il pouvait donc sérialiser à tort un gauntlet acquis par étude comme `jungle-hunter` lors de la mise à jour de l'ancien stockage local V133.

V144 modifie `parseGauntletPreferenceV132` et `serializeGauntletPreferenceV132` pour recevoir **facultativement** les identifiants d'études *déjà confirmées dans la campagne*. Les anciens appels à trois arguments restent compatibles ; **le stockage local ne contient jamais un reçu de droit** : seulement `{schema,hunter,equipped}`. `useHunterGauntletV133` transmet les revendications du `gauntletV134` de la campagne aux deux côtés du codec.

Les tests `tests/gauntlet-preference-v144.test.mjs` couvrent les **44 études** et vérifient qu'un identifiant sans étude réclamée, une préférence forgée dans un autre profil et une archive au mauvais propriétaire ne permettent pas d'obtenir un objet.

## Navigateur : front V85, armurerie V132, archives de chasse V13

Le banc `tests/browser/gauntlet-campaign-v144.fixture.tsx` monte le **véritable** `ClanWarPanelV85` (atlas V95 et stockage de guerre), et utilise `writeSaveWithStatus` de la campagne réelle, avec les callbacks `gauntletCampaignClaimV134` / `gauntletCampaignEquipV134`. Une chasse d'essai est **explicitement simulée dans cette fixture** en déposant une mission, des scans et un trophée de qualité suffisante — elle **n'est pas un résultat gagné par un utilisateur**.

`scripts/qa-gauntlet-campaign-v144.mjs` utilise le navigateur Chrome pour contrôler :

1. Une étude **non** justifiée reste verrouillée, sans lien de déblocage actif.
2. Le modèle d'étude correspondant à la mission et au trophée d'essai est initialement verrouillé.
3. Le bouton du vrai atelier permet de **valider explicitement** l'étude; un seul reçu est écrit dans la sauvegarde V13.
4. Le bouton « Équiper » sauvegarde le modèle choisi, et le véritable écran holographique montre le même identifiant sans modifier le tour de guerre.
5. Une deuxième validation est refusée ; une autre étude non méritée reste verrouillée.
6. Après actualisation, l'équipement V13 est restauré et l'atlas V95 reste unique.
7. Un second onglet tente de changer l'ancienne préférence `localStorage` vers le modèle bloqué : l'archive V13 reste autoritaire et le modèle de la carte ne change pas.

**Limites fondamentales :** ce contrôle est un test de composants et de stockage sur une campagne d'essai isolée, pas une traversée complète du `GameClient` depuis le titre, ni la preuve d'une chasse réellement jouée par un utilisateur, ni de la synchronisation cloud entre deux appareils différents. Il ne reconstitue aucun prop de film.

## QA, sécurité et absence de régressions

- Les revenus, dégâts, coûts, ordres, combats et résultats des quatre gamemodes ne sont pas modifiés.
- Une étude reçoit le droit d'être équipée uniquement par la **sauvegarde de campagne**, pas par un événement visuel, une URL, un codec local ou le mode Guerre libre.
- Le choix est propre à chaque `save.createdAt` et ne peut pas écraser le front libre d'une autre planète.
- Les deux vues, classique et holographique, demeurent commutables avec un seul atlas V95.
- La CI cible les nouveaux tests et effectue un build TypeScript et Next complet ; captures du navigateur placées dans l'artefact `yautja-real-archive-gauntlet-v144-chrome` si le workflow réussit.

## Statuts de clôture

**Techniquement clôturable après CI verte :** sérialisation de préférences gagnées, validation V13 unique, équipement de la carte et rechargement de l'archive avec étude, refus de préférence locale forgée.

**Toujours ouvert :** UI complète de l'atelier Homeworld à travers le parcours du jeu, sauvegarde cloud multi-appareil, 54 accessoires certifiés 1:1, matériaux et animations fidèles, 3 888 combinaisons du rig, qualité mobile/manette en vraie mission et revue des droits sur la franchise.

Les sources SVG/PNG individuelles sont des **prototypes de travail**, même si elles s'affichent et passent la CI. Aucun film ou jeu tiers n'est reproduit par échantillonnage sonore original.
