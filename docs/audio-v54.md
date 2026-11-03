# Audio V54 — premier lot livré

## Demande retrouvée et portée

Source locale intégrale : `tmp/chatgpt-audit-2026-09-08/share-3.conversation.md`, issue de la [discussion audio](https://chatgpt.com/share/6a9f6cfe-c468-83eb-9e9d-8fc3f8409d90). La demande utilisateur est de chercher un vrai fichier dans un dossier déterminé, tout en laissant le jeu fonctionner quand ce fichier manque. Le long contrat technique qui suit est une proposition de l'assistant archivée, pas une nouvelle instruction de l'utilisateur. Le système décrit était déjà implémenté ; V54 le remplit et corrige son transport.

L'autorisation utilisateur actuelle de chercher des sons sur Internet permet ce premier téléchargement. Aucun achat, API payante, doublage, musique de film, extraction de jeu ou enregistrement officiel Predator/AVP n'est utilisé. Les sons sont une adaptation du projet, sans promesse de fidélité sonore canonique 1:1.

## Fichiers réellement livrés

22 fichiers PCM WAV mono, 44,1 kHz, 16 bits, **1 572 214 octets** au total : les 21 identifiants SFX existants et l'ambiance `ship`. Le moteur utilise ces fichiers, avec les mêmes chemins historiques et les mêmes bus que ses secours. Les marqueurs `missing.txt` restent inoffensifs lorsqu'un vrai fichier est présent.

| Identifiant du jeu | Pack / fichier source original | Adaptation |
| --- | --- | --- |
| ui | Interface Sounds / `Audio/click_001.ogg` | clic discret |
| select | Interface Sounds / `Audio/confirmation_002.ogg` | confirmation |
| jump | RPG Audio / `Audio/cloth1.ogg` | froissement du saut |
| footstep | RPG Audio / `Audio/footstep03.ogg` | pas |
| slash | RPG Audio / `Audio/knifeSlice.ogg` | mouvement de lame |
| plasma | Sci-fi Sounds / `Audio/laserLarge_000.ogg` | tir énergétique original au projet |
| scan | Sci-fi Sounds / `Audio/computerNoise_000.ogg` | extrait de 380 ms |
| cloak-on | Sci-fi Sounds / `Audio/forceField_000.ogg` | activation |
| cloak-off | Sci-fi Sounds / `Audio/forceField_001.ogg` | désactivation |
| mask-on | RPG Audio / `Audio/metalLatch.ogg` | verrou mécanique |
| mask-off | RPG Audio / `Audio/metalClick.ogg` | déverrouillage |
| weapon-switch | RPG Audio / `Audio/drawKnife2.ogg` | sortie d'équipement |
| medicomp | Sci-fi Sounds / `Audio/laserSmall_002.ogg` | signal d'outil, sans imitation officielle |
| netgun | Sci-fi Sounds / `Audio/thrusterFire_000.ogg` | extrait de 280 ms |
| snare | RPG Audio / `Audio/clothBelt.ogg` | tension de sangle |
| enemy-alert | Interface Sounds / `Audio/question_003.ogg` | avertissement court |
| objective | Interface Sounds / `Audio/confirmation_004.ogg` | validation |
| hit | RPG Audio / `Audio/dropLeather.ogg` | impact mat, sans violence sonore graphique |
| ambience/ship | Sci-fi Sounds / `Audio/spaceEngineLow_000.ogg` | boucle moteur de 4,75 s |
| trophy, victory, defeat | synthèse originale du projet | 3 motifs courts, sans échantillon tiers |

Les 19 adaptations externes ne sont pas décrites comme des prises de son réelles : les techniques de création de Kenney ne sont pas affirmées. Les trois motifs de résultat sont explicitement **procéduraux originaux**. Une pose, un son ou un manifeste ne constitue pas un doublage, un cycle d'animation ou une bande musicale complète.

## Provenance et redistribution

Licences vérifiées le 27 septembre 2026 sur les pages primaires de l'auteur : [Interface Sounds](https://kenney.nl/assets/interface-sounds), [RPG Audio](https://kenney.nl/assets/rpg-audio), [Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds). Les trois packs portent **CC0-1.0**, qui permet notamment copie, adaptation et redistribution commerciale selon la [déclaration Creative Commons](https://creativecommons.org/publicdomain/zero/1.0/). Cela ne donne aucun droit supplémentaire sur la franchise, ses marques ou ses personnages et n'implique aucun soutien de Kenney.

`public/audio/provenance-v54.json` enregistre les URL primaires, URL d'archives, SHA-256 des ZIP, SHA des sources OGG, licence, traitements, amplitudes et SHA de chaque WAV livré. Les licences des ZIP sont conservées sous `public/audio/licenses/` ; seuls les espaces de fin de ligne et retours ont été normalisés. L'empreinte du texte original est également conservée. Les ZIP sources restent sous `outputs/qa-commercial-audit/v54/audio/sources/` (7,7 Mo, pas publiés avec le jeu).

## Préparation et mixage

`scripts/build-audio-pack-v54.mjs` est un outil **explicite et hors ligne**, jamais appelé au lancement ou pendant le build du jeu. Il exige les trois ZIP avec leurs empreintes attendues. Il décode les sources avec Chromium/OfflineAudioContext, moyenne les canaux, applique une attaque de 3 ms et une sortie de 12 ms aux effets, retire le continu et borne crête/RMS. Les limites par effet et le gain exact sont dans la provenance. Aucun WAV n'atteint la saturation : crête maximale 0,30 avant le bus général déjà atténué du moteur.

La boucle moteur reçoit un recouvrement circulaire de 250 ms avec interpolation cosinus, sans silence de début/fin ajouté. Son raccord est comparé aux différences naturelles entre échantillons voisins. Le volume d'ambiance continue d'utiliser le bus « musique/ambiance » historique ; le bus effets reste indépendant. Les fichiers font moins de 5 s chacun ; aucun gros décodage musical n'est ajouté au démarrage.

```powershell
$env:TEMP='E:/CodexTemp/yautja-v53-validation-tmp'
$env:TMP=$env:TEMP
node scripts/build-audio-pack-v54.mjs
node scripts/build-audio-manifest.mjs
node --experimental-strip-types --test tests/audio-files.test.mjs tests/audio-manifest.test.mjs tests/sound-lifecycle.test.mjs tests/audio-pack-v54.test.mjs
node scripts/verify-audio-v54.mjs
```

## Transport corrigé

`GameAudio.setPaused(boolean)` suspend temporairement le contexte et les streams, conserve leur tête de lecture et **ne modifie pas le mix sauvegardé**. Les événements courts reçus pendant la pause sont abandonnés, pas rejoués ensuite. Les chargements devenus obsolètes sont invalidés ; la scène la plus récente reprend. Les transitions asynchrones pause/reprise sont sérialisées pour éviter qu'une ancienne suspension termine après une reprise plus récente.

Fermer un menu ne crée pas de contexte et ne réalise pas un premier déverrouillage. Lorsque l'API `navigator.userActivation` est disponible, la première activation attend une interaction réelle. Les demandes d'ambiance/musique antérieures sont mémorisées puis reprises au premier déverrouillage. Un chemin de musique qui consultait trop tôt le manifeste a été corrigé : avant ce geste, aucun contexte ni requête audio.

Raccord GameClient effectué par le responsable d'intégration et relu : `setPaused(settingsOpen || document.hidden)` dans un effet avec écouteur `visibilitychange` nettoyé. L'ambiance `ship` est maintenant réservée au pont et aux stations ouvertes depuis le pont ; elle n'est plus appliquée par défaut à la cité ou à toutes les scènes. Les expéditions désert/volcan et les missions conservent leurs biomes. Les écrans jeunesse utilisent déjà leur propre coupure `effectivePaused`; aucun écran jeunesse, PIT ou Homeworld n'a été modifié dans le lot audio.

## Vérification et limites

- 31 tests Node ciblés PASS : inventaire, erreurs et formats, chargements lents, concurrence, ownership des streams, nettoyage, pause/reprise, aucun événement tardif, véritables fichiers PCM/SHA et raccord de boucle.
- Recette `scripts/verify-audio-v54.mjs` : Chromium réel, 22 décodages, activation par clic natif, effets issus des fichiers, mesure du signal dans les bus, muet, pause de tête de lecture et reprise, changement de scène, fichier corrompu et arrêt. Rapport détaillé sous `outputs/qa-commercial-audit/v54/audio/browser-qa/report.json`.
- Le premier échec du harnais est conservé (`initial-harness-gesture-error.json`) : appeler le scénario pré-geste depuis CDP `evaluate` lui conférait une activation. Les appels de démarrage sont maintenant exécutés directement par le script de page. La vraie requête manifeste prématurée ensuite découverte est conservée dans `premature-manifest-before-fix.json` et corrigée dans le moteur.
- Cette recette vérifie le moteur et les fichiers dans un harnais local réel ; elle ne remplace ni le parcours complet de l'interface du jeu, ni une écoute critique au casque/haut-parleurs, ni la validation Safari/iOS. Pas de prétendue approbation artistique à l'oreille.
- **Restent absents : 7 contextes musicaux, 8 autres ambiances de biome, voix et doublages.** Leurs témoins et secours restent utilisables. Pas de bande originale complète annoncée.

Le lot audio ne fait pas de build global, commit, push ou publication : ces étapes restent coordonnées par la tâche principale.
