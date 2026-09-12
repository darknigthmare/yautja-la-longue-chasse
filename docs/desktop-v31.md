# Édition PC 1.0.31 — préparation

Cette édition portable Windows x64 correspond au contenu V31. Elle reste un jeu de fan non commercial, non signé et en développement. Le numéro 1.0.31 ne constitue ni une certification commerciale, ni une validation de campagne complète, ni une certification Steam Deck.

## Construction prévue

Le paquet doit être construit uniquement depuis un commit propre. La commande suivante régénère l’inventaire audio, construit le renderer Vite hors ligne puis prépare l’application Electron :

    npm.cmd run package:windows

La sortie attendue est tmp/desktop-release/v31/Yautja-La-Longue-Chasse-win32-x64/ et le manifeste attendu est tmp/desktop-release/v31/manifest-v31.json. Il doit enregistrer le commit source, l’empreinte des sources, Electron, la version 1.0.31 et les SHA-256 de l’EXE et de app.asar. Le script refuse un arbre source desktop non commité ou un renderer devenu périmé.

Les éditions V25 et V29 restent dans leurs répertoires historiques. La sortie V31 est isolée et ne doit pas les remplacer.

## Recettes prévues

Après construction :

    npm.cmd run qa:desktop
    npm.cmd run qa:desktop:package

La première commande doit lancer l’EXE dans un profil temporaire, confirmer la version PC et le marqueur de contenu V31, les protections Electron, les ressources locales, la persistance, la cité 2.5D, THE PIT et les douze salles déclarées par la carte Oseris. La seconde inspecte l’ASAR, refuse les chemins privés ou de développement et recalcule les empreintes du manifeste.

Pour produire ensuite un ZIP qui conserve le dossier racine :

    tar.exe -a -c -f "tmp\desktop-release\v31\Yautja-La-Longue-Chasse-PC-V31.zip" -C "tmp\desktop-release\v31" "Yautja-La-Longue-Chasse-win32-x64"
    npm.cmd run qa:desktop:package -- --zip

La recette avec --zip vérifie la structure, la présence de l’EXE, de app.asar et du LIRE-MOI, puis calcule la taille et le SHA-256 dans tmp/desktop-qa/v31/archive-verification.json.

## État actuel

| Élément | État |
| --- | --- |
| Métadonnées 1.0.31 / V31 | Préparées dans les sources |
| Build Electron V31 | En attente |
| Recette EXE | En attente |
| Inspection ASAR | En attente |
| ZIP portable et SHA-256 | En attente |
| Publication du ZIP | Non prévue par ces scripts |

La présence des scripts et chemins ci-dessus ne vaut pas résultat. Les valeurs exécutées seront recopiées dans docs/desktop-v31-qa.json seulement après une recette avec passed: true.

Le runtime prévu bloque le réseau, garde le renderer dans la sandbox, active l’isolation du contexte et désactive l’intégration Node. Ces contrôles ne certifient pas la cadence sur matériel réel, une manette physique, une session longue, un installateur, une signature ou les droits de commercialisation.
