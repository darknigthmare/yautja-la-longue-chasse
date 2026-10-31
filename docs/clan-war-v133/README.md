# V133 — Équipes physiques W3, premier RTS tactique multi-escouades

**Branche :** `feat/v133-w3-multi-squad-rts-20261031` au-dessus de #41. PR #42 (gauntlet) suit son propre chantier et n'est ni copiée ni supprimée. Cette version est empilée sur #41 → #40 → #38 → #37 → #36 → #34 → #29.

## Ce qui est implémenté

- Toutes les **24 missions W3-RTS01…24** s'ouvrent dans un nouvel onglet « RTS W3 · escouades » de la Bible V6, sans supprimer les missions individuelles V129.
- **Deux à quatre détachements distincts** sont préparés depuis les définitions `W3-U`, avec membres, rôle, PV expérimentaux, attaque, portée, mobilité et plafond **PC provenant de la ligne source**. Le joueur peut ajouter/retirer des groupes avant le lancement, mais pas pendant le combat. Aucune escouade de campagne n'est gratuitement créée.
- Apparition à des **cases traversables distinctes** ; quatre commandes cardinales par détachement, occupation physique des cases, murs/eaux/laves, portes motorisées avec coupure de courant, routes alternatives et tir uniquement sur la cible réellement à portée et en visibilité. Une commande refusée ne déclenche ni horloge ni attaque ennemie.
- L'IA adverse n'acquiert une cible qu'en **ligne de vue**. Elle tire ou marche d'une seule case, utilise les groupes `W3-U` du scénario V129, ne révèle jamais une garnison V85 cachée et ne transforme pas les neutres en combattants.
- Les objectifs W3 restent une chaîne de **trois preuves**, 72 interactions physiques source. Reconnaissance obligatoire, maintien du poste pendant les ticks nécessaires, dépendances énergétiques/pression, marées/rafales/glaces/jets avec fenêtres locales, sortie réellement accessible et bilan unique. Les charges sont portées par le groupe qui les récupère ; les personnes escortées suivent une case à la fois et peuvent être mises en danger. Le retrait enregistre les détachements demeurés sur place, **pas une fausse mort automatique**.
- Un tir consomme **1 RAV de simulation** (règle originale, non attribuée au canon). Le PC est un plafond de déploiement. Le système ne touche pas au `SaveGame`, à la campagne V85, à l'XP, à la conquête de territoires ni à l'inventaire.
- Lecture visuelle sur une grille W3 originale, couleurs de terrain, ennemis visibles seulement, position des détachements, journal de 60 tours, ordre individuel, objectifs et sources.

## Ce qui n'est PAS encore fini

Ce prototype est **un RTS tactique d'escarmouche au tour par tour**, pas une guerre totale finalisée. Les bâtiments destructibles, ordres d'escadron en masse, formations, pathfinding automatique en ligne, A* avec gestion de congestion, comportements IA de siège, diplomatie en temps réel, ravitaillement par convois, vaisseaux et montures utilisables, campagne persistante, vrais blessés et recrutés, serveur multijoueur, art PHG/films 1:1, sons, animations et économie équilibrée restent à produire. Le globe WGS84 et les cartes W3 ne constituent pas des reproductions de scènes filmées.

Les 1 200 contrats V120 demeurent **design-only** : ils ne deviennent pas jouables du fait que le moteur multi-escouades existe. Les six mondes de la Bible W3 (Korthas, Vesh-Kar, Namarra, Oruun, Sahr-Keth, Ilyss) restent des créations du jeu, sans déplacer Gunnison ou Los Angeles sur une planète alien. MAP10 est une installation sous glace chauffée ; MAP12 reste en zone orbitale.

## QA

`tests/clan-war-rts-squads-v133.test.mjs` vérifie : 24 contrats, 72 objectifs en parcours de test isolés des ennemis, mouvements et PC, collisions, tirs/RAV, source géographique, repli et reçus uniques. Les parcours sans ennemis valident les **objectifs**, pas l'équilibrage d'une bataille en opposition réelle ; les tests de combat vérifient séparément la ligne de vue, les dégâts et les rejets. Le navigateur, la performance sur téléphone, la prise en charge manette, le comportement du rendu SVG, l'IA avancée et la charge mémoire exigent des essais supplémentaires.

### Raccord futur V85/V6 (interdit tant que non vérifié)

1. Lier les IDs réels de membres de campagne aux groupes sans duplication ni recrutement libre.
2. Vérifier propriété des territoires, garnison, crédits RAV et états de convoi au départ et à l'extraction.
3. Enregistrer un reçu signé/idempotent via le contrat de résultat de la campagne ; gérer les groupes blessés, absents et repliés.
4. Séparer simulation locale, règles serveur et snapshots masqués dans les parties en ligne.
5. Valider explicitement chaque source de lore par œuvre, époque et continuité, sans inventer de conflit canonique.

## V134 — ordres synchronisés et reprise physique des escortes

L'interface de la Bible V6 permet de cocher plusieurs escouades, de choisir une case de rassemblement et de faire avancer leurs formations pendant **un même tour tactique** (au plus une case chacune). Le planificateur `planWarRtsRallyV134` choisit des cases distinctes à deux cases au plus de l'objectif, utilise le réseau physique de la carte W3, refuse murs, eau profonde, lave, ennemis et portes motorisées hors tension. Les zones de danger **actives au prochain tour** sont évitées par le planificateur. Les colonnes groupées ne traversent jamais une formation alliée ni un ennemi. Une route congestionnée est signalée au lieu de téléporter les membres.

`commandWarRtsRallyV134` applique simultanément les déplacements acceptables en une seule réaction adverse. Le joueur peut commander plusieurs escouades **sans payer plusieurs réactions ennemies artificielles**, contrairement à la boucle de commandes individuelles V133. Aucun RAV supplémentaire n'est consommé pour cet ordre et aucune expérience, conquête ou recrue n'est créée. Les mouvements bloqués sont signalés et le joueur peut modifier le rassemblement.

La commande de reprise d'escorte prend maintenant en charge les **personnes secourues et témoins neutres**, ainsi que les charges physiques. Si le responsable est neutralisé, une autre escouade **déjà présente à proximité réelle** peut reprendre la responsabilité sans dupliquer l'acteur, inventer un recrutement ni modifier son statut neutre.

Le planificateur de regroupement se base désormais uniquement sur les **ennemis visibles aux escouades** ; les patrouilles cachées ne modifient ni le chemin ni la liste des cases supposées bloquées. Le moteur conserve les collisions physiques réelles lors de l'exécution, sans révéler à distance les identités adverses.

La liste des positions d'objectif dans le panneau est **masquée avant reconnaissance** ; elle n'offre plus leurs coordonnées en lecture directe avant que le joueur ait observé les accès.

**Limites conservées :** étude au tour par tour sur cartes W3 générées, pas encore pathfinding dynamique de guerre totale, ni serveur autoritaire, ni troupe de campagne persistante, ni animations/sprites cinématographiques 1:1. Les pions et la fenêtre de regroupement de deux cases sont des mécanismes de jeu originaux, pas du lore filmique.

**QA à vérifier :** `tests/clan-war-rts-rally-v134.test.mjs` vérifie 24 cartes, un seul tick adverse par mouvement collectif, indépendance et absence de collision, portes, dangers, refus sans effet de bord, reprise des escortes/survivants/témoins neutres, maintien des identités et reçus uniques. Répéter sur navigateur desktop/mobile et manette avant release.

## Excel de production actualisé V134

Le [classeur V134](../clan-war-v134/Yautja_Guerres_Clans_Suivi_Production_V134_2026-10-31.xlsx) conserve les **1 200 fiches V120**, les **125 exigences antérieures**, les 24 scénarios W3, les 36 dossiers W5 et les 12 cartes. Il possède maintenant **18 onglets**, dont `RTS_V134_SYNCHRO` détaillant **18 nouvelles fonctions et contrôles techniques + 24 contrats de carte**, soit 42 lignes de traçabilité. La grille QA transverse contient **7 contrôles V134 supplémentaires**.

L'état `Validé CI ciblée` signifie uniquement : test Node, TypeScript, ESLint et vérification du classeur sur le commit de cette branche. **Aucun sprite 1:1, aucune guerre totale et aucun serveur PvP n'est validé par cette mention.**

La CI `.github/workflows/clan-war-v133.yml` exécute le nouveau test `tests/clan-war-production-v134.test.mjs`, confirmant les 18 onglets, les 42 exigences, les sept nouveaux QA, les 1 200 IDs de design et les catalogues W3/W5 conservés.
