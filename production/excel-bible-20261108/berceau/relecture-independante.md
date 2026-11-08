# Relecture indépendante de la reprise du Berceau

**Date : 8 novembre 2026.** Objet : comparer le validateur de snapshot à la
simulation réelle, rechercher les sauvegardes légitimes rejetées et les données
mal formées pouvant bloquer une reprise, puis relire la remise à zéro des entrées.
La relecture n'a modifié aucun fichier runtime. Les corrections ont été réalisées
par l'agent responsable de l'intégration et relues ensuite.

## Méthode reproductible

Depuis la racine du dépôt, après installation des dépendances verrouillées :

```sh
node production/excel-bible-20261108/berceau/sonder-snapshots.mjs
```

Le script charge les vrais modules TypeScript via le chargeur déjà utilisé par
les tests. Il appelle `stepBuriedCradle`, puis soumet chaque résultat brut à
`inspectBuriedCradleSnapshot`. Aucun champ n'est supprimé, normalisé ou corrigé
entre ces deux appels dans la version conservée.

La graine est `447711`. Les 12 salles sont chacune amorcées dans deux états,
Matriarche vivante ou déjà vaincue, soit 24 épisodes. Les positions initiales
utilisent le premier appui de `mainRoute`. La progression initiale est préparée
explicitement pour couvrir les salles ; en T10 avant victoire, l'anneau reste
fermé et T11/T12 sont retirées des salles visitées. Le budget de checkpoints est
2. Chaque épisode compte au maximum 5 000 appels et s'arrête à l'extraction ou
au premier rejet. Les pas testés sont 1/60, 0,05, 0,016, 0,25 et 0,0083 seconde.
Les mouvements, sauts, frappes et interactions proviennent du générateur
déterministe. Les états contrôlés après l'amorçage sont tous produits par la
simulation, sans modifier leurs résultats.

## Résultat final observé

**76 803 états inspectés ; aucun rejet de snapshot.** La sortie complète et les
empreintes SHA-256 des sources examinées sont conservées dans
`sondage-snapshots-resultat.json`.

| Événement observé | Nombre |
| --- | ---: |
| Changement de salle | 90 |
| Dégâts reçus | 38 |
| Ouverture de raccourci | 7 |
| Porte fermée | 3 |
| Partie coupée | 3 |
| KO avec reprise à la balise | 3 |
| Ouverture du drainage | 1 |
| Prélèvement de crête | 2 |
| Extraction | 11 |

Le Y du joueur varie de 61,66565233333336 à 508 ; sa vitesse verticale varie de
−704,645 à 914,0433333333339. Ces valeurs restent acceptées par les limites du
snapshot. Le contrôle a été répété après les corrections sans le nettoyage
temporaire utilisé pour isoler le premier défaut.

## Défauts reproduits et correction relue

| Défaut initial | Reproduction / conséquence | Vérification finale |
| --- | --- | --- |
| Champs `hitCeiling` et `hitWall` copiés dans le joueur | `createBuriedCradleRun()`, puis `stepBuriedCradle(run, {}, 1/60)` produisait un joueur avec deux clés interdites par `exact` ; sauvegarde rejetée dès la première frame | La simulation copie maintenant seulement les champs persistés ; les 76 803 résultats bruts passent |
| Répétition clavier après `clear()` | Une direction ou un saut effacé pouvait être réarmé par `keydown` avec `repeat: true` | La répétition ne réarme plus une touche effacée |
| Ancien `armed` réinjecté après Pause manette | Le même tick conservait `old.armed`, appelait `clear()`, puis restaurait l'ancien `true` | `pauseEdge` conserve `armed: false` ; blocage immédiat pendant la transition |
| `boss.attack: ["puncture"]` accepté | La coercition en chaîne acceptait un tableau JSON ; au stade actif, la simulation lançait un `TypeError` en lisant `.some` d'un rectangle d'attaque absent | Les enums doivent être de vraies chaînes ; le snapshot est rejeté avant simulation |
| `boss.pools[0].x: "640"` accepté | La somme `x + width` devenait `"640144"` ; un joueur à X=1780 perdait 8 PV, contrairement au contrôle avec X numérique | Le X des flaques doit être un nombre égal à 640 ou 1120 ; la chaîne est rejetée |
| Extraction déclarée hors balise | Un run aux pieds (96,624) en T01, avec `extracted: true`, passait le validateur et l'action d'extraction | Le snapshot et l'action sont rejetés hors des positions d'extraction réellement autorisées |
| Statut de campagne sous forme de tableau | `status: ["active"]` pouvait être déclaré valide mais ne répondait plus aux transitions de reprise | Le statut doit être une chaîne ; la campagne mal formée est rejetée et conservée |

Les variantes mal formées ont été produites dans des copies temporaires de
states pour vérifier la frontière de validation ; elles ne sont pas présentées
comme des états de jeu légitimes. Après correction, appeler directement la
simulation avec ces données interdites reste hors contrat : c'est leur rejet
avant restauration qui a été confirmé.

## Entrées et limites de cette preuve

La relecture vérifie que `clear()` réinitialise les cartes clavier/tactile et
désarme la manette. Le tactile dispose des sorties `pointerup`, `pointercancel`
et `lostpointercapture`. Les gardes de répétition clavier et le traitement de
`pauseEdge` ont été vérifiés dans le code corrigé.

**Aucun navigateur, appareil tactile ou contrôleur physique n'a été exécuté
pour cette relecture.** Elle ne prouve ni rendu des images, ni capture de focus
sur un navigateur particulier, ni comportement du matériel. Les scènes n'ont
pas été jouées de bout en bout par ce sondage. Les salles visitées et les états
déjà vaincus sont des conditions initiales préparées, et les deux prélèvements
ne prouvent donc pas deux victoires obtenues depuis le début de campagne.

Le sondage ne constitue pas une preuve exhaustive de tous les états possibles
et ne remplace pas les tests dédiés des trois phases, de la vraie victoire,
des budgets 0/1, des archives et de l'écriture durable. Ces tests appartiennent
à la suite de l'intégration, suivie séparément dans ce dossier. Aucun blocage
concret supplémentaire n'a été trouvé dans le périmètre de cette relecture.
