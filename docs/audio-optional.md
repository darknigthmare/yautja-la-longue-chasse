# Audio facultatif — fichiers et secours

Implémentation du brief ChatGPT [« Vérifier et jouer les sons »](https://chatgpt.com/share/6a9f6cfe-c468-83eb-9e9d-8fc3f8409d90) récupéré intégralement le 8 septembre 2026 (archive locale `tmp/chatgpt-audit-2026-09-08/share-3.conversation.md`). Aucun enregistrement tiers n’a été téléchargé ou présenté comme livré.

## Utilisation

Les **37 emplacements** couvrent les 21 `GameSfxId`, les 9 `GameAudioBiome` et les 7 contextes de musique : `menu`, `ship`, `galaxy`, `homeworld`, `exploration`, `combat`, `boss`.

Ajouter par exemple un vrai fichier dans `public/audio/sfx/plasma/mon-tir.wav`. Son nom est libre. Garder ou supprimer `missing.txt` ne change pas la sélection : un fichier réel est toujours prioritaire. Les témoins décrivent le slot et le secours prévu ; ils ne sont pas des fichiers audio vides.

Lancer `npm run audio:manifest` pour reconstruire l’inventaire. `npm run dev` le surveille pendant le serveur vinext existant. `npm run build` et `npm run build:desktop` le régénèrent automatiquement. Sur Vercel, la commande de compilation régénère aussi le manifeste avant Next. **Une version déjà publiée ne change qu’après une nouvelle compilation et publication.**

Au moment de cette livraison, les 37 emplacements ont un témoin et **aucun enregistrement de production fourni**. Le jeu conserve ses sons et ambiances procéduraux. Les musiques manquantes restent silencieuses.

## Inventaire et formats

`scripts/build-audio-manifest.mjs` lit les unions de types dans `app/game/sound.ts`, puis les dossiers côté Node. `public/audio/manifest.json` contient tous les slots attendus, leurs sources réelles, tailles, types MIME et SHA-256. Le versionnement du contenu ajoute une empreinte à chaque URL ; remplacer les octets d’un fichier invalide ainsi son ancienne URL de cache.

Priorité stable : OGG, MP3, M4A, WAV, FLAC, AAC, WebM, Opus, puis nom de fichier. Il s’agit d’encodages candidats du même événement, jamais de variantes aléatoires. `AUDIO_FORMATS` peut être étendu. `canPlayType()` filtre les incompatibilités connues ; un vrai décodage ou démarrage de lecture reste nécessaire. Une source inutilisable laisse essayer la suivante.

Les fichiers texte, temporaires, cachés, dossiers, liens et fichiers audio de zéro octet ne sont pas inventoriés comme sources. Une racine absente produit un manifeste avec secours, sans empêcher la compilation. Le watcher ignore ses propres sorties pour éviter les boucles.

Racine alternative : `--root <dossier>` et `--public-base /chemin-public` (ou `YAUTJA_AUDIO_ROOT` / `YAUTJA_AUDIO_PUBLIC_BASE`). Le dossier doit être réellement servi à ce chemin. Pour un manifeste ailleurs que `/audio/manifest.json`, instancier `new GameAudio({ manifestUrl: "/chemin-public/manifest.json" })`. Aucune exploration de dossiers ne se fait dans le navigateur.

## Lecture et mixage

`GameAudio` reste l’API utilisée : `playSfx`, `plasma`, `footstep(intensity)`, `cloak(on)`, `mask(on)`, les autres méthodes directes et `startAmbience` bénéficient tous des fichiers. `OptionalAudioFiles` est une partie interne de ce moteur, connectée à ses bus existants. Le volume principal, musique, effets et le mode muet s’appliquent aux fichiers comme aux secours.

Un SFX prêt joue immédiatement. Sinon, seul le secours immédiat joue, puis le chargement peut préparer l’événement suivant. **La fin d’un chargement ne rejoue jamais un ancien tir.** Le déverrouillage doit partir d’une interaction utilisateur sans mettre les SFX en attente derrière `await unlock()` : appeler `void audio.unlock(); audio.playSfx(id);`. Si le navigateur n’est pas encore prêt, cette première interaction peut rester silencieuse.

Les SFX décodés sont limités à 12 Mio et 30 secondes, avec trois chargements concurrents. Les musiques et ambiances utilisent un élément audio en streaming connecté au graphe Web Audio, pas un décodage de toutes les longues pistes au lancement. Les requêtes/décodages et démarrages ont un délai borné de huit secondes. Une source inutilisable n’est pas retentée à chaque tir : deux essais au maximum par version, espacés d’au moins une minute. Un refus d’autoplay reste `blocked`, et peut être repris lors d’un déverrouillage utilisateur ultérieur.

`setMusicContext(context, { fadeSeconds })`, `stopMusic(fadeSeconds)` et `preloadSfx(ids)` complètent l’API. Le menu, le vaisseau, la galaxie, Homeworld, l’exploration, les combats et boss sont branchés par les écrans de jeu. Changer vers un contexte sans musique arrête la piste précédente ; cela ne laisse pas une musique de combat jouer indéfiniment. L’ambiance du lieu reste indépendante de la musique. Pause, sortie de scène et `dispose()` invalident les demandes devenues inutiles et nettoient leurs sources/écouteurs/temporisations.

## Diagnostic et vérification

`audio.getAudioDiagnostics()` renvoie par slot : dossier, fichiers, source retenue, état (`absent`, `loading`, `ready`, `unusable`, `blocked`, `disabled`) et utilisation du secours. Aucun son absent ne déclenche d’alerte intrusive. `npm run audio:qa` vérifie l’inventaire et les contrats du moteur ; le compteur exact est celui de la sortie de test.

Un contrôle dans Chrome a également utilisé des WAV **de test uniquement**, servis par une fixture locale : décodage réel, chargement lent sans SFX tardif, source de musique corrompue suivie d’une source lisible, mix à zéro, changement vers une musique absente, puis destruction du moteur. Aucun de ces sons de test n’est ajouté aux assets de production. Les résultats sont dans `docs/audio-optional-browser-qa.json`.

Les dialogues et le gameplay ne dépendent d’aucune durée audio. Ce lot ne fournit ni doublage, ni bande originale, ni validation artistique des futurs enregistrements.
