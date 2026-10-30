# Guerre des clans V115 — quatre familles de mandats jouables

Date de cadrage : 30 octobre 2026. Branche de développement : feat/v115-clan-mission-formats-20261030.

## Périmètre et traçabilité

Cette itération ajoute une entrée dans la Bible V6 : **Opérations jouables · 4 modes**. Le moteur TypeScript est dans app/game/systems/clanWarOperationsV115.ts, le panneau client dans app/game/ClanWarOperationsV115.tsx, la présentation dans son fichier CSS module, et les régressions dans tests/clan-war-operations-v115.test.mjs.

Le jeu possède déjà des systèmes différents qui ne doivent pas être confondus :

- Bible courante : Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx, source déclinée en W3-Uxx (équipes), W3-Kxx (territoires), W3-Lxx (passages), règles PC/RAV/XP/risques ; export clonable par WarRulesV6.
- Archivage plus ancien : Yautja_V3_Guerres_de_Clans_Trois_Modes.xlsx, CON-Txx / RTS-Uxx ; moteur WarSimulationV85, atlas planétaire, conquêtes V106 et guerre par tours.
- Campagne principale : SaveGame, personnage, chasse, rang, équipement, trophées et progression Homeworld.

La livraison V115 reste un **exercice V6 autonome**. Elle ne crée AUCUN alias W3-U → RTS-U, W3-K → CON-T, aucune unité de campagne gratuite, aucun revenu de territoire sans transfert physique, aucune souveraineté ni équipement du héros. Les effets V115 (pression, sabotage, renseignement, escorte, expérience, blessures, rapports) appartiennent à la même archive de cet exercice, non à celle du système V85. Pour toucher la campagne, une passerelle explicite de profils/identités, une résolution atomique et un règlement du conflit V3/V6 sont encore nécessaires.

## Inspiré de mécaniques, pas d'éléments importés

1. Assaut latéral : inspiration de Metal Slug Attack Reloaded. Deux points fortifiés, AP de déploiement qui se régénèrent, unités progressant et s'affrontant automatiquement, initiative laissée au joueur sur l'ordre de sortie. Les AP sont propres au mini-jeu et **ne sont pas les PC ni les RAV de la Bible**. Les équipes ne peuvent être déployées qu'une fois par mandat ; pas de reproduction illimitée.
2. Mandats délégués : inspiration des Outer Ops de Metal Gear Solid: Peace Walker. Affecter des équipes réellement disponibles, payer leur entretien, patienter une durée annoncée, reprendre un rapport avec les identités et pertes éventuelles. Trois mandats en parallèle. À la réouverture, l'heure actuelle est comparée à l'échéance sauvegardée ; aucun service distant ni Worker n'agit pendant la fermeture.
3. Infiltration/sabotage : parcours 9 × 6 cases, patrouille déterministe, obstacles infranchissables, camouflage optique limité, relais à atteindre, interaction puis extraction réelle. Pas d'élimination gratuite, pas de progression par clic de texte seul.
4. Guerre totale RTS : vue de dessus 9 × 6 cases, choix d'une équipe, déplacement/attaque limités par ses propriétés, riposte des gardes adverses après chaque ordre, objectif de tenue deux tours ou défense entièrement neutralisée. Les pions sont des substituts techniques des sprites, pas une preuve d'animation de films.

Ces quatre expériences consomment toutes des équipes W3-U réellement identifiées, les RAV d'entretien de leur fiche et utilisent les paramètres d'expérience/fatigue de applyWarResultV6. Le graphe W3-L est contrôlé par planWarRouteV6 lors du départ. L'âge du renseignement et le secret des vraies garnisons V85 ne sont jamais déduits du résultat de cette simulation.

## Conservation et résultat unique

- Une équipe affectée ne peut pas être réutilisée dans un autre mandat, même en attente. La disponibilité se lit depuis la même table assignments.
- Tout rapport possède un identifiant d'opération unique W115-OPS-xxxx, un mode, un objectif, un résultat et les membres réellement concernés. applyWarResultV6 est appelé par membre apte avec ce résultat ; son propre registre de reçus évite le doublon.
- Une perte de pion réduit l'aptitude en blessant un membre de l'équipe de référence ; un membre mort ne réapparaît jamais sous le même identifiant. Le lot ne simule pas de soins : brancher sur l'infirmerie V92 est un chantier distinct.
- Les succès créent des marqueurs persistants dans l'archive V115 : renseignement (recon/stealth), relais affaibli (stealth), itinéraire sécurisé (escort), pression tactique (assaut, RTS, interception). La pression **ne change pas le contrôleur du territoire**. La conquête et la garde réelle sont actuellement du ressort du système V85.
- La dépense de mission a lieu une fois à la réservation. Le reste de RAV n'est pas rechargé artificiellement par le mini-jeu. Les chiffres inventés pour le rythme du jeu (AP, HP de bastions, seuil d'alerte, déplacement, 30 s + 10 s/passage, algorithme de confrontation Outer Ops) sont affichés et ne sont pas attribués aux cellules du classeur.
- Les délais différés sont fondés sur l'horloge de l'appareil et n'offrent pas de garantie serveur anti-triche. Le rapport est réglé à la prochaine ouverture / lecture, sans notification hors application.
- Le scénario actif, les délégations, les blessures, les équipes, les RAV, les indices et les rapports sont écrits dans yautja.clan-war.v115.operations.free.v1. Une archive inconnue, future ou mal formée verrouille les écritures et préserve ses octets. La remise à zéro demande une action explicite. Une Bible V6 privée chargée en mémoire ne persiste pas dans cette archive.
- La sauvegarde principale, les profils V3 et les archives V6 des autres exercices ne sont pas écrits. Le panneau signale explicitement cette séparation.

## Lore Yautja — exigences de fidélité

Les factions adverses de ce prototype ne sont pas baptisées arbitrairement « clan canon ». Les unités sont exclusivement celles de la Bible V6 de ce projet. Leur origine est conservée comme création/adaptation du jeu, et non requalifiée en personnages officiellement vus à l'écran.

Pour les futurs scénarios de guerre de clans :

- Priorité aux conflits Yautja effectivement sourcés, aux rivalités de Bad Blood et à l'intervention éventuelle d'Enforcers ; chaque référence doit associer œuvre, contexte narratif, époque et niveau de certitude. Exemple : les Killer Predators et le conflit de Three World War relèvent de la continuité des comics, et ne deviennent pas une chronologie universelle de toutes les œuvres.
- Une infiltration peut rechercher une preuve, libérer un captif ou saboter un appareillage ennemi sans transformer automatiquement le personnage en tueur déshonorant. Les conséquences morales nécessitent une règle vérifiée, pas un bonus d'honneur inventé.
- Les combattants, leurs masques, dreadlocks, équipements, montures et vaisseaux doivent employer les ressources validées du jeu avec le bon profil. Les pions de V115 sont volontairement schématiques jusqu'au raccord des vrais sprites animés.
- Un détachement Yautja et un commandement de clan ne doivent pas se confondre avec une division humaine industrielle. Tactiques de meute/chasse, maîtrise du terrain, prise de trophées légitime, rites et rapports au Conseil sont des directions narratives à valider référence par référence.

Références de mécaniques consultables :
- SNK, guide officiel Metal Slug Attack (AP, bases, production, attaques spéciales) : https://game.snk-corp.co.jp/official/metalslug_attack/how_to_play/01.php
- Konami, manuel français Peace Walker (missions, préparatifs, rapports) : https://metalgear.konami.net/manual/mc2/mgspw/xbox/fr/page17.html
- Documentation communautaire Outer Ops, pour la présentation des rapports : https://www.trueachievements.com/game/Metal-Gear-Solid-Peace-Walker/walkthrough/12
- Compilation communautaire des clans et de leur provenance : https://www.avpcentral.com/predator-clans (à confronter à l'œuvre originale avant d'attribuer le statut canon).

## Contrôles à exécuter sur la branche

- npm run typecheck
- npx eslint app/game/ClanWarOperationsV115.tsx app/game/ClanWarBibleV6Panel.tsx app/game/systems/clanWarOperationsV115.ts tests/clan-war-operations-v115.test.mjs
- node --experimental-strip-types --test tests/clan-war-operations-v115.test.mjs
- Tester ensuite le menu V6 réel dans un navigateur : accès, sélection de quatre modes, départ, déploiement AP, déplacement et extraction, réponse RTS, reprise d'Outer Ops après fermeture, petit écran, clavier, mise en veille et archive corrompue.

La compilation et les tests ciblés ne prouvent ni la fidélité de sprites 1:1 ni l'équilibrage, l'IA de guerre totale ou le raccord à la campagne. La livraison V115 est un **socle jouable** ; le RTS complet (bâtiments, brouillard de guerre, fog, logistique spatiale, armées multiples, véritable multijoueur), l'infiltration intégrée dans les scènes du héros et la diplomatie/honneur restent des chantiers ouverts à livrer avec preuves distinctes.
