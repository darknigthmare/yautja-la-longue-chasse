# Warp Universe — import effectif du lot 06

Mise à jour du 6 novembre 2026, dans la PR #116, à la demande du propriétaire du jeu.

## Import réalisé, distinct de la validation artistique

Les **13 PNG originaux** des deux dernières générations sont maintenant versionnés dans [le dossier du lot 06](warp-universe/lot-06-20261106/README.md), au commit `5eb2c20ce7436abf46650db8791d20a517effe77`. Il ne s'agit plus seulement d'un catalogue de noms ou de liens externes.

- Dix fichiers destinés aux cibles de brief Hanzo, Nikolai, Mombasa, Stans, Noland, Edwin, Berserker, Falconer, Tracker et Classic : IDs 165 à 174.
- Baie Warp, archiviste et réceptacle mémoire : IDs 199, 201 et 203.
- **29 120 009 octets** de PNG originaux, sans modification ; **12 RGBA transparents et un fond RGB opaque**.
- [Contrat des sources](warp-universe/lot-06-20261106/IMPORT_SOURCES.json) : tailles, dimensions, SHA-256 et empreintes Git exactes.
- [Reçu d'import](warp-universe/lot-06-20261106/IMPORT_RECU.json) : preuve de transfert et limites ; [galerie locale](warp-universe/lot-06-20261106/GALERIE.html).

Le [contrôle GitHub Actions 42161552130](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42161552130) a réussi. Les tailles et empreintes des blobs visibles dans les dossiers `cinema/` et `module/` correspondent aux originaux. Le workflow de transfert ponctuel a ensuite été retiré de la branche ; il ne demeure pas comme automatisation active.

## Lecture du suivi historique

Le [catalogue historique](WARP_UNIVERSE_ASSETS.md) reste celui des **170 images des cinq premières archives** ; il n'est ni renuméroté ni réimporté. La [reprise du 5 novembre](WARP_UNIVERSE_REPRISE.md) recensait alors 40 demandes sans image.

Depuis ce lot, **13 de ces demandes disposent d'un candidat généré**, et **27 restent sans candidat** : 097, 098, 178, 179, 180, 184, 185, 186, 189 à 198, 200, 202, 204 à 210. Cela ne ferme pas automatiquement les exigences de fidélité ou d'intégration.

Les treize images restent au statut **candidat à reprendre/valider**, `validated=false`. Les noms de fichiers expriment les personnages demandés dans le brief ; ils ne certifient pas la ressemblance aux films. Les références de scène/costume/équipement et la revue 1:1 manquent. Le fond 199 contient déjà pylônes, plateforme et consoles et ne satisfait donc pas encore le besoin de baie modulaire vide sans doublon. Les créations 201 et 203 ne sont pas des éléments canoniques attestés.

## Portée préservée

Cet import ne modifie ni `BIBLE_DE_CAMPAGNE.md`, ni les annexes compagnons/mobilité/Xeno Prime/planètes-tribus, ni le code, les atlas actifs ou les sauvegardes. Aucun fichier n'est placé sous `public/`. Aucun personnage n'est recruté ni aucun accès de campagne accordé. Pas de fusion sur `main`, pas de déploiement ni de QA de gameplay revendiqués.
