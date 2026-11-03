# Récupération privée des sources ChatGPT — V37

Le connecteur `read_thread` limite les messages à 20 000 caractères. Son curseur pagine les tours, pas l'intérieur d'un message : une page suivante ne restaure pas un message coupé. Les références `chatgpt-content-reference` ne sont pas des URL de téléchargement.

## Parcours actuel sans connexion

Le navigateur dédié, port local `54837`, peut afficher certains liens partagés déjà autorisés même lorsque l'accès aux conversations privées renvoie une erreur d'authentification. La présence de textes sur un partage ne garantit ni l'accès aux pièces jointes ni celui au dossier privé. Le choix actuel est de continuer sans connexion ; aucune connexion, export de cookies ou contournement n'est demandé.

Depuis ce dépôt, pour un partage déjà fourni par l'utilisateur :

```powershell
node scripts/capture-chatgpt-thread.mjs 6a9f6ce6-2548-83eb-a8ee-152b84e89fe5 54837 --share
# Optionnel : tenter les liens de fichiers observés sur ce même partage.
node scripts/capture-chatgpt-thread.mjs 6a9f6ce6-2548-83eb-a8ee-152b84e89fe5 54837 --share --download
py -3 scripts/audit-chatgpt-download.py <fichier-telecharge.zip>
```

Sans `--share`, l'URL visée est `/c/<uuid>` ; ce mode reste dépendant d'un accès privé déjà disponible. `--share` vise exclusivement `/share/<uuid>` et ne crée jamais de partage. Les arguments ne permettent aucune autre origine. Le port est facultatif et vaut `54837`.

Le script ouvre uniquement un nouvel onglet dans le contexte du navigateur dédié. Il ne ferme pas le navigateur ni la fenêtre d'authentification, ne lit ni cookies, ni mot de passe, ni jetons, ni stockage de session, et n'envoie aucun message. Il n'inspecte pas les autres sessions Chrome. Les quatre scripts/tests de capture et garde n'accèdent à aucune API privée de conversation.

## Fidélité et états de capture

Après apparition des messages, la capture attend deux secondes sans changement des textes et liens, un document chargé et l'absence d'un marqueur visible de génération. L'attente est bornée à quinze secondes. Elle travaille sur les sélecteurs DOM observés `data-message-author-role` et `main a[href]`.

Une capture stable contient `textStatus: stable-rendered-text`. Elle conserve néanmoins **`captureStatus: partial`** et **`historyCompleteness: unverified`** : le script ne prouve pas que l'historique virtualisé, les blocs repliés, les images ou toutes les branches sont présents. Un hash prouve la conservation du texte capturé, pas l'intégralité de la conversation.

Si le texte continue de changer ou qu'une génération est détectée, la sortie est **`captureStatus: draft`**, chaque message porte `draft-unstable-rendered-text`, les téléchargements sont bloqués et le code de sortie vaut `2`. Une erreur de navigation ou d'accès vaut `1`. Une capture stable sans téléchargement échoué vaut `0`, sans devenir pour autant un export exhaustif.

Les textes DOM sont enregistrés en UTF-8 avec SHA-256 et nombre de caractères, puis découpés en morceaux de 12 000 caractères maximum sans couper les paires Unicode. La concaténation restitue exactement le texte DOM capturé, pas le Markdown original ou du contenu caché. La console n'affiche que comptes, états et chemin privé.

## Téléchargements bornés et non approuvés

Seuls les liens de fichiers observés sur l'origine exacte `https://chatgpt.com` ou ses blobs sont candidats. Un autre port, des identifiants dans l'URL, une origine externe, un nom `pack.zip.exe` ou une extension interdite sont refusés. Le nom réellement annoncé par le téléchargement est contrôlé séparément. Aucun exécutable n'est lancé et aucun fichier n'est accepté comme asset du jeu par cette étape.

Avec `--download` seulement, CDP configure temporairement le dossier de téléchargement du **contexte dédié**, observe uniquement le nouvel onglet de capture, puis restaure le comportement par défaut. Les liens sont dirigés vers ce même onglet pour éviter un téléchargement dans une nouvelle fenêtre non surveillée. Aucun contexte anonyme n'est créé : un fichier nécessitant une session déjà présente peut employer le contexte existant sans en extraire l'authentification.

Un verrou privé empêche deux scripts de changer simultanément les réglages de téléchargement du même contexte. Ne pas effectuer de téléchargements manuels dans cette fenêtre pendant ce mode. Après un arrêt brutal, un verrou restant est un blocage explicite à examiner ; il n'est pas supprimé automatiquement au risque d'interrompre un autre transfert.

Les limites par exécution sont **600 MiB par fichier**, **1 GiB transféré au total**, **64 MiB de réserve disque** et **120 secondes par transfert**. Les tailles annoncées et reçues sont surveillées via les événements CDP et l'espace disque est revérifié toutes les 250 ms. Les octets déjà reçus lors d'un échec consomment aussi le budget. Ce contrôle réagit aux événements du navigateur, ce n'est pas un quota matériel du système de fichiers.

Un dépassement déclenche une annulation. Les fichiers incomplets connus sont nettoyés dans le dossier privé. Une annulation non confirmée bloque les transferts suivants et reste signalée comme erreur ; aucun succès n'est inventé. Si CDP ne permet pas d'isoler ou surveiller le téléchargement, la tentative est marquée **not-downloaded**.

Un résultat reçu doit être un fichier régulier, de taille cohérente, puis est hashé et conservé avec l'état **downloaded-unreviewed**. Les boutons Télécharger non pris en charge sont consignés séparément ; ils ne sont pas activés aveuglément. Un téléchargement nécessitant une connexion indisponible peut échouer même lorsque le texte du partage est lisible. Les erreurs entraînent un code de sortie `2`.

## Confinement et contrôle ZIP

Textes bruts, URL, images, profils et téléchargements restent sous `work/`, exclu de Git et Vercel. Chaque composant du chemin réel `work/v37/chatgpt-intake/<uuid>/<exécution>` est contrôlé avant écriture : les liens symboliques et jonctions, y compris vers `public/`, sont refusés. Les nouveaux fichiers texte sont créés sans écraser un fichier préexistant.

L'audit ZIP ne décompresse rien sur disque et ne lance rien. Il contrôle taille, ratio de compression, CRC, hashes, liens symboliques, chiffrement et chemins Windows. Les chemins sont canonisés avant détection des doublons : `a/./hero.png`, `a//hero.png` et `a/hero.png` partagent une destination. Les conflits entre fichier et répertoire sont également refusés, quel que soit l'ordre dans l'archive.

Le nombre de copies uniques n'est jamais présenté comme un nombre de sprites utilisables. Anatomie, mains, équipements, côtés, alpha, plans, pivots et timings restent à relire avant toute importation runtime.

## Vérification

Les tests couvrent texte de plus de 20 000 caractères, Unicode et aller-retour UTF-8, URL publiques/privées, génération instable, jonctions réelles vers un dossier public, quotas, réserve disque, annulation et restauration du contexte simulé, chemins ZIP équivalents, CRC corrompu, liens symboliques et ratio excessif.

```powershell
node --test tests/chatgpt-source-capture.test.mjs tests/chatgpt-download-audit.test.mjs tests/chatgpt-download-guard.test.mjs
```

Les transferts de ces tests utilisent un CDP simulé et de petits fichiers temporaires. Ils ne constituent ni une récupération réelle de packs privés, ni une validation visuelle des assets. La récupération publique réelle doit être attestée séparément par son manifeste privé ; les sources récupérées ne sont pas publiées.
