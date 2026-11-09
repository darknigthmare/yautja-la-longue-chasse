# Recette native P0/P1 du Clan Ship — 9 novembre 2026

**27 contrôles réussis, aucun échec**, sur le vrai GameClient de production Next,
BuildID `TDA_a9vb2sdq4pe9FwXuE`, Chromium 154.0.8037.57.
Le [reçu final](final-receipt.json) lie code, build, JavaScript servi, recette,
[rapport final](report.json), [rapport brut original](report.browser-run.json)
et [inspection des neuf captures originales](screenshot-inspection.json).
Le rapport final ajoute seulement les constats d’inspection au rapport brut.

Les dix trajets utilisent le **bouton de guidage du terminal**
`data-clan-operation-route`, sans substituer le sélecteur extérieur de salles.
Ils traversent les sept pièces; 1 579 positions du vrai acteur ont été contrôlées
contre la géométrie de marche du moteur. L’accueil, le mandat, l’entraînement et
l’audit d’armurerie sont accomplis par les commandes natives du jeu.

Les 35 ordres spatiaux acceptés exercent les neuf types d’ordre. Chaque état
obtenu est comparé au reducer déterministe réel. La recharge atteint 8/8;
la défaite de formation à 0 survient au tour 10, avant la limite de 16 tours.
Défaite, repli volontaire et victoire conservent leurs issues distinctes.
L’escorte et la récupération sont gagnées dans le navigateur; le paiement est
unique et le rapport d’échec survit au rechargement réel. Les cinq paires de
sauvegarde brute vérifient les lectures sans écriture. Les rubriques répondent
au tactile à 390 et 320 px, sans débordement horizontal.

Pour **OPS-B14**, la recette observe `AudioContext`, les oscillateurs natifs,
leurs fréquences et les appels `start`/`stop`. Tous les appels originaux et nœuds
sont conservés. Les signatures d’ouverture/fermeture, recharge/alerte et résultats
sont réellement programmées; prévisions et anciens rapports ne rejouent pas un
résultat. Le vrai réglage « Audio procédural » coupe le gain maître à 0, puis
le restaure à environ 0,054 sans recréer une ancienne recharge ou alerte.
Le master passe par le limiteur natif avant la sortie. Des oscillateurs peuvent
exister sous un gain maître nul : cela ne constitue pas une sortie audible.
Aucune écoute humaine du mixage n’est revendiquée.

Les fixtures initiales sont déclarées dans [fixture-disclosure.json](fixture-disclosure.json).
La première ne prépare que l’embarquement et un dossier vide; la deuxième prépare
l’accueil et le mandat avec les reducers de production. Aucun résultat de terrain,
recrutement, ordre spatial, gain de combat ou issue spatiale n’est prérempli.
Aucune mutation de campagne ou de simulation n’est injectée après ce départ.
L’observation DOM et audio n’appelle aucun callback de gameplay et ne change
ni horloge, géométrie, santé, récompense ou résultat.

**OPS-F18 et F19 ne sont pas fermées par cette recette** : aucune chasse terrain
n’y est achevée. Les captures n’établissent ni une fidélité canonique 1:1, ni une
revue artistique humaine, ni une manette physique. Les contrôles du guidage et
des projections ne remplacent pas ces étapes de production.

La [première tentative](../attempt-1/README.md) conserve 24 contrôles passés puis
l’échec du détecteur audio direct. La reprise corrige seulement cet observateur,
sans modifier l’application ni reconstruire le jeu.

```sh
CLAN_P0P1_AUDIO_QA=1 \
CLAN_P0P1_QA_URL=http://127.0.0.1:3121 \
CLAN_P0P1_QA_OUTPUT=outputs/p0p1-new-attempt \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
/workspace/.cloud-tools/node22/node_modules/node/bin/node \
  scripts/qa-clan-ship-p0p1-20261109.mjs
```

La sortie doit être neuve : `recipe-run.lock` interdit tout écrasement silencieux.
Le navigateur requiert l’accès aux sockets locaux; la commande a été exécutée
hors du sandbox de processus. Le jeu reste le serveur de production local.
