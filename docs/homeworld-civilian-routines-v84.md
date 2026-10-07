# Population civile — routines contextuelles V84

`homeworldCivilianRoutinesV84.ts` fournit une pose déterministe pour les habitants mobiles de la cité et les figurants urbains déjà dessinés avec l’alias `homeworldResidentPoseV77`. Il utilise exclusivement les secondes de la cité active : aucun minuteur indépendant, hasard renouvelé au rendu ou rattrapage du temps réel.

## Cycle réel

Chaque habitant suit les segments de sa **polyline existante**, à sa vitesse existante, s’arrête à son extrémité finale, revient sur les mêmes segments puis attend à l’extrémité initiale. Les deux haltes ont des durées différentes. L’attente de base et la phase existantes restent des entrées du modèle ; le rôle d’origine, l’identité et le nom éventuel ajoutent un profil stable et désynchronisé.

Les familles sont artisans, courriers, archives, garde, foyer, apprentissage et visiteurs. Les libellés décrivent une attente de métier locale : remise d’outils, destinataire, récit, relève, visiteur ou consignes. Ils n’affirment pas qu’un outil est manipulé ni qu’un meuble absent se trouve à ce point. Une halte conserve le portrait natif existant, sans rotation, oscillation, faux geste ou déplacement hors trajet.

Quatre groupes de métier sont documentés : outils/parures des forges, relais du quai, lecteurs/copistes de la mémoire et relève des dossiers. Leurs membres gardent chacun leur trajet et leurs rythmes. Ces noms **ne créent pas un rassemblement spatial ni une conversation de groupe** ; aucun point commun n’est inventé entre des extrémités éloignées.

## Consommateurs

- `homeworldWorldV77.ts` remplace seulement le provider de l’alias de pose existant. La recherche de l’habitant proche et les fonctions d’occupancy qui utilisaient cet alias reçoivent donc le même parcours/halte que le rendu. Le lot n’ajoute pas de nouveau corps solide aux habitants auparavant non bloquants.
- `HomeworldHub` utilise la même pose pour afficher la phase et le groupe de métier dans le dialogue civil. Le dialogue existant, les repères et les services ne sont pas remplacés.
- `HomeworldWorldSceneV77` consomme `pose.motionSeconds` pour les cellules natives de marche et transmet `reducedMotion` à `HomeworldCivilianV72`. Ce dernier fige alors le dessin de marche, **sans changer la position** utilisée par les dialogues et l’occupancy. Les données de phase, famille et groupe du même provider sont portées par le conteneur du résident rendu.
- `homeworldCivilianRoutineCodexV84(residents)` produit des fiches de lecture avec identité, étage, path déjà en coordonnées de monde, vitesse, haltes, phase, famille/groupe et contraintes. `homeworldCivilianRoutineElementCodexV84.ts` reçoit les résidents V77 déjà placés et les extras V78 réellement montés, puis `homeworldContextCodexV71.ts` ajoute ces fiches au registre affiché après les mappers historiques ; aucune deuxième translation du Port. Les extras refusés par leur provider ne deviennent pas des routines visibles dans le codex ; les extras acceptés restent non interactifs et ne rejoignent pas les recherches de dialogue ou les visites sauvegardées.

Les pauses, dialogues, carte/repères, écran suspendu, assets en chargement, onglet caché et perte de focus gardent l’horloge du Hub arrêtée selon le moteur existant. Les routines n’ajoutent ni sauvegarde, visite, preuve, récompense, rang, service, quête, costume, accès ni habitant.

## Limites et livraison

Les dessins de marche V74 et les portraits de halte sont réutilisés. **Aucune nouvelle plaquette d’animation sociale** (parler, travailler, porter un colis, saluer), synchronisation de groupe, planification d’itinéraires ou évitement dynamique entre habitants n’a été produite. La description quotidienne V75 préexistante reste distincte du nouveau libellé de phase ; elle n’est pas une action dessinée.

Sources provider/alias/Hub/Civilian et raccords Scene/ContextCodex livrés dans ce lot. Le nombre de fiches de routine suit les collections runtime existantes ; aucun import ni démarrage du jeu n’a été exécuté pour compter des habitants effectivement montés. **Aucun test, audit, lint, typecheck, build local, contrôle navigateur ou contrôle public n’a été exécuté**, conformément à la demande. Ce document décrit les écritures de sources, pas une validation en jeu ni une réception de publication.
