# Ressources originales et préparation de publication

Le [manifeste](public-assets.json) identifie les 7 419 fichiers de `public/` du commit GitHub `e168edf951166efca90e4f0cf3ef6da7167dece6`, soit 11 175 381 359 octets. Chaque entrée garde chemin, taille et identité Git du fichier original. Aucune ressource n’est réduite, recadrée, recolorée ou remplacée.

L’outil optionnel `scripts/materialize-site-assets-v112.mjs` peut reconstruire un cache local à partir de ce manifeste. Il télécharge uniquement depuis ce dépôt public et ce commit fixe, vérifie le flux entier contre l’identité Git et la taille, puis remplace atomiquement chaque fichier. Les fichiers déjà exacts sont conservés, les temporaires défectueux sont retirés et un échec reste explicite. Les douze tests utilisent un serveur local contrôlé : ils qualifient l’intégrité, la reprise et les refus, sans prétendre avoir reconstruit les 11 Go. Un essai CLI supplémentaire a réellement téléchargé le SVG radio original de 311 octets depuis le commit fixe, puis l’a conservé sans téléchargement lors de la relance ; les deux résultats sont consignés ici. Cet outil ne change ni `package.json`, ni le chargement du jeu.

```sh
node scripts/materialize-site-assets-v112.mjs --manifest docs/qa/v112-hunt-publication/public-assets.json --directory /chemin/du/cache/public
```

Le dépôt possède déjà son chemin Vercel avec une origine immuable pour `/game/imports/v85`, vérifiée avant suppression des seules copies de build. Cette préparation ne modifie pas ce contrat.

Le [constat de transfert Site](site-source-transfer.json) conserve l’échec réel de publication sur le dépôt source ChatGPT Site : après des transferts bornés, le service a refusé tout nouvel envoi avec `artifacts_git_receive_pack_storage_limit`. Il a également refusé le nettoyage de la branche temporaire créée par cette tâche. Aucune version Site n’a été enregistrée ou déployée depuis ce transfert, et aucune règle de partage n’a été changée. Le nettoyage de cette branche exige la remise à disposition du stockage source par le service.

Le manifeste initial et les essais CLI sur le commit `f0b1bec1e717a89abe1420210ca602b68d50571c` restent consultables au commit `d90c2812e265b831e8af7cb21fd7d94f90ea1ffe`. Le manifeste courant ajoute les dernières copies du classeur et du compagnon à quatre clôtures ; les ressources de jeu conservent leurs identités.
