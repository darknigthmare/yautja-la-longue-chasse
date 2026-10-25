# Tournée physique des six ouvrages — V109

La tournée prolonge le convoi d’exercice V108 avec les mêmes personnes, bâtiments, stocks, skiff et navette. Le joueur choisit de deux à six ouvrages réellement terminés, leur ordre et les quantités à déposer. La charge totale, vivres compris, ne dépasse pas les vingt RAV portables par U19. Aucune conversion entre K01 et un territoire CON-T, aucun budget de campagne ni aucun navire acquis n’est ajouté.

Les prix, délais, opérateurs, contrats et l’entretien V6 restent ceux du modèle V108 inchangé. Les nouvelles commandes composent ce réducteur au lieu de le remplacer. Les choix de tournée, les deux places de monture et les distances d’approche sont une adaptation locale de jeu ; ils n’affirment pas des mesures canoniques.

## Un stock réservé, jamais doublé

La réservation désigne une partie du dépôt ou de la soute existante. Les métriques continuent de compter exactement les six cents RAV initiaux, répartis entre lieux, portages, recrutements, constructions et entretien. Le montant réservé affiché sur le terrain est inclus dans ce stock ; ce n’est pas un second inventaire.

Il faut les mêmes porteurs intégrés, sous contrat et ravitaillés au dépôt pour préparer la tournée. Ils rejoignent ensuite le stock choisi pour charger le lot et zéro à six RAV de vivres. Déposer une étape exige leur présence au prochain casier ; ni l’affichage d’un ordre ni l’arrivée sur l’autre rive ne livrent son contenu. Un dépôt ajoute exactement la quantité choisie au casier réel et avance une seule étape.

À l’embarquement, le modèle V108 place le portage dans la même soute. La réservation y suit le lot, avec l’identité du skiff et les trois membres U19. Après débarquement, elle demeure dans cette soute jusqu’à sa reprise physique. La navette suit la même règle d’identité et son débarquement restitue le portage réel. Une coque ne peut transporter seule un lot réservé à cette tournée : les mêmes U19 l’accompagnent.

L’entretien peut consommer les vivres disponibles. Un geste qui entamerait les RAV réservés est refusé avant confirmation : aucun stock ni tour n’est alors modifié. Le joueur peut prélever des vivres supplémentaires dans un stock réellement rejoint, ou engager le retour avec son reliquat. Les porteurs dont le contrat est expiré peuvent ramener le matériel ; ils ne peuvent pas gagner de nouvelles livraisons sous ce contrat.

Interrompre la tournée conserve ses positions, sa charge, ses étapes et ses livraisons. Le retour doit être engagé puis accompli jusqu’au dépôt avec le même groupe. Le reliquat et les vivres encore portés sont déposés dans sa capacité disponible avant clôture. Une tournée interrompue garde ses étapes déjà livrées, sans remboursement distant ni reconstitution des consommations. Une réservation encore non chargée peut être libérée sans ajouter le moindre RAV.

Seize tournées closes et cinq mille intentions V109 constituent les limites du nouveau carnet. Les limites historiques du modèle V108 restent appliquées aux actions natives.

## Deux montures réellement distinctes

Les places proposées sont aux coordonnées locales (680,545) et (760,545), dans la vraie zone de soin. Elles n’attirent ni ne déplacent automatiquement un animal. Le guide doit approcher sa longe à douze unités ; les mouvements conduits refusent un chevauchement entre les deux gabarits, avec une séparation minimale de cinquante-six unités. La distance minimale est vérifiée sur le segment entier, y compris lorsque ses deux extrémités sont libres. Les chemins étroits continuent d’utiliser le gabarit de monture V108.

Un ancien carnet peut contenir les deux montures au même point. La reprise ne change aucune coordonnée. Le guide peut seulement les écarter par un mouvement dont la séparation augmente à chaque segment. Il ne peut ensuite remettre une monture dans l’autre ; la libération et de nouveaux soins attendent leur séparation. Cette sortie bornée ne neutralise pas les collisions ordinaires.

Les étiquettes de terrain montrent le nom de l’équipe sélectionnée. Une liste de boutons d’au moins quarante-quatre pixels permet de choisir les autres équipes sans déplacer leurs positions réelles pour les rendre artificiellement visibles. Des contrôles d’approche déclenchent la marche normale vers un stock, un chantier, une monture ou une place ; un obstacle arrête toujours cette marche et exige un détour. Le zoom et le défilement restent des gestes de vue.

## Reprise atomique du carnet V108

Le stockage conserve la clé V108 et son verrou exact `yautja-clan-logistics-v108`. Une enveloppe de version 2 contient le checkpoint V109 ainsi que la chaîne originale V108, octet pour octet. La copie et le nouveau checkpoint sont donc écrits et relus ensemble dans une seule transaction de stockage ; aucun carnet V108 n’est effacé séparément.

Le jeu attend la relecture confirmée de cette enveloppe avant d’autoriser les déplacements. Une erreur de quota laisse les anciens octets en place et propose une nouvelle tentative. Une autre écriture ou une ancienne vue V108 est arrêtée par la comparaison des derniers octets observés, sous le verrou partagé. Les intentions d’une même session restent ordonnées.

Le carnet complet demeure limité à quatre Mio. Si l’ancien texte et son enveloppe dépassent cette limite, la reprise est refusée en conservant intégralement l’archive existante ; aucune copie n’est tronquée pour la faire entrer. Les imports d’une lignée déjà migrée doivent conserver sa même archive originale. Les aperçus longs sont limités dans l’interface, tandis que la lecture, la validation et le fichier téléchargé gardent le contenu complet. Une sélection de fichier plus récente ou une annulation invalide toujours une lecture différée antérieure. Le navigateur vérifie le téléchargement complet, une lecture A retardée suivie d’une vraie archive B plus récente, l’annulation d’une lecture en cours et le refus atomique d’une version future.

## Portée des vérifications

`tests/clan-supply-route-v109.test.mjs` joue les six livraisons avec le vrai moteur, le trajet en skiff, un aller-retour orbital avec rechargement en vol et entretien du service au sol, le retour, les vivres, les réservations, les refus géométriques, le dégagement d’une superposition historique, la migration et ses conflits. Une fixture de préparation construit les six ouvrages par des commandes V108 acceptées ; elle n’est jamais présentée comme une campagne gagnée dans le navigateur.

`scripts/qa-clan-supply-route-v109.mjs` distingue le préflight du composant, le serveur de développement et le parcours final compilé. Le navigateur part d’un checkpoint V108 préparé et déclaré, puis joue les livraisons, le chenal, le rechargement, le retour et la séparation des montures par les contrôles de l’interface. Les refus de stockage et le contrôleur V108 d’un second onglet sont des fixtures d’I/O déclarées ; aucun résultat de tournée ou déplacement n’est injecté après le démarrage.

R2-M021 reste ouvert : `GameClient` ne fournit encore aucun reçu d’autorité de moyens et d’accord au chantier V89. Le catalogue des coques, un droit legacy et le budget de cet exercice ne remplacent pas ce fournisseur réel. La tournée n’accorde ni propriété de campagne, rang, XP, honneur, annexion ni nouvelle image native.
