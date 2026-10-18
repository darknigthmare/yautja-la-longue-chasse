# PR #4 — Entraînement jouable, suite 07

Base : `f64227a34a9e3df00a5723837f5f18cf5c09cccf`. Aucun changement de la branche main.

## Correctifs raccordés

Le composant TrainingDrill utilise maintenant useTrainingDrillRuntimeV94 pour ses cinq disciplines existantes : ciblage, lames de poignet, camouflage, mobilité et duel d’honneur. Les séquences déterministes, le nombre de gestes, les fenêtres de réponse et le calcul du score sont inchangés.

La simulation se suspend hors focus, quand la page est cachée, sous un ancêtre inert/hidden/ARIA indisponible et lorsque le composant reçoit suspended. Les gestes refusés ne consomment pas de signal et le retour ne rattrape pas le temps absent. Une annulation ou un démontage rend les anciens callbacks inactifs.

La manette pilote désormais réellement le composant : gauche/droite, A et B pour les quatre gestes ; View/Retour (bouton 8) abandonne. B reste un geste, pas une annulation. Le contrôleur exige le neutre à l’entrée, après une interruption ou un changement de contrôleur. Les appuis simultanés ambigus ne consomment pas plusieurs signaux. A démarre ; un nouvel appui après le résultat le transmet. Le dernier geste ne peut pas aussi consigner le score.

Le bouton de consignation utilise le même verrou de transmission que le clavier et la manette. Un double clic ou un callback réentrant ne transmet pas deux résultats. Une exception du parent affiche une transmission non confirmée, sans rejouer automatiquement une écriture potentiellement effectuée. Le bouton affiche alors « Transmission non confirmée » et non un succès. Le résultat reste visible et la fermeture reste possible. Cela ne constitue pas une confirmation de persistance par le parent.

Les boutons natifs et raccourcis remappés sont conservés. Un clic secondaire ou un second pointeur tactile ne valide plus de geste. Le bloc de styles du composant est inchangé. Le modèle de sauvegarde, les dépendances et les fichiers artistiques sont inchangés.

## Validation locale

25 tests du code réel avec ordonnancement React/DOM/RAF instrumenté : 25 réussites. 17 de ces cas échouent sur le composant antérieur ; ce n’est pas un décompte de 17 bugs indépendants. La fixture navigateur est compilée avec esbuild mais aucune exécution Chrome locale n’est revendiquée.

La CI permanente inclut les 25 tests, les quatre tests historiques training-drill, le lint des deux fichiers applicatifs et 16 scénarios du véritable composant React. Cinq séquences sont jouées par les boutons, le clavier remappé ou une manette émulée, sans injecter de score. Les résultats CI doivent être rattachés au SHA testé avant d’être annoncés comme réussis.

## Limites et chantier suivant

La chaîne de persistance des trophées de GameClient est encore à corriger : completeTrophyWorkshop appelle persist puis ferme et affiche la réussite sans vérifier une confirmation durable. Ce défaut a été relu à la base indiquée ; il n’est pas corrigé par cette passe. Aucun trophée de campagne n’est artificiellement ajouté.

Le hook d’entraînement ne change pas la responsabilité de ShipHub pour l’enregistrement des scores. Les tests observent les callbacks et la simulation, pas une nouvelle campagne complète ni un appareil physique. Le patch de combat auparavant livré séparément reste hors de la branche. Les DLC, l’intégration campagne des guerres de clans et la production artistique restent ouverts.
