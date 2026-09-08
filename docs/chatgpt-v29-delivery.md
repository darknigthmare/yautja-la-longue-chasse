# Reprise des conversations ChatGPT — V29

Cette reprise part de V28 (d26cde7) et des quatre partages transmis le 8 septembre. Le texte complet de chaque partage a été récupéré, dédupliqué et rapproché du dépôt. Les pièces jointes référencées par des liens sandbox ne sont pas récupérées ; le texte du chat ne prouve pas leur contenu. Le manifeste chatgpt-source-manifest-v29.json conserve les URL, titres, longueurs et empreintes sans republier les conversations brutes.

## Sources et traitement

| Source | Implémentation dans cette reprise | Reste ouvert |
|---|---|---|
| [Créer un hub Homeworld Predator](https://chatgpt.com/share/6a9f6ce6-2548-83eb-a8ee-152b84e89fe5) | Cité séparée du vaisseau, 12 quartiers sur trois niveaux et trois ascenseurs, services existants, PNJ et preuves, choix relationnels, audience introductive ; première sortie dans les Marches de Cendre. | Neuf régions, campagne complète de cinq actes, objectifs de 36 PNJ / 20 missions / 36 quêtes, artisanat narratif et crises persistantes. |
| [Étendre le concept Bad Blood Enforcer](https://chatgpt.com/share/6a9f6cf2-3614-83ed-8dff-6532bad015b2) | Dossier persistant distinguant actes/preuves/transmission/identification/mandats/pression, choix de revente/exil/enquête, déclaration publique, contrôle de route, reddition et issues de procédure. | Poursuites terrestres, capture et escorte animées, abordage, cellule physique, repaire, équipage et campagne La Marque effacée. |
| [Vérifier et jouer les sons](https://chatgpt.com/share/6a9f6cfe-c468-83eb-9e9d-8fc3f8409d90) | Inventaire automatique, 37 emplacements, formats alternatifs, remplacement des appels historiques, préchargement borné, boucles en streaming, mix/erreurs/autoplay et contextes du vrai jeu. | Enregistrements, musique originale, doublage et validation artistique/écoute longue. Aucun audio de production n’a été fourni dans ce lot. |
| [Audit état du jeu](https://chatgpt.com/share/6a9f6d0f-4f4c-83eb-b254-067d9d8bbfaf) | Rapprochement des 29 sections, corrections des constats devenus anciens, entraînement PIT et contrôles croisés. | Voir chatgpt-audit-status-2026-09-08.md pour chaque domaine. Aucun pourcentage de finition subjectif n’est repris comme mesure. |

Les autres conversations déjà connues, notamment « Concevoir le DLC », et les budgets d’animation restent des sources complémentaires. Cette reprise ne certifie pas que tous les chats du projet privé ont été retrouvés.

## Comportements ajoutés

La cité se visite depuis le pont ou la carte. Elle comprend 12 PNJ nommés, contre l’objectif d’environ 36, et conserve l’équipement, le rang et les services du vaisseau. Les trois preuves du dossier sont ordonnées ; saluer ou revisiter ne permet pas de multiplier les relations. L’audience est une introduction adaptée, distincte des cinq actes non terminés de la campagne.

La porte des Marches demande d’abord d’inspecter le trophée du port. Le terrain possède des ravines, un chemin supérieur secret, des traces à scanner, un relais local et un brouteur territorial dont la charge annoncée déplace un bloc. Retrouver le convoi et rouvrir les passerelles permettent de rapporter une preuve à la navette. Le rapport est validé puis écrit avant de revenir dans la cité. Une interruption ou un échec d’écriture ne donne pas de faux succès ; un nouvel essai conserve les découvertes précédemment rapportées. Il n’y a pas de faux gain de trophée personnel pour une pièce transportée par autrui.

La justice est une première procédure jouable dans une interface de dossier. L’exil ne crée pas de crime, une accusation ne prouve pas la culpabilité et THE PIT n’alimente jamais les mandats. Une déclaration publique Bad Blood transmet le mandat aux routes alliées, annoncé avant confirmation. Un contrôle connu précède le briefing d’une chasse ; identité, contestation, reddition et route de repli ont des conséquences persistantes. Les stations neutres ne reçoivent pas automatiquement cette juridiction. La saisie d’équipement est absente tant qu’un vrai dépôt transactionnel n’existe pas.

THE PIT ajoute le gel, l’avance exacte d’un tick, le reset conservant l’arène et quatre exercices vérifiés dans le moteur : garde basse, anti-air, ouverture puis sortie du coin, Traque puis attaque. La déchoppe reste signalée comme indisponible. Les animations V28 restent des brouillons : ce lot ne transforme pas 66 poses de revue en personnages complètement animés.

## Précision complémentaire sur THE PIT

Le combat utilisait encore des formes Canvas génériques, malgré neuf plaques PNG V5 détourées par identité. Elles sont maintenant chargées pour les seuls combattants présents : Jungle Hunter, City Hunter, Scar, Celtic, Wolf, Feral Hunter, Berserker, Falconer et le boss Warlord. Les poses gardent leurs proportions et leur appui mesuré ; elles restent fixes et provisoires. Les cinq autres combattants conservent un repère explicitement indiqué comme image indisponible, sans emprunter le visage d’un autre chasseur.

La sélection conserve la priorité des quatre illustrations V23. Les autres plaques V5 disponibles remplacent les masques génériques. Les poses latérales regardent vers la carte adverse, par miroir d’affichage côté droit ; les deux vues frontales restent neutres. Les images entières sont conservées. Les 18 rendus de cartes ont été vérifiés dans Chrome. Les preuves sont pit-selection-browser-qa.json et pit-combat-bitmap-browser-qa.json.

Le changement est visuel : aucune position, collision, donnée de replay, durée d’action ou règle de dommage n’est modifiée. Des repères distincts affichent l’anticipation et le contact réellement actifs tant que les membres n’ont pas de séquences dessinées. L’accroupissement et les attaques complètes ne sont pas simulés en déformant une illustration. Les onze planches V28 gardent leur statut de brouillon ; aucune validation artistique n’a été inventée. Le détail des mains de City Hunter V5 a été inspecté sans anomalie anatomique flagrante, mais la prise partiellement occultée n’est pas certifiée 1:1.

## Sauvegarde et limites

Le profil passe de V6 à V7, avec état Homeworld et justice distincts. La migration n’attribue ni preuve, ni crime, ni affiliation à partir du rang. Les choix sociaux ne sont acquittés qu’après écriture confirmée. Si l’écriture réussit mais sa lecture de confirmation échoue, le nouvel essai ne récupère que les octets exacts de cette tentative et son propriétaire. Une action différente doit être recalculée après actualisation ; la progression d’une autre session n’est jamais adoptée ni remplacée. L’export reste celui de la campagne ; le bundle complet des annexes est encore absent.

Les bâtiments, props et personnages utilisent les ressources existantes en couches séparées. De nouvelles illustrations de production propres à la cité, ses métiers et à toutes les arrestations restent nécessaires. Le roi et les organisations de cette cité sont des créations pour ce jeu de fan ; aucune monarchie universelle n’est affirmée.

## Recette de cette version

La régression globale a réussi : 982 tests, zéro échec, zéro test ignoré. TypeScript global, ESLint global et le build web Vinext passent. Les tests couvrent notamment la migration V7, la protection entre sessions, les choix Homeworld et Justice, l’entraînement PIT et l’audio optionnel. Les 14 tests de reprise de sauvegarde incluent cinq scénarios exécutant le vrai callback de GameClient. Les 22 contrôles audio passent également.

Le parcours dans le vrai GameClient valide le port, l’expédition intégrale, le rapport durable, le retour à la même position, la suspension de la cité pendant les services et THE PIT, puis la relecture du journal après rechargement. Les recettes mobiles et de refus d’écriture passent dans les fixtures des composants. Ces contrôles automatisés ne prouvent ni la manette physique, ni les performances d’une longue session. La qualification du dernier cadrage visuel, du build public Next et du portable Windows sera consignée après leur exécution.
