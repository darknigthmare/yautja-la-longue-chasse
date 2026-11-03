# Cahier des charges partagé par le propriétaire

Source : https://chatgpt.com/share/6a953a3a-3580-83eb-b024-13aaa284e2e2

Texte public récupéré le 31 août 2026. Les liens sandbox des pièces jointes appartiennent à la conversation originale et ne sont pas des fichiers récupérés ici. Les constats du partage restent des hypothèses à confronter au dépôt.

---

**Pour ton jeu, je ne partirais pas sur une réécriture complète. Je chercherais surtout à transformer les systèmes déjà présents en une expérience continue : tu incarnes ton Yautja, tu prépares ta chasse dans son vaisseau, tu pars, tu traques une proie, puis tu reviens avec des conséquences visibles.**

Un jeu exécuté dans un navigateur peut être un véritable jeu vidéo. Ce qui donne une impression de « jeu web », dans le sens que tu décris, c’est plutôt une succession d’écrans et de boutons, des mécaniques insuffisamment reliées et des décors qui servent davantage d’illustrations que de lieux à parcourir.

**J’ai préparé les prompts complets pour Codex :**

**[Télécharger le prompt complet en fichier texte](sandbox:/mnt/data/Yautja_Prompt_Complet_Codex.txt)**

[Version Markdown](sandbox:/mnt/data/Yautja_Prompt_Complet_Codex.md) · [Pack avec les trois prompts séparés et l’audit](sandbox:/mnt/data/Yautja_Prompts_Codex.zip)

## 1. Ce que ton jeu possède déjà — et ce qu’il faut réellement améliorer

**Limite de mon examen :** le dépôt GitHub a renvoyé une erreur 404 dans cette session. J’ai néanmoins pu examiner le site et plusieurs fichiers JavaScript livrés par ton déploiement. Je n’ai pas effectué un parcours jouable complet : je distingue donc les éléments présents dans le code des qualités de gameplay qui restent à tester.

La promesse du site est déjà bien définie : partir du vaisseau, étudier une proie, choisir son équipement et rapporter un trophée. C’est cette promesse qu’il faut rendre perceptible dans chaque étape du jeu. citeturn0view0

| Ce que j’ai relevé dans le client livré | Ce que je demanderais à Codex |
|---|---|
| **Une console de vaisseau et un pont physique distinct existent déjà.** Le bouton « Jouer » mène d’abord à la console. | Faire du pont physique le point d’entrée principal, plutôt que créer encore un autre menu ou un troisième hub. |
| **Huit chasses sont définies**, avec objectifs, boss, récompenses, trophées et progression. | Approfondir ces huit chasses avant d’ajouter davantage de planètes. |
| **Les cinq dernières chasses partagent une même fabrique d’objectifs** : scans, éliminations, récupérations, boss et extraction. | Vérifier la répétition réelle et donner à chaque chasse des décisions, événements et parcours distincts. |
| **Le personnage est déjà construit avec des pièces graphiques modulaires.** | Préserver ce système et appliquer une logique d’assemblage comparable aux décors, installations et couloirs. |
| **Sauvegardes, améliorations, audio, commandes configurables et atelier de trophées sont déjà présents dans le code.** | Les consolider et les relier au monde jouable, pas les recréer en parallèle. |
| **L’archive de franchise est distinguée des trophées de campagne.** Son manifeste annonce notamment 92 représentations non jouables. | Ne pas confondre quantité encyclopédique et contenu réellement affrontable, récupérable ou utilisable. |

Les repères précis et les limites de ces observations figurent dans **[l’audit de lecture](sandbox:/mnt/data/Yautja_Audit_Lecture_2026-08-31.md)**.

### Ce qui ferait réellement la différence

**Le premier chantier est la continuité.** Changer une arme dans le vaisseau doit modifier ce que porte le personnage, ses capacités en mission et les aperçus qui prétendent montrer son équipement. Rapporter un trophée doit remplir un emplacement réel à bord. Une nouvelle destination doit apparaître sur une installation de navigation, pas uniquement dans une liste supplémentaire.

**Le deuxième chantier est la profondeur des situations.** Un scan devrait aider à décider comment approcher la cible. Un leurre devrait modifier son comportement. Un changement de surface devrait avoir une conséquence dans une chasse fondée sur les vibrations. Une description de boss promettant une réaction particulière doit correspondre à une mécanique effectivement exécutée.

**Le troisième chantier est le ressenti**, à vérifier en jeu : déplacements, caméra, synchronisation des attaques, collisions, réactions des ennemis, sons, lisibilité et transitions. Ajouter des images ne peut pas remplacer ce travail.

---

## 2. Le menu que je ferais : le vaisseau devient ton premier niveau

Je viserais ce parcours :

> Tu apparais dans le sas avec ton équipement actuel. Tu traverses une coursive jusqu’à l’armurerie. Tu changes d’arme devant un râtelier, puis tu l’essaies dans une petite zone d’entraînement. Tu rejoins la passerelle, actives la carte holographique et choisis ta chasse. Tu repars par le sas. Au retour, le trophée gagné apparaît dans la galerie et peut être préparé à l’atelier.

**Mais il faut conserver un accès rapide.** L’immersion ne doit pas obliger à marcher une minute pour baisser le volume ou changer un accessoire. Le vaisseau jouable devient l’expérience principale ; un menu rapide reste une alternative pratique et accessible.

### Prompt 1 — Menu transformé en niveau jouable

```text
Travaille dans le dépôt existant de Yautja : La Longue Chasse.

OBJECTIF
Transformer la navigation principale en un vaisseau réellement jouable,
sans recréer le jeu et sans supprimer ses systèmes fonctionnels.

AUDIT PRÉALABLE
Retrouve les états et composants correspondant à la console « ship »
et au pont physique « deck ». Vérifie leurs contrôles, collisions,
interactions et branchements. Ces deux représentations apparaissent
déjà dans le client déployé : ne construis pas un troisième hub.

IMPLÉMENTATION
Après Jouer ou Continuer, fais apparaître le joueur dans le pont
physique, avec son personnage modulaire et son équipement sauvegardé.

Respecte la caméra, la projection et l’échelle du gameplay existant.
Pour une action latérale 2D, construis une coupe de vaisseau cohérente :
salles, coursives, portes, plateformes et passages verticaux utiles.
N’introduis pas une vue isométrique incompatible par simple préférence.

Relie les installations physiques aux systèmes existants :
- Passerelle : navigation, destinations, briefing et sélection de chasse.
- Armurerie : équipement, capacité d’emport et améliorations.
- Forge : personnalisation du même personnage modulaire.
- Galerie : trophées réellement gagnés et emplacements persistants.
- Atelier : opérations de préparation des trophées déjà présentes.
- Infirmerie : fonctions de préparation et de soin prévues par le jeu.
- Entraînement : essais utilisant les vraies mécaniques des armes.
- Sas : validation du chargement et départ effectif en mission.
- Archives : consultation du codex, distincte des objets possédés.

Les installations s’activent à portée avec une commande explicite.
Le joueur doit comprendre ce qu’il utilise sans dépendre d’un clic
sur une petite icône.

Privilégie les panneaux locaux et les cadrages de caméra qui gardent
le lieu visible. Les textes, valeurs et sélections restent programmés,
lisibles et accessibles : ne les peins pas dans une image.

À la fermeture d’une interaction, rends correctement le contrôle
et le focus. Empêche les déplacements et attaques de traverser
une interface ouverte.

Conserve un menu de pause et un accès rapide aux installations.
Ils doivent appeler les mêmes fonctions, sans dupliquer la progression.

Fais évoluer le vaisseau grâce aux événements réels :
trophées exposés, armes débloquées, destinations reconnues et rang.
Aucune porte ou installation ne doit annoncer une fonction inexistante.

VALIDATION
Teste nouvelle partie, ancienne sauvegarde, équipement, départ,
annulation du briefing, retour de chasse et rechargement.
Vérifie clavier remappé, manette et commandes tactiles prévues.
Aucune double récompense, double dépense ou position dans un obstacle.

Livre du code intégré et un parcours utilisable, pas seulement
une maquette, un plan du vaisseau ou une documentation.
```

---

## 3. Les images OpenAI : fabriquer un kit de jeu, pas une collection de tableaux

Pour tes couloirs, la distinction essentielle est celle-ci :

**Mauvaise approche :** générer indépendamment une image de couloir, une image d’armurerie et une image de passerelle, puis essayer de les raccorder.

**Approche que je recommande :** définir une échelle et des points de raccord communs, puis produire séparément sols, parois, cadres de portes, portes mobiles, consoles, objets et premiers plans.

Ainsi, **une porte reste le même objet** lorsqu’elle s’ouvre, et **deux couloirs se raccordent suivant des coordonnées définies**, pas parce que leurs illustrations se ressemblent approximativement.

Les outils d’image permettent de travailler avec des références et des retouches, mais la documentation OpenAI signale encore des limites de cohérence et de placement précis. Il faut donc compléter les prompts par des gabarits, du traitement d’image et des validations dans le jeu. citeturn159161view2

### Prompt 2 — Images cohérentes et décors modulaires

```text
Travaille sur la bibliothèque graphique de Yautja : La Longue Chasse.

OBJECTIF
Produire avec OpenAI Images les ressources artistiques manquantes,
puis les intégrer dans des niveaux réellement jouables et modulaires.
Réutilise les ressources existantes qui respectent le standard.

Ne remplace pas le gameplay par des illustrations.
La géométrie, les collisions, les interactions et les comportements
restent indépendants des images.

1. VERROUILLER LA DIRECTION ARTISTIQUE
Inspecte les assets existants et les références identifiées.
Définis une bible commune :
caméra, projection, proportions, échelle, matériaux, palette,
éclairage, niveau de détail, contours et règles d’occlusion.

Utilise les images maîtresses comme références effectivement jointes
aux générations suivantes. Répéter leur nom dans un prompt ne suffit pas.

Distingue contenu de franchise référencé et création originale du jeu.
Préserve l’identité des personnages et des huit mondes existants.

2. DÉFINIR LES CONTRATS AVANT DE GÉNÉRER
Pour chaque famille de modules, fixe :
dimensions source et taille dans le monde, pivot, ligne de sol,
couches, surfaces marchables, collisions, points d’interaction,
raccords nommés, états et transformations autorisées.

Adapte la grille et les dimensions au moteur actuel.
Ne change pas arbitrairement la perspective ou l’échelle du personnage.

3. CONSTRUIRE DES KITS
Sépare architecture de fond, surfaces jouables, cloisons,
cadres de portes, vantaux, objets interactifs, décoration,
premiers plans et effets.

Prévois les pièces réellement utilisées :
coursives répétables, entrées de salles, sas, transitions de hauteur,
installations, supports de trophées et éléments propres aux biomes.

Les variantes d’une porte ou d’un module conservent leurs raccords.
Ne dessine pas le personnage, les ennemis ou les objets ramassables
dans les arrière-plans.

4. PRODUIRE DES FICHIERS EXPLOITABLES
Utilise un véritable canal alpha pour les éléments détourés.
Pas de damier peint, pas de fond vert présenté comme transparent.
Les terrains opaques n’ont pas besoin d’être artificiellement détourés.

Préserve le rig modulaire et ses points d’attache.
Une nouvelle pièce ne doit pas incorporer les couches voisines.

Ne retourne pas automatiquement les équipements asymétriques.
Les orientations autorisées doivent être déclarées.

5. GÉNÉRATION RÉELLE ET MAÎTRISÉE
Vérifie l’outil d’image disponible et les capacités actuelles du modèle :
références, édition, transparence, dimensions et formats.

Si nécessaire, prépare un script de production côté développeur.
Aucun appel de génération dans la boucle de jeu.
Aucune clé API dans le client ou les fichiers publics.

Respecte un budget autorisé, un plafond de jobs et des reprises bornées.
Sans outil ou autorisation, prépare la production et indique le blocage ;
ne prétends pas avoir généré les images.

Enregistre prompt résolu, références envoyées, modèle, paramètres,
fichier reçu, dimensions observées, hash, traitements et consommateurs.

6. CONTRÔLER ET INTÉGRER
Commence par un petit lot représentatif intégré dans une vraie salle.
Teste longue coursive, porte ouverte/fermée, raccord de salle,
changement de hauteur, occlusion et personnage à son échelle réelle.

Un prompt « seamless » ne constitue pas une validation.
Corrige les raccords avec gabarits, bandes communes et traitements
contrôlés lorsque nécessaire.

Distingue les états :
prévu, généré, validé techniquement, inspecté visuellement,
intégré et testé en jeu.

Livre les assets, manifestes, scripts utiles, scène de contrôle
et secteur jouable habillé. Pas seulement un dossier d’images.
```

La génération doit rester dans ton processus de production. OpenAI recommande de ne jamais exposer une clé API dans un navigateur ni de la committer dans le dépôt. citeturn645167view2

---

## 4. Le contenu : donner une identité jouable à chaque chasse

Je ne demanderais pas immédiatement « ajoute vingt planètes ». **Tes huit chasses constituent déjà un périmètre intéressant à approfondir.**

Le point à vérifier est surtout que les différences annoncées existent réellement : traquer Vey ne devrait pas demander les mêmes décisions que chasser une créature sensible aux vibrations ou neutraliser un réseau mycélien.

J’ai également intégré des vérifications ciblées dans le fichier complet : initialisation d’une chasse rejouée après débriefing, armes affichées dans la personnalisation, correspondance entre trophée et partie récupérée, ainsi qu’une incohérence de désignation d’Acheron-Sigma entre certains textes. **Ce sont des points à reproduire et examiner, pas des bugs que je prétends avoir confirmés en jouant.**

### Prompt 3 — Gameplay, contenu, cohérence et finition

```text
Approfondis et termine Yautja : La Longue Chasse en conservant
les systèmes existants, le vaisseau jouable et les contrats graphiques.

PRIORITÉ
Réalise d’abord une boucle complète exemplaire :
préparation à bord → départ → approche → traque → affrontement →
prélèvement → extraction → retour → progression sauvegardée.

Ensuite, applique ce standard aux huit missions.
N’ajoute pas de nouvelles planètes pour masquer des missions incomplètes.

AUDIT DU CONTENU
Pour chaque système et contenu, distingue :
définition, asset, comportement exécuté, accessibilité au joueur,
liaison à la progression et tests réalisés.

Ne compte pas les archives de franchise non jouables comme des
ennemis affrontables ou des trophées obtenables.

RESSENTI
Vérifie déplacements, caméra, collisions, visée, animations,
détection des coups, origine des projectiles et réactions ennemies.
Synchronise l’effet mécanique avec l’action visible.
Respecte les paramètres d’accessibilité et les commandes remappées.

VRAIE TRAQUE
Les traces et scans doivent fournir des informations utiles.
Les leurres, pièges, visions, hauteurs et couvertures doivent offrir
des approches différentes, avec des avantages et des risques.

Les ennemis détectent suivant des règles observables.
Pas d’omniscience arbitraire ni de renforts apparus sans explication.

IDENTITÉ DES MISSIONS
Vérifie et approfondis les mécaniques déjà annoncées :
- Oseris-IV : unité organisée, canopée et contre-mesures de Vey.
- Nivalis-K : traces froides, meute et charges contre les piliers.
- Cinder-12 : rival Yautja, règles du duel et interruption de la purge.
- Naraka-Delta : chenaux, marées et menaces multiples de l’Hydre.
- Serekh-9 : vibrations, surfaces et embuscades souterraines.
- Pelagos-M : récifs, verticalité, vagues et bonds du Léviathan.
- Mycora-V : relais sensoriels, réseau et adaptation limitée.
- Acheron-Sigma : contre-mesures, dispositifs et conclusion de campagne.

Une description de phase n’est pas une preuve d’implémentation.
Relie chaque promesse importante à un comportement et à un test.

PROGRESSION ET COHÉRENCE
Conserve les monnaies, rangs et améliorations déjà prévus.
Vérifie les prérequis : aucun outil obligatoire ne doit être débloqué
seulement après le passage qui le nécessite.

Relie chaque trophée à la bonne proie, au bon objet, à la bonne image,
à la bonne interaction et à son exposition dans le vaisseau.
Ne transforme pas tous les prélèvements en crânes génériques.

Distingue les références de franchise des créations originales.
Harmonise noms, morphologies, équipements, climat, technologie,
échelle des décors et textes de mission.

FIABILITÉ
Vérifie nouvelle chasse, relance après débriefing, reprise,
checkpoint, abandon et validation unique des récompenses.
Préserve les sauvegardes anciennes avec migrations testées.

Réutilise le système audio existant et améliore son intégration.
Les images ne remplacent ni les sons, ni les effets déclenchés,
ni les comportements.

VALIDATION
Teste le parcours complet avec nouvelle et ancienne sauvegarde,
clavier remappé, manette et commandes tactiles prévues.
Vérifie portes, raccords, collisions, objectifs accessibles,
boss, extraction, trophées, fin et déverrouillages.

Mesure chargements, temps de frame et mémoire avant/après.
Ne déclare pas « 60 FPS », « complet » ou « testé » sans preuve.

Livre du code intégré, les données et assets associés, les migrations,
un rapport de tests et un état clair des éléments encore incomplets.
Une compilation réussie ou un catalogue plus long ne suffit pas.
```

## 5. Et pour une version PC indépendante ?

C’est une étape pertinente **après** cette consolidation : jeu et ressources embarqués, lancement propre, sauvegardes persistantes, plein écran, manette et fonctionnement hors connexion lorsque possible.

Une piste comme Tauri mérite d’être étudiée sans changer automatiquement de moteur. Son intégration documentée avec Next.js repose sur un export statique : Codex doit donc vérifier les éventuelles dépendances serveur du projet avant de l’appliquer. citeturn645167view3

**Ma priorité pour ton jeu serait donc : un vaisseau vivant, une première chasse vraiment aboutie et un retour avec trophée parfaitement relié à la progression. Puis étendre ce niveau de qualité aux sept autres mondes — avant d’augmenter encore le catalogue.**
