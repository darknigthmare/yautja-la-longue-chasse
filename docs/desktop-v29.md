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
- entrée dans THE PIT avec les PNG exacts Jungle Hunter et Berserker, route galactique, lancement et suspension d’une chasse.

La preuve d’exécution est `tmp/desktop-qa/v29/verification.json`, accompagnée de captures Homeworld, Justice et THE PIT. **La présence du script ne vaut pas réussite : seule une exécution avec `passed: true` qualifie l’EXE produit.** Le test utilise une fenêtre masquée et une horloge navigateur contrôlée avec les vraies touches. La fenêtre masquée ne produisait qu’un callback requestAnimationFrame en 800 ms malgré le focus et la visibilité ; la recette pilote donc la cadence sans modifier le moteur ni injecter de sauvegarde. Elle ne certifie pas la cadence sur écran réel, le matériel physique, les performances ni toute la campagne.

Pour jouer, extraire tout le portable et lancer `Yautja-La-Longue-Chasse.exe`. Les sauvegardes habituelles restent dans `%APPDATA%\YautjaLaLongueChasse`, séparées du navigateur. Conserver ce dossier lors des mises à jour ; l’export/import du jeu permet le transfert de campagne.

## Résultat exécuté le 8 septembre 2026

La construction et la recette de l’EXE ont réussi : `npm run package:windows`, puis `npm run qa:desktop` avec `passed: true`, zéro erreur JavaScript et zéro requête locale échouée. Les réglages, l’export natif, la cité (PNJ et première preuve), l’entrée/retour des Marches, le choix d’enquête des Enforcers, les deux PNG du combat, la route galactique et la suspension de chasse ont été exercés. Les octets de campagne, la preuve, le dossier, la chasse suspendue et le réglage ont été conservés après fermeture réelle et nouveau processus.

Le paquet exécute le commit source `866a797343761a8d0ee23d3fb88707a597d427ba`. Les adaptations ultérieures concernent la recette et cette preuve, pas le binaire. L’empreinte des 2 001 fichiers sources était identique avant et après compilation :
`11ab365174380f461c0096252da7fe30ac2c0cd55b2b06bbda1bb831344baaf4`.

| Élément | Résultat |
| --- | --- |
| Version | 1.0.29, Electron 44.2.0, Windows x64 |
| ZIP portable | `tmp/desktop-release/v29/Yautja-La-Longue-Chasse-PC-V29.zip` |
| Taille ZIP | 441 353 467 octets |
| SHA-256 ZIP | `6eff4b304b77a26deb942fa6e37bd77653057b3837da4221117e81633c5219c0` |
| SHA-256 EXE | `edc9fa8d71193ff47808857ba4dcc26308d3b1900da75c650408f5c328368b42` |
| SHA-256 app.asar | `2933cef8ee7b7c0ea1a0383edd46d9798d31ba93ffa43259d315f6f78c858b0b` |
| Inspection | 77 entrées ZIP, 2 109 entrées ASAR ; aucune source privée, sauvegarde, `.env` ou dépendance de développement |
| Audio | 37 emplacements dans le manifeste local ; aucun enregistrement de production fourni |

Les captures natives ont été inspectées visuellement. Le ZIP V25 reste présent à son emplacement précédent (425 771 120 octets). La preuve résumée est conservée dans [desktop-v29-qa.json](desktop-v29-qa.json). L’archive est locale ; elle n’a pas été envoyée à un hébergeur par cette recette.
