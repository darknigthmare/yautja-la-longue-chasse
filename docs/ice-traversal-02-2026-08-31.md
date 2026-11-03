# Exploration 02 — Boucle minière et précision des sauts

Ce lot poursuit l’audit professionnel avec une seconde branche facultative, dans **ice-cryostalker**, et des améliorations du contrôleur de saut. Les objectifs de chasse, l’Apex et l’extraction restent accessibles sans cette branche. Les six autres régions ne sont pas présentées comme refondues.

## Parcours livré

Le joueur repère une mine à plusieurs étages près de l’insertion. Un premier gradin est accessible avec un saut normal. La montée vers le relais demande l’impulsion aérienne obtenue dans la jungle : le lien entre deux régions donne une raison de revenir. Le relais déploie un pont, ouvre une paroi et donne accès à une chambre basse contenant une cache unique. Une trappe commandée depuis l’étage libère une échelle permanente ; elle permet ensuite de revenir dans les deux sens sans coût d’endurance.

Le trajet principal au sol reste libre. Les anciens supports de cette zone sont remplacés pour éviter de contourner le verrou. Les dalles, parois et trappes utilisent les collisions solides existantes ; le gradin d’approche conserve le comportement d’une plateforme traversable. Les tests physiques vérifient la montée, les tentatives d’accès sans capacité, le passage du pont et le retour.

Une carte spécifique distingue cinq salles et leurs étages, la position, les accès et les salles non découvertes. Les éléments du décor sont indépendants : glacier, passerelle métallique, relais, cache et échelle. Trois textures V19 existantes sont réutilisées. La cache et une partie de l’architecture restent dessinées en Canvas ; aucune nouvelle illustration OpenAI ni finition artistique définitive n’est revendiquée.

## Commandes et sensations

- Une tolérance de 100 ms après le départ d’un bord permet encore un saut normal.
- Un appui jusqu’à 120 ms avant une réception est mémorisé et déclenche le saut dès cette réception, y compris sur une dalle solide.
- Maintenir la commande prolonge la montée ; la relâcher réduit la hauteur. Clavier, manette et commandes tactiles utilisent le même contrat.
- Une seconde impulsion exige toujours la capacité acquise. Elle ne se recharge ni par un délai de tolérance ni en attrapant une corde.
- Pause, perte de focus, retry et reprise vident ces états temporaires et exigent un relâchement. Ils ne sont pas enregistrés dans un checkpoint.

Référence de conception : [Celeste & Forgiveness, Matt Thorson](https://www.mattmakesgames.com/articles/celeste_and_forgiveness/index.html), pour les fenêtres de tolérance. Les valeurs et le contrôleur de ce projet sont spécifiques ; les autres assistances de Celeste ne sont pas annoncées comme implémentées.

## Sauvegarde et intégration

Le schéma de campagne passe à **6**. La migration conserve les découvertes de jungle de la version 5, sans inventer de découvertes dans la mine. Chaque mission n’écrit que ses propres portes, salles et secrets ; la mine ne peut pas attribuer l’impulsion de jungle. Les découvertes permanentes restent conservées après mort, abandon et reprise, avec les protections de propriété de campagne et de session existantes.

Les deux caches portent le bonus total d’énergie à 0, 15 ou 30 selon les identités réellement découvertes. Rejouer, charger ou transmettre deux fois une découverte ne multiplie pas la récompense. La façade commune applique la géométrie à chaque création et restauration de chasse et retire les références de routes vers les plateformes remplacées.

## Vérification et limites

Les tests exécutent les vraies fonctions du moteur et les gestionnaires clavier/manette : trajectoires, réception, tolérance de bord, pause, focus, retry, sauvegarde, migration et interactions. Les autres missions, les routes et les positions sûres sont aussi vérifiées. Une ancienne assertion d’accessibilité a été adaptée au saut maintenu. Le test de catalogue ne copie plus inutilement les ressources publiques pour chacun de ses trois bundles de logique ; ses assertions restent inchangées.

Les résultats exécutés sont consignés dans `outputs/qa-ice-traversal/` et récapitulés ci-dessous. Le disque C: plein a interrompu une première exécution ; cet échec d’infrastructure est distingué des résultats après correction et relance. Les caches reconstituables ont été déplacés dans un dossier autorisé sur W:, sans déplacement des sources ni des illustrations.

Le navigateur intégré échoue encore avant connexion avec une erreur d’ACL Windows. Aucune partie interactive, mesure de FPS, validation matérielle manette/Steam Deck ou distribution native n’est donc revendiquée. L’inventaire artistique V19, les six autres régions, l’approfondissement des boss, les performances sur matériel et les droits commerciaux de franchise restent des chantiers ouverts.

## Résultats vérifiés avant publication

- Lint et TypeScript : réussis. La vérification TypeScript utilise `--incremental false` pour ne pas réécrire son cache sur C:.
- Audit des paires artistiques disponibles : réussi, 464 paires V19. Ce contrôle ne déclare pas les 800 références complètes.
- Build Vinext : réussi, puis **619/619 tests réussis**, aucun test ignoré. Le CLI a été appelé directement, sans régénérer les données artistiques inchangées via le prébuild.
- Projection Vercel : **1 904 fichiers réguliers**, les cinq nouveaux modules présents et aucun fichier privé interdit.
- La compilation Next de production, l'identifiant du déploiement et les contrôles HTTP publics sont consignés séparément dans les preuves de livraison. Ils ne remplacent pas un essai interactif.

Les caches locaux utilisent `W:\CodexBuildCache\yautja-ice-20260831` : packages de dépendances reliés par jonctions, sorties `dist` et `.next`, temporaires et preuves QA. L'inventaire des dépendances a été vérifié avant relance : 29 931 fichiers, 862 341 728 octets, sans perte. Les sources et illustrations restent dans le projet. C: reste saturé et doit être libéré pour les travaux futurs.

Un premier essai Next distant a refuse une jonction locale `dist` envoyee comme lien symbolique : les exclusions Vercel visent maintenant aussi les entrees elles-memes, pas uniquement leur contenu. La projection finale ne contient aucun lien symbolique ni entree privee, y compris les repertoires vides. La logique du jeu et ses 619 tests sont inchanges par ce correctif de distribution.
