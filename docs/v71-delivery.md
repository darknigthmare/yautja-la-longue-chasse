# V71 — Comptes, abords de la cité et victoire du prologue

Cette livraison comprend le lot V70 local `cf095db` et les corrections V71. Les campagnes et images précédentes sont conservées. Les nouvelles créations de la cité sont des adaptations originales compatibles avec le monde du jeu ; elles ne constituent pas une carte canonique certifiée de Yautja Prime.

## Reprendre la même partie sur deux appareils

Le bouton **Compte & sauvegardes** est accessible depuis le menu principal et les réglages d'une partie en pause. Il utilise le service de compte existant de Multiverse Breach, avec une table Yautja séparée et des politiques d'accès par propriétaire. Aucun nouveau projet payant n'est créé. Le navigateur n'embarque qu'une clé publique de publication, jamais une clé serveur.

Pour reprendre une ancienne partie mobile, ouvrir d'abord le jeu sur ce mobile, se connecter, puis confirmer l'association des parties de cet appareil au compte. Sur l'ordinateur, se connecter au même compte. Un appareil vide peut récupérer automatiquement l'archive ; deux progressions différentes exigent un choix explicite. Le compte ne peut pas récupérer un stockage local qui n'a jamais été envoyé.

Les cinq parties, leurs sauvegardes manuelles et automatiques, les annexes THE PIT, replays et copies de récupération validées sont transférés ensemble, avec leurs octets confirmés. Une progression React encore refusée par le stockage n'est jamais annoncée comme envoyée. Une révision conditionnelle empêche l'écrasement concurrent, une file conserve les transferts interrompus, et une copie de secours précède le remplacement. Une restauration confirmée recharge la page avant de rejouer. Les versions futures ou archives illisibles bloquent le transfert au lieu d'être réparées silencieusement.

La sauvegarde locale reste distincte de sa confirmation distante. La synchronisation vérifie périodiquement les modifications lorsque le compte est connecté ; elle ne garantit pas un dernier envoi au moment de fermer le navigateur. Hors ligne, la partie déjà chargée peut enregistrer sa progression locale. Ce lot n'ajoute pas un cache permettant de charger tous les assets d'une nouvelle scène sans réseau. Le dialogue de compte isole les commandes clavier et manette des menus situés derrière lui.

## Monde natal et prologue

Deux nouvelles images OpenAI natives fournissent un sol de cendre/basalte et six familles d'objets. Les **139 objets indépendants**, les **43 devantures** et le terrain projeté sont ancrés dans les coordonnées du monde, avec retrait hors caméra et dégagement des chemins existants. Le sol ne rasterise plus la totalité du monde extérieur à chaque vue. Le codex ajoute **226 fiches** reliant bâtiments réels, seuils, approches, intérieurs proportionnés et mobilier. Aucun faux accès ou téléporteur n'est ajouté.

Après la victoire réelle du duel, le Youngling apparaît dans le panorama de l'arène et de la lune, avec deux dessins natifs dont le bras levé ; le rival reste couché sur le sable. Les acteurs suivent la projection du panorama et les appuis de leurs images. La pause et le mouvement réduit restent cohérents. Le titre suivant sur la lune seule n'affiche pas de combattants flottants. Ce geste réutilise les dessins V47 conservés, sans prétendre livrer une nouvelle planche d'animation longue.

Le lot V70 poursuit notamment le temple avec neuf salles et quinze preuves ordonnées, dix villages et leurs services locaux, les routes physiques et les dialogues des contrats existants. Le premier acte du temple conserve le rang Young Blood. Reine, purge, véritable Blooding, salles profondes et l'intégralité des anciens objectifs d'arènes et d'animations ne sont pas déclarés terminés.

## Preuves de validation

Les rapports suivants sont séparés pour ne pas confondre modèle, navigateur, service distant et publication :

- `v71-account-backend-qa.json` : migration réellement appliquée, sept contrôles de rôle/révision exécutés avec rollback intégral et accès REST anonyme refusé. Aucun compte réel, courriel ou identifiant personnel utilisé. Le transport Auth/REST des recettes navigateur est simulé, indépendamment des contrôles réels de base.
- `v71-account-archive-model.md` : sauvegardes, conflits, journal et reprise ; tests des véritables callbacks React et du tick manette, sans remplacement du contrôleur par un modèle parallèle.
- `v71-outskirts-model-qa.json` : placement, appuis, projection, rectangles natifs et liens du codex ; preuve navigateur enregistrée séparément.
- `v71-nursery-local-qa.json` : duel joué au clavier depuis une partie neuve, pause, reprise du checkpoint effectivement gagné sur mobile et huit captures inspectées.

La réception du courriel de confirmation et la connexion inter-appareils avec un véritable compte utilisateur restent non certifiées. Le service Auth partagé conserve ses paramètres préexistants, dont la protection contre les mots de passe compromis désactivée ; ce lot ne modifie pas les autres jeux.

La source finale passe **2 375/2 375 tests** sans exclusion ni annulation, ainsi que 69 tests ciblés, les compilations portable/vinext et Next/webpack, TypeScript et le CSS compilé de The Pit. Le lint ne comporte aucune erreur et conserve trois avertissements préexistants. Les comptes passent dix parcours navigateur et quinze captures inspectées ; les abords passent dix contrôles et huit captures inspectées. Le prologue conserve sa preuve de duel réel et huit captures. La recette supplémentaire du menu passe onze contrôles, dont les appels CORS réels aux réglages Auth et le refus de lecture anonyme de la table depuis le navigateur ; elle n'envoie ni mot de passe ni courriel. Les rapports de régression et de navigateur gardent les diagnostics antérieurs séparés des résultats finaux.

Un espace vide encore marqué comme appartenant à un ancien compte conserve cette association : sa première partie nécessitera une confirmation explicite pour le nouveau compte. Le texte du panneau sans parties ne distingue pas encore ce cas rare de celui d'un appareil entièrement neuf. Aucun envoi vers le mauvais compte n'est effectué.

La compilation finale, la régression complète, les nouvelles recettes navigateur et le commit public exact sont consignés dans les rapports de validation et de publication après leur exécution. Un diagnostic interrompu ou échoué n'est jamais présenté comme une preuve finale.
