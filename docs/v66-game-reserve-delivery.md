# V66 — Première expédition Game Reserve

Cette livraison rend jouable **une première sortie solo de Vharuun**, création originale du jeu. Elle ne déclare pas les dix réserves ou leurs quatre-vingts secteurs terminés.

## Contenu livré

- Trois secteurs reliés physiquement dans un terrain de 4 800 unités : Jungle des Parachutes, Lisière de la Foreuse et Camp des Trophées. Onze plateformes constituent une route haute alternative. Le retour se fait au point d’extraction initial.
- Huit combattants humains adultes armés, créations d’essai nommées pour cette sortie. Quatre rôles : meneur, sapeur/mécanicien, tireur et vétéran. Deux groupes préparent deux appareils distincts.
- Déplacement et saut ; observation maintenue pour identifier un rôle ; camouflage avec consommation d’énergie ; lames et plasma. Le plasma vise une cible réellement visible devant le chasseur, y compris depuis la canopée.
- Empreintes temporaires issues des déplacements réels. Les humains suivent leurs propres objectifs de collecte ; la connaissance du chasseur dépend d’une vision locale ou d’un témoin proche. Un tir annoncé vise la dernière position vue, pas une position cachée obtenue artificiellement.
- Composants récupérés puis transportés à pied. Réparation physique, plus rapide avec un technicien mais réalisable après sa perte. Sabotage réparable. Embarquement réel à proximité de l’appareil, alerte de moteurs de quinze secondes, décollage et évadés persistants.
- Prélèvement maintenu trois secondes auprès d’une proie abattue, interrompu par un mouvement ou une blessure. Le bilan distingue prises sécurisées, prises laissées, combattants présents et évadés.
- Sauvegarde versionnée, validation stricte, protection des anciens/futurs checkpoints, garde monotone des faits, pause, reprise et retour au dossier. Aucun rang, équipement, honneur ou trophée de campagne attribué automatiquement.
- Commandes clavier reconfigurées via les réglages de chasse existants, manette standard, boutons tactiles, pause sur perte de focus/manette et attente des images. Une erreur d’écriture conserve la scène en attente d’une nouvelle tentative.

## Source et statut du lore

Les demandes viennent de « Répartition des joueurs Predator », discussion `6aa9eb58-e760-83eb-8098-e735f1d01161`, archive initiale locale `work/v36/progression-art-specs/repartition-source.md` et extrait ultérieur `work-local/v66/reserve-latest-source.json`. L’utilisateur y abandonne explicitement le projet à cent joueurs. La sélection d’adultes combattants armés est une règle de ses réserves, pas une règle universelle affirmée de la franchise.

La [présentation officielle de Predators](https://www.20thcenturystudios.com/movies/predators), consultée le 1 octobre 2026, fournit le principe de combattants humains chassés sur une planète étrangère. Les lieux, personnages, règles de réparation et objectifs de Vharuun sont des adaptations originales ; aucune identité ni biographie canonique n’est attribuée aux huit adversaires.

## Art et limites déclarées

Le rendu utilise dix fichiers raster natifs déjà présents. Trois atlas humains V7 fournissent chacun six dessins (repos, deux marches, tir, impact, mort). Les huit personnages partagent ces trois archétypes visuels ; ils ne sont pas présentés comme huit nouveaux atlas. Les images H001–H100 annoncées dans ChatGPT ne sont pas disponibles localement et ne sont pas remplacées fictivement.

Le joueur utilise le dessin original `hunter.webp` en pose tenue ; une nouvelle animation complète du personnage personnalisé reste à produire. Les décors, sols, plateformes, silhouettes de vaisseau et détails mécaniques réemploient les assets existants. Les repères de composants, lignes de topographie, jauges et tirs sont des éléments fonctionnels de HUD/rendu, pas de nouveaux props natifs déclarés.

Les neuf autres réserves, les cinq autres secteurs de Vharuun, les biographies/200 PNG des cent combattants, les rivaux Yautja, les contrats de clans, la coopération multijoueur, les trophées persistants dans la collection et la durée cible de 20–35 minutes restent hors du périmètre livré. La réserve actuelle est une sortie compacte dont la durée dépend des interceptions ; cette durée cible n’est pas certifiée.

Limite d’interception actuelle : le sabotage concerne les circuits **avant** le lancement des moteurs. Une fois celui-ci commencé, les humains déjà au pied de l’appareil embarquent rapidement ; l’alerte de quinze secondes permet surtout d’intercepter les retardataires. Les passagers embarqués ne sont plus des cibles extérieures et un appareil rempli ne peut pas être stoppé dans ce premier lot. Un futur passage doit développer la défense de la rampe, le sabotage pendant l’embarquement et un débarquement physique cohérent, sans régression artificielle des issues enregistrées.

## Validation

`tests/game-reserve-v66.test.mjs` : **11 tests ciblés réussis**. Ils contrôlent la sérialisation, les enums malformés, le démarrage neutralisé, la pause, les plateformes/secteurs, la vision et les témoins, les coûts/pressions de tir, les prélèvements interrompus, le transport et les deux évasions, le remplacement du technicien, le sabotage réparable et les issues sans récompenses. Tous les déplacements humains sont bornés à chaque pas de simulation pendant l’évasion complète ; des checkpoints sont relus à chaque phase.

Lint des quatre fichiers runtime/tests : zéro erreur. Typecheck sans erreur dans les fichiers de ce mode lors du contrôle ciblé ; la validation globale et la publication appartiennent au lot V66 principal.

`scripts/verify-game-reserve-v66.mjs` a passé **quatre groupes de contrôles sur le serveur Next compilé local** : lancement depuis le dossier, images natives, clavier, pause, refus d’écriture/reprise, mobile, annulation de remplacement, rechargement de page et retour physique. Les sept captures ont été inspectées. L’horloge de test est installée avant le moteur et reprend son cours normal lors du rechargement React ; aucune source runtime n’a été modifiée pour satisfaire ce parcours.

`scripts/verify-game-reserve-traversal-v66.mjs` a passé **deux contrôles complémentaires** : traversée réelle des trois secteurs au clavier (mouvement, saut, camouflage), puis déplacement réel au pointeur par les commandes tactiles. Le chasseur termine la dernière recette, après correction du panorama, avec 76 PV, sans immunité ni coordonnées injectées. Les quatre captures supplémentaires ont été inspectées. Échap reprend aussi la chasse depuis un bouton focalisé, sans détourner les saisies de texte.

Le cadrage mobile initialement trop petit a été corrigé puis vérifié sur la version recompilée : à 844 × 390, le terrain occupe 844 × 281 pixels, soit toute la largeur et 72 % de la hauteur. La largeur logique suit l'espace disponible sans étirer les dessins ni modifier la physique. Les huit commandes tactiles mesurent au moins 44 × 44 pixels et restent entièrement dans l'écran. Les pauses en portrait à 393 × 852 restent défilables.

Le ciel répété initialement visible en paysage est maintenant dessiné une seule fois en panorama de type cover avec une parallaxe bornée. Aucun fichier natif, sol ni comportement de simulation n'a changé. Le tour des trois secteurs et le paysage ont été rejoués après recompilation ; les quatre nouvelles captures confirment une lune unique et l'absence de raccord cloné du ciel. Le parcours principal de sauvegarde/reprise a été exécuté avant cette dernière modification uniquement visuelle.

Preuve consolidée : `docs/v66-game-reserve-browser-qa.json`, six groupes de contrôles navigateur, onze captures avec SHA-256 et zéro erreur JS/HTTP pour le parcours principal. Chaque rapport précise son passage avant ou après la correction du fond. Il s’agit de la version compilée locale, **pas d’une preuve de publication**.

La revue visuelle conserve des limites explicites : la lisière industrielle utilise encore un panneau mécanique rectangulaire plutôt qu’un extérieur de foreuse final ; le chasseur conserve une pose native tenue. Les contacts au sol, les trois familles de sprites humains et la lisibilité desktop sont contrôlés, sans certifier une finition commerciale complète.
