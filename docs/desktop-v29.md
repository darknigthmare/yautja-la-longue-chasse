# Édition PC 1.0.29 — requalification

Cette édition reste un jeu de fan non commercial, non signé et en développement. Le numéro 1.0.29 identifie le lot technique ; il ne constitue ni une certification commerciale, ni une validation de campagne complète, ni une certification Steam Deck.

## Construction traçable

`npm run package:windows` régénère l’inventaire audio, construit le renderer Vite existant, puis prépare le portable Electron Windows x64. Aucun changement de runtime ni installation de dépendance n’est nécessaire.

Les empreintes avant/après compilation doivent être identiques. Le packaging refuse un arbre source non commité ou un renderer qui ne correspond plus aux sources. Le manifeste PC enregistre le commit exact, l’empreinte des sources, la version Electron et les SHA-256 de l’EXE et de `app.asar`.

La sortie V29 est isolée dans `tmp/desktop-release/v29/`. L’ancienne édition V25 et son ZIP ne sont ni remplacés ni supprimés. Les seuls fichiers copiés dans l’application sont le renderer compilé, le démarrage Electron, le protocole local et les métadonnées de version. Les sources privées, clés, fichiers `.env`, sauvegardes et outils de build ne sont pas embarqués.

## Audio hors réseau

Le protocole `yautja://game` autorise l’inventaire `/audio/manifest.json` et les extensions audio prises en charge. Les fichiers témoins et fichiers privés restent interdits. Les longues pistes sont servies comme flux locaux avec prise en charge des plages d’octets, sans charger le fichier entier en mémoire.

Les autres protections restent en place : sandbox Electron, isolation du contexte, intégration Node désactivée, réseau HTTP/WebSocket bloqué, chemins locaux contraints à la racine du renderer et politique CSP restrictive.

## Vérification de la version produite

`npm run qa:desktop` lance l’EXE V29 dans un profil temporaire distinct du profil réel du joueur et vérifie :

- version, démarrage, protections, refus du réseau et lecture des images et du manifeste audio intégrés ;
- réglage réel, export natif et persistance après redémarrage ;
- parcours Homeworld au clavier, rencontre, première preuve et entrée/sortie des Marches de Cendre ;
- ouverture du dossier des Enforcers, choix d’enquête sans modification de l’honneur et conservation du dossier ;
- entrée dans THE PIT, route galactique, lancement et suspension d’une chasse.

La preuve d’exécution est `tmp/desktop-qa/v29/verification.json`, accompagnée de captures Homeworld et Justice. **La présence du script ne vaut pas réussite : seule une exécution avec `passed: true` qualifie l’EXE produit.** Le test utilise une fenêtre masquée et n’évalue pas le matériel physique, les performances ni toute la campagne.

Pour jouer, extraire tout le portable et lancer `Yautja-La-Longue-Chasse.exe`. Les sauvegardes habituelles restent dans `%APPDATA%\YautjaLaLongueChasse`, séparées du navigateur. Conserver ce dossier lors des mises à jour ; l’export/import du jeu permet le transfert de campagne.
