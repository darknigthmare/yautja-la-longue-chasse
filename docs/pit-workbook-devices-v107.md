# Objets autonomes du Pit V107

La recette opt-in `workbook-v107` produit un état de combat version15. Elle hérite des normales et des cinq actions V106, puis raccorde Feral S4 et Scar S2 à de vrais objets autonomes. Les recettes11–14 gardent leurs admissions, champs, commandes et codecs antérieurs. Les anciens modules source V106 restent inchangés.

| Action source | Commande | Délais source | Budget source | Départ physique |
| --- | --- | --- | --- | --- |
| Feral `M_F006_S4` | `22+S` / `workbookAction:'mine'` | 34/90/30 | 105 dégâts de base ; 35% une fois | Tick20, première mine native déjà au sol |
| Scar `M_F003_S2` | `214+S` / `workbookAction:'shuriken'` | 23/4/29 | 90 dégâts de base ; 25% une fois | Tick27, première paume native vide |

Les durées BODY sont conservées. Les deux dessins actifs de Scar montrent encore l'étoile tenue : produire le projectile au tick23 créerait une seconde arme. Le lâcher au début de récupération est une adaptation explicite. Le BODY de Feral contient déjà la mine au sol dès le tick20, pendant son startup. Le rendu utilise ses admissions sans objet au sol après ce départ ; les doigts et le corps ne sont pas supprimés pour extraire une fausse arme indépendante.

La géométrie provient de `pitWorkbookDeviceAnchorsV107.json`, avec deux ancrages natifs mesurés, références BODY, rects/pivots et corrections du contact de production. La mine est posée au vrai sol (`floorSnap` déclaré), sans déplacer le BODY. L'étoile autonome est une nouvelle image à cinq branches créée avec `image_gen`, avec empreinte SHA et provenance déclarées ; elle ne constitue pas une extraction native complète ou une certification canonique. L'admission visuelle appartient au registre et à la preuve de rendu V107.

## Cycle physique

La mine possède un volume22×14. Sa phase non offensive AMBER dure du tick20 au tick63 ; OFF64–93 ; armée94–153 ; expiration154. Ces bornes suivent les dessins natifs, mais la durée de vie physique est une adaptation du Pit. Son armement seul n'inflige aucun dégât. Elle ne détonne qu'au contact de proximité réel d'une hurtbox adverse dans un rayon62 ; un saut suffisamment haut l'évite. La garde basse frontale bloque sans chip. Une vraie attaque dont le volume atteint la mine peut la détruire avant ou après armement. Cette attaque est consommée contre le dispositif et n'inflige pas simultanément un coup au propriétaire à travers la mine. Les projectiles offensifs ennemis linéaires ou guidés qui la touchent sont également consommés ; cette règle ne retire pas un compagnon ou une arme de retour. Détruire l'objet n'accorde aucune Traque gratuite.

L'étoile possède un volume26×26 à l'intérieur de son affichage30×30 ; elle part de la paume vide native, parcourt14 unités par tick dans sa direction initiale, et expire au plus tard après50 ticks ou à la sortie de l'arène. Elle ne poursuit pas sa cible. Un impact ou une garde frontale consomme l'unique projectile, sans chip ; une garde de bouclier source effectivement traversée le bloque aussi. Les deux budgets passent par la puissance, les combos et l'instinct ordinaires du moteur.

Chaque acteur possède exactement un exemplaire par round : `ready → held → deployed → spent`. Le coût est débité une fois au début de l'action. Une interruption avant le dessin de lâcher conserve le même objet (`ready`), sans remboursement de jauge. Après lâcher, l'objet continue indépendamment de l'animation du propriétaire ; sa destruction, explosion, collision ou expiration le dépense. `EQUIP`, une garde, l'attente ou une nouvelle commande ne le rechargent pas. Le round suivant crée un nouvel exemplaire ; aucun objet d'inventaire ou de campagne n'est inventé.

## État et archives

`workbookDevicesV107` contient les entités physiques, et `fighter.workbookDeviceV107` leur possession. Les identifiants partagent le compteur monotone des effets de combat pour éviter toute collision. Le normalizer vérifie acteur propriétaire, type, instance unique, ID réservé, phase/âge, bornes, état de possession et release causal. Une action déjà après son lâcher ne peut pas être restaurée avec un objet `ready` en supprimant son entité. Si cette action est encore courante, âge et frame de création doivent correspondre exactement au dessin de départ. Les captures au milieu d'un vol ou des phases AMBER/OFF/armée reprennent sans nouveau débit, départ ou changement de cible.

Le replay15 conserve12 bits par acteur et réserve les codes11/12 à mine/étoile. Les archives14 restent strictement limitées aux anciens codes0–10 ; les archives≤13 conservent11 bits. Les séquences de mannequin version4 (`dummy-input-rle-v4`) suivent la même admission. La promotion d'un enregistrement déjà commencé décode puis réencode ses segments, afin de préserver les anciens bits de ressource. Les versions futures16 et séquences futures5 ne sont pas admises.

## Vérification

`tests/pit-workbook-devices-v107.test.mjs` couvre les releases et coûts aux deux sens, les fenêtres non offensives, proximité/saut/garde, destruction par un vrai coup bas sans gain de ressource, interruption avant/après, possession unique, motions réelles, captures aux bornes, états falsifiés et codecs. Un duel enregistré gagne réellement sa jauge avant de déployer les deux objets ; sa relecture est byte-exacte.

Les deux traces960 ticks de `pit-workbook-v14-compat-v107.json` ont été capturées avant toute mutation du moteur V107, sur le code issu de main92e7c824. Elles complètent les six traces720 ticks V11/V12/V13 épinglées par V106. Les anciens tests de combat, replay, entraînement, V80 et présentation sont conservés. La qualification visuelle finale nécessite les preuves du registre et du navigateur ; une étude ou un test de données seul ne clôt pas une animation.

Les conclusions Scar et le carnet de route sont documentés séparément dans `pit-workbook-conclusions-v107.md`. CLEMENCE demeure partielle sur le désarmement offensif. Les16 scènes source de campagne restent ouvertes : le parcours jouable persistant est explicitement un exercice à partenaires substituts.
