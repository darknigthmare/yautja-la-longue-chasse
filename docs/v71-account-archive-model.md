# Archives de compte V71

Le système reprend le principe observé dans le code de Multiverse Breach : compte Supabase, sauvegarde distante propriétaire et remplacement conditionné par une révision observée. Les données Yautja restent indépendantes de celles des autres jeux.

## Périmètre réel

`cloudArchiveV71.ts` capture les octets confirmés du stockage, sans prendre un état React encore non enregistré et sans déclencher de migration. L’archive comprend la campagne courante et sa sauvegarde de secours, les cinq registres de campagne avec leurs dix emplacements manuels et deux automatiques, la chasse suspendue, le vaisseau, les annexes THE PIT et leurs replays associés aux propriétaires. Les copies originales de migration, de remplacement et les fichiers explicitement endommagés conservés en secours suivent aussi l’archive. Les jetons de compte, mots de passe, baux et journaux sont exclus.

Les campagnes, checkpoints et annexes sont validés avec les parseurs du jeu. Une version future, une annexe étrangère ou une campagne courante illisible suspend le transfert : aucune réparation silencieuse ni omission d’annexe. Les octets originaux restent inchangés. La limite du client est de 16 Mio pour l’ensemble sérialisé ; une archive trop grande est refusée explicitement.

## Compte, conflit et connexion interrompue

`cloudSyncV71.ts` emploie un UUID de compte, une révision entière et une empreinte SHA-256 des clés et octets. Les dates d’export et les horloges des appareils ne choisissent jamais la branche à conserver. Sans base commune, deux traces différentes exigent un choix. Une base commune identifie une modification locale seule, distante seule ou concurrente. Un changement de compte exige une association explicite lorsqu’un appareil contient les parties du compte précédent.

La file d’envoi appartient à un seul UUID. Les erreurs réseau, réponses étrangères et conflits de révision la conservent. Avant un nouvel essai, le client relit la copie distante. Si un envoi précédent a été enregistré mais sa réponse perdue, les octets distants identiques confirment cet envoi sans deuxième écriture. Une réponse ancienne ne supprime pas une file locale remplacée pendant le réseau. Une file corrompue ou future ne peut pas être remplacée automatiquement.

Contrat du transport :

```ts
pull({ accountId }): Promise<{ accountId, revision, snapshot, updatedAt } | null>
push({ accountId, expectedRevision, snapshot }): Promise<{ accountId, revision, snapshot, updatedAt }>
```

La création utilise `expectedRevision: null`. Une mise à jour exige la révision lue. La table, les politiques RLS et les contrôles serveur appartiennent à l’intégration Supabase ; ces tests du modèle ne constituent pas une preuve du serveur réel.

## Restauration et secours

`cloudArchiveRestoreV71.ts` prépare une préimage complète et remplace l’ensemble sous le verrou navigateur existant `yautja-full-archive-transfer`. Une copie locale de secours est confirmée avant la première modification de campagne. Le journal utilise la clé commune `ARCHIVE_TRANSFER_JOURNAL_KEY`, ce qui bloque déjà tous les enregistreurs ordinaires pendant le transfert. Son format distinct est `yautja-cloud-archive-transaction` V1. `recoverAnyArchiveV71` choisit ce récupérateur avant la migration du menu et l’hydratation de la session.

Un journal préparé restaure les octets précédents, après expiration du bail lorsqu’une autre session le récupère. Un journal marqué enregistré confirme les octets suivants. Une troisième écriture divergente bloque la récupération plutôt que d’être écrasée. L’association du propriétaire de l’espace de travail est enregistrée dans le même journal que les cinq parties. Après une restauration confirmée, le navigateur recharge la page avant de permettre de rejouer.

Une confirmation « garder cet appareil » conserve d’abord la branche distante dans `yautja-long-hunt.cloud.remote-rescue-v71.<compte>.<UUID>`. Une restauration distante conserve l’ancienne branche locale dans `yautja-long-hunt.cloud.local-rescue-v71.<UUID>`. Aucune copie existante n’est effacée automatiquement. Il faut assez d’espace pour l’archive, le journal et le secours ; une limite de stockage peut donc refuser un import pourtant autorisé par la limite de 16 Mio.

## Preuves et limites

Les 44 tests ciblés du 2 octobre 2026 passent : 26 tests de stockage, réconciliation, file, restauration et secours ; 16 tests exécutant les callbacks réels du contrôleur React avec effets externes injectés ; 2 tests exécutant la boucle réelle de manette des menus. Ces deux derniers vérifient qu’un menu rendu inactif par le dialogue du compte ne reçoit plus le bouton Retour, tandis que le dialogue actif peut toujours le recevoir. Les cinq contrôles de compte vide vérifient l’association avant la première partie et refusent une progression, un autre propriétaire, un compte remplacé ou une file apparue pendant l’attente. La fixture principale construit réellement cinq parties et soixante checkpoints avec les API du jeu, puis les importe dans un stockage vide et compare tous les octets. Les contrôles comprennent quota avant/après écritures, reprise après interruption, clôture du journal, octets concurrents, déconnexion et compte remplacé pendant une attente.

`verify-cloud-account-v71.mjs` est une recette Chromium séparée. Elle crée les parties via l’interface, emploie deux contextes mobile et ordinateur et intercepte intégralement le transport Supabase dans le test. Elle ne crée aucun compte réel et n’envoie aucun courriel. Son rapport distingue cette preuve du navigateur des contrôles SQL/RLS/CAS réels et du déploiement public. L’ancienne progression mobile doit d’abord être associée et transmise depuis ce mobile ; un compte ne peut pas lire à distance son ancien stockage local. La synchronisation réseau et la sauvegarde locale sont deux confirmations différentes.

Le parcours navigateur final local sur `http://127.0.0.1:4191` passe ses dix contrôles ; ses quinze captures ont été inspectées. `v71-cloud-account-local-qa.json` conserve le résultat, les requêtes interceptées sans identifiants sensibles et les limites. Un préflight isolé connecte un compte vierge avant toute partie, vérifie qu’aucune sauvegarde distante n’est inventée, puis crée une partie dans l’interface : le poll l’envoie automatiquement sans actualisation ni association manuelle. Une partie créée sur mobile est importée à octets identiques sur ordinateur puis reprise dans le prologue. La scène, chargée en ligne auparavant, avance réellement hors ligne jusqu’au checkpoint « ready », qui est transmis à la reconnexion. Une deuxième campagne est créée en ligne, un conflit de file ancien affiche la révision distante courante sans écrasement, la restauration garde un secours, et l’autre compte ne reçoit pas les parties précédentes automatiquement. L’ancienne preuve à neuf contrôles reste dans `v71-cloud-account-nine-check-local-qa.json`. Le premier chargement d’images hors ligne n’est pas couvert : son diagnostic et la tentative antérieure sont conservés dans `work-local/v71/qa/cloud-offline-first-load-diagnostic` et `cloud-offline-visibility-diagnostic` avec leur statut d’échec, distinct du parcours final réussi. Le diagnostic `cloud-first-account-fixture-name-diagnostic` documente un nom QA trop long, corrigé dans la recette sans modifier le jeu.

Le même parcours passe ses dix contrôles sur `https://yautja-la-longue-chasse.vercel.app`, pour le déploiement Vercel `dpl_2hLyn51LArJ8tmJ1Tk9MfX34JuEa` associé au code `e409775173407a2cb21f42bb57eebc947a7003a8`, confirmé par le responsable de publication avant ce test. Les quinze captures publiques sont inspectées ; aucune erreur JavaScript n’est relevée. `v71-cloud-account-public-qa.json` consigne cette preuve du frontend public. Le fournisseur de compte reste entièrement intercepté dans cette recette : ce résultat ne prétend pas vérifier un courriel réel ou une connexion réelle à Supabase. La première tentative publique a attendu une révision augmentée alors qu’un envoi intermédiaire était encore en cours ; la recette finale attend aussi l’identité brute exacte de la copie prévue. Son diagnostic est conservé dans `cloud-public-intermediate-revision-diagnostic`, sans changement du runtime.
