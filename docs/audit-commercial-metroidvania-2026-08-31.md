# Audit professionnel du jeu — 31 août 2026

## Verdict

**Le jeu n’est pas prêt à être présenté comme un metroidvania commercial terminé.** Il possède une campagne de huit chasses, un hub jouable modulaire, des systèmes de combat, d’arsenal, de trophées et de progression réels. Le travail de ce lot fiabilise ces systèmes et ajoute des fonctions utiles au joueur. Il ne remplace pas une refonte de la topologie, une production artistique terminée et des playtests sur les plateformes visées.

Le périmètre couvre le jeu et sa production : déplacement, combat, exploration, progression, contenu, sauvegardes, ergonomie, accessibilité, audio, performances, distribution et statut du projet. Un HTTP 200 ou une compilation ne valide pas la qualité d’un jeu. Les conclusions ci-dessous séparent code inspecté, tests exécutés et appréciations qui exigent encore une partie réelle.

Référence de départ : commit `f066f074fef84846b2a9544d1b28d550562c965a`, lot volcan publié précédemment. Rapports spécialisés : [monde et progression](audit-commercial-world-2026-08-31.md), [combat, contrôles et reprise](audit-commercial-combat-2026-08-31.md), [persistance](audit-commercial-save-2026-08-31.md). Le document [continuité de campagne](campaign-continuity-audit-2026-08-31.md) reste pertinent pour les différences entre intentions de boss et comportement simulé.

## État des domaines de production

P1 indique un défaut important ou un chantier nécessaire avant de promettre le produit concerné. P2 indique du polish, de la profondeur ou une validation spécialisée. Une fonctionnalité facultative n’est pas rendue obligatoire par sa présence dans ce tableau.

| Domaine | État observé / correction de ce lot | Restant et niveau de preuve |
| --- | --- | --- |
| Identité du jeu — P1 | Action et chasse latérale, préparation dans le hub, huit biomes et extraction. | La structure actuelle ne démontre pas les boucles d’acquisition et de retour d’un metroidvania. Ne pas vendre cette promesse sur le seul nombre de salles ou textures. |
| Level design — P1 | 48 secteurs, plateformes, grimpes, couvertures et dangers authored. Validateurs renforcés : valeurs finies, spawns, extractions, liens et waypoints physiques. | Huit chaînes horizontales de 8 400 px ; pas de graphe persistant de régions, raccourcis et portes à capacités. Les exigences des routes restent principalement des données de catalogue. |
| Géométrie — P1 | Collisions de terrain existantes conservées ; collisions de projectiles désormais continues. | Le sol global continu et les plateformes descendantes ne suffisent pas à des salles fermées avec murs/plafonds. Pas de preuve de franchissabilité générale. |
| Hub et modularité — P2 | V21/V22, salles, couloirs et portes, props sur plusieurs plans, trophées séparés : le hub n’est plus le rectangle initial. | Vérifier transitions, échelle, lisibilité des collisions et masquage du joueur lors d’un parcours réel de chaque salle ; ne pas confondre présence des textures et qualité du niveau. |
| Orientation — corrigé en partie | Nouvelle carte en pause : vrais secteurs, position, découverte, noms inconnus masqués ; historique dans la reprise et conservé au retry. | Pas encore d’atlas permanent de campagne, marqueurs personnels ou suivi de secrets inter-régions. |
| Capacités et secrets — P1 | Scanner, grimpe, camouflage, armes et améliorations existent. | Pas de capacité permanente gagnée puis utilisée comme clé physique de nouvelles zones ; pas de contrat complet de secret unique, porte persistante et raccourci. |
| Déplacement — P2 | Simulation à pas fixe, grimpes, bonds et réception sur plateformes. | Tolérance après bordure, saut mémorisé avant réception et hauteur variable absents. Sensation de contrôle et latence à évaluer manette en main. |
| Combat — corrigé en partie | Les tirs ne traversent plus une couverture fine entre deux pas ; impacts résolus dans l’ordre spatial, pas l’ordre des tableaux. | Mêlée à portée immédiate ; revoir fenêtres d’animation, retour d’impact, interruption et lecture des silhouettes. Correction des tirs à reprendre dans les playtests d’équilibrage. |
| IA et boss — P2 | Perception, enquête, recherche, alerte partagée, comportements de boss et contre-mesures du Gardien ont des tests. | Certaines intentions de boss restent simplifiées : hydre sans têtes indépendantes, Sandmaw sans perception matérielle du bruit, Hivemind sans apprentissage distribué. Le code fonctionnel ne mesure pas leur intérêt ludique. |
| Objectifs et rythme — P1/P2 | Huit missions, Apex, extraction, débrief et fin ouvrant Elder. | Les cinq missions d’extension partagent beaucoup la structure scan / éliminations / prises / boss. Diversifier les situations vécues, pas seulement les noms et statistiques. |
| Économie et longévité — P2 | Honneur, améliorations, rites, trophées et cinq sceaux de maîtrise par mission. | Mesurer accès aux achats, répétition imposée, difficulté et intérêt des relances. Les 116 minutes de pars ne sont pas une durée de campagne jouée. NG+ et boss rush restent des choix de production. |
| Mesure de maîtrise — P2 | Résultats et sceaux persistent. | La méthode de certaines prises est déduite du contexte dans `progression.ts`, sans preuve du coup final ; cette donnée doit devenir réelle ou inconnue avant de servir d’indicateur fiable de maîtrise. |
| Campagne sauvegardée — corrigé | Versions futures/corruption protégées ; backup de récupération ; détection de conflit observable entre sessions ; import validé et export JSON. | Stockage local sans transaction atomique multiclés, cloud ni résistance à l’effacement du site. Export externe nécessaire pour une sauvegarde hors appareil. |
| Chasse suspendue — corrigé | Validation physique du snapshot, protection contre ancien run, conservation de la reprise tant que les récompenses ne sont pas enregistrées. | Tester fermeture forcée et plusieurs onglets dans un navigateur réel. Les vérifications synchrones ne forment pas un verrou distribué. |
| Données du vaisseau — corrigé | Sidecar V3 lié à la campagne ; migration conservatrice ; reset explicite avec statut. | Les anciens sidecars sans identité et imports conservant le même propriétaire gardent une ambiguïté si toute écriture est refusée. Export campagne et export complet de tous les sidecars restent distincts. |
| Clavier, souris, manette — corrigé en partie | Manette sur slot connecté, pause à déconnexion/focus perdu, retour au neutre, menus et dialogues pause/mort navigables ; réglages accessibles à gauche/droite. | Mapping manette fixe, pas de profils par appareil, réglage des zones mortes, visée libre au stick droit ou validation physique de bout en bout. Le sélecteur de fichier système peut nécessiter une action clavier/souris. |
| Accessibilité — P1 validation / P2 options | Focus et arrière-plan inerte, contrastes, réduction de secousses/violence, mix séparé ; carte aussi disponible sous forme textuelle. | Auditer taille réelle du texte à 720p, symboles non fondés seulement sur la couleur, alertes sonores doublées visuellement, remappage complet et besoins des joueurs. Aucun label d’accessibilité revendiqué. |
| Décors et art — partiel | 464 paires V19 réellement présentes, inspectées, uniques et correctement référencées ; masters exclus du déploiement. | 336 références sur les 800 prévues manquent encore. Ce budget ne prouve ni 336 blocages runtime ni une direction artistique terminée. Vérifier répétition, silhouettes, plans, lumière et collisions en mouvement. |
| Audio — corrigé en partie | Annulation des chargements d’ambiance obsolètes et arrêt fiables ; ambiances et effets procéduraux. | Écoute de confort, hiérarchie des alertes, transitions, fatigue, clipping et test casque/haut-parleurs non réalisés. Le caractère procédural n’est pas à lui seul un défaut. |
| Performance — P1 validation | Delta borné et simulation fixe ; code des menus évite les lectures DOM sans action. | Aucun relevé CPU/GPU/FPS, latence ou mémoire sur matériel cible ; fixer des budgets mesurés et tester les scènes chargées, rechargements et sessions longues. |
| Livraison PC/console — P1 | Publication web Vercel existante ; builds Vinext local et Next distincts. | Pas d’installateur natif, mise à jour signée, parcours hors ligne garanti, intégration plateforme/cloud/achievements ou certification console/Steam Deck vérifiés. Un emballage desktop seul ne remplirait pas ces critères. |
| Localisation et support — P2 | Interface française et contenus documentés. | Organiser extraction des chaînes, expansion du texte, formats de nombres, rapport de panne, version affichée et matrice de compatibilité avant d’élargir la diffusion. |
| Droits et statut — préalable | README et crédits identifient un projet de fan non commercial inspiré de Predator, sans affiliation revendiquée. | Aucune autorisation commerciale de franchise n’a été démontrée ici. Clarifier droits de diffusion, provenance, licences et usages envisagés avant de vendre ; cet audit technique ne donne pas d’autorisation juridique. |

## Corrections supplémentaires de fiabilité

- Le débrief reste affiché si le lancement d’une nouvelle chasse échoue à enregistrer sa campagne ; sa protection contre les récompenses dupliquées reste active.
- Les récompenses sont enregistrées avant suppression de la reprise ; en cas de quota, le résultat reste exportable en mémoire et la reprise sur disque est conservée.
- Reset et import exigent confirmation dans l’interface. Leur message distingue campagne enregistrée et nettoyage annexe non confirmé.
- Le backup n’est plus supprimé avant confirmation du nouveau primaire : un reset interrompu ne détruit pas la seule copie récupérable.
- La reprise reçoit une identité de session neuve afin qu’un ancien onglet ne puisse pas la modifier ou la supprimer silencieusement.
- Une écriture de chasse confirmée tardivement est reconnue par son payload exact. Si la lecture des archives reste refusée, le résultat et le contexte restent en mémoire avec un bouton de vérification ; aucune récompense n’est écrite avant contrôle de propriété. Le bouton de réessai après un échec de quota revérifie également cette propriété : une nouvelle reprise ne peut pas être invalidée par un ancien résultat différé. Il faut garder cet écran ouvert.
- Direction et validation simultanées à la manette activent le bouton nouvellement sélectionné ; A maintenu ne déclenche pas une cascade d’actions.
- Le refus de plein écran est intercepté avec un message au joueur.
- `npm test` exécute maintenant toutes les suites après build, au lieu du seul contrôle HTML. `qa:release` vérifie le pack réellement disponible ; l’audit `qa` de complétude des 800 références n’est pas affaibli.

## Dépendances et surface de distribution

L’audit npm initial remontait six alertes (trois élevées, trois modérées). L’override `undici: 7.29.0` corrige le groupe Undici / Miniflare / Wrangler : l’audit suivant remonte **deux alertes élevées**, `image-size` et son parent `vinext`, correspondant au lecteur d’images de l’outillage local.

Aucun correctif amont de `image-size@2.0.2` n’est confirmé à cette date. La suggestion automatique de migration majeure Vinext n’est pas appliquée aveuglément : la release beta.6 mentionne l’intégration de cette bibliothèque dans le bundle, ce qui ne démontre pas que ses parseurs sont réparés. Ne pas conclure à une correction sur la seule disparition du nom dans l’arbre npm. Ne traiter que des assets maîtrisés dans cet outil jusqu’à correction vérifiée. La production Vercel compile avec Next, mais cette différence ne justifie pas de masquer les alertes du dépôt. `npm audit --omit=dev` remonte zéro alerte ; cela décrit les dépendances classées production, pas une preuve de sécurité exhaustive.

Références : [avis officiel Undici](https://github.com/nodejs/undici/security/advisories/GHSA-4cwx-7wf7-3272), [avis image-size ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr), [releases Vinext](https://github.com/cloudflare/vinext/releases). Les JSON avant/après sont conservés dans `outputs/qa-commercial-audit/`.

## Références de conception et critères matériels

Le retour dans une zone après acquisition d’une capacité et la lecture de la carte sont des références de conception explicites de [Metroid Dread, rapport Nintendo n°9](https://www.nintendo.com/en-gb/News/2021/September/Metroid-Dread-Report-Vol-9-Handy-tips-for-newcomers-2047809.html). Application au projet : une région doit donner une raison jouable de revenir, pas seulement un autre trajet indiqué sur une fiche.

Les [recommandations Xbox sur les entrées](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107) traitent aussi les contraintes de durée, complexité et effort des commandes. Le [processus de compatibilité Steam](https://partner.steamgames.com/doc/steamhardware/compat?l=english) demande notamment une expérience réellement utilisable avec les contrôles et l’affichage ciblés. Les correctifs de cette version constituent des améliorations ; ils ne valent ni certification ni test matériel.

## Ordre de production recommandé

1. **Région pilote metroidvania** : bifurcation visible, capacité gagnée, retour, vraie porte, récompense unique persistante, raccourci puis Apex et extraction. Résoudre murs/plafonds, géométrie verticale et connexions avant de multiplier les salles.
2. **Contrat de progression** : capacités, portes, secrets et carte permanente migrables ; tests de tous les chemins pour éviter verrou circulaire, récompense dupliquée ou branche sans retour.
3. **Qualité de jeu** : précision des sauts, fenêtres de combat, boss différenciés et rencontres facultatives ; playtests de rythme et d’économie, puis ajustement à partir d’observations.
4. **Production artistique ciblée** : compléter les manques utiles au parcours pilote, puis les autres biomes ; contrôler chaque pièce dans le jeu et ses plans, au-delà de l’audit de fichiers.
5. **Sortie sur plateformes choisies** : parcours complet sans souris si visé, sauvegarde/export/réinstallation, mode hors ligne attendu, qualité audio, performance et endurance sur matériel réel ; distribution et droits clarifiés avant vente.

Critères du parcours pilote : pas de farming obligatoire, branche facultative réellement facultative, porte et récompense conservées après mort/suspension/rechargement, retour possible depuis toute branche, pas de capacité enfermée derrière son propre verrou. Une carte de catalogue ne constitue pas ce niveau.

## Validation de cette livraison

Résultats exécutés sur le code final avant publication :

| Contrôle | Résultat |
| --- | --- |
| `npm run qa:release` | Réussi : lint, TypeScript, audit des assets disponibles, build Vinext et **502/502 tests** ; aucun test ignoré. |
| `npx next build` | Réussi, y compris son contrôle TypeScript ; routes `/` et `/rig-lab` produites. |
| V19 disponible | **464/464 paires inspectées**, empreintes uniques, 41 668 712 octets runtime ; 336 références prévues absentes, sans prétendre valider le catalogue complet. |
| Hub | Audits V21 et V22 réussis : sept modules de chaque version ; audit des 54 entrées de vaisseaux réussi. |
| HTTP local Next | **55 contrôles réussis** : pages, 14 scripts initiaux, présence du nouveau code d’export, types MIME, empreintes de textures identiques et chemins privés en 404. |
| Upload Vercel simulé | **1 894 fichiers réguliers**, aucun fichier privé interdit ; sources d’art, outils, tests, rapports et environnements exclus. |
| Dépendances npm | Deux alertes élevées dans l’outillage local ; zéro alerte avec `--omit=dev`. La limite est détaillée plus haut. |
| Jeu interactif / matériel | Non exécuté dans cette session : voir la limite ci-dessous. |

Preuves reproductibles : `outputs/qa-commercial-audit/qa-release-final.log`, `build-next-final.log`, `available-assets.json`, `ship-audits.exit.json`, `local-http.json`, `deployment-files.json` et `npm-audit-after.json`. Le compte rendu de livraison indique le commit et le déploiement effectivement publiés ; les logs et résultats HTTP publics sont conservés dans le même dossier. Les captures et logs temporaires restent hors des sources déployées.

Limite de cette session : le contrôleur de navigateur intégré échoue au démarrage sur les ACL Windows, avant de se connecter au jeu. Les tests de fonctions réelles, rendus HTML statiques, builds et contrôles HTTP sont disponibles ; une partie interactive, les résolutions 1280×720 / 1920×1080, la manette physique, le FPS et une campagne complète ne sont pas déclarés validés.


## Suite publiée — région pilote 01

La livraison suivante implémente la première branche physique de capacité / retour / sceau / secret / raccourci et le schéma de progression 5. Voir [le détail du pilote](metroidvania-pilot-01-2026-08-31.md). Les constats et preuves ci-dessus décrivent l’audit initial ; cette amélioration traite une région facultative de la jungle, pas la refonte de toute la campagne ni une certification commerciale.


## Continuation — boucle minière et saut

Le [lot Exploration 02](ice-traversal-02-2026-08-31.md) ajoute une branche facultative dans la glace, une capacité acquise en jungle réutilisée ailleurs, un pont, une cache unique, une trappe et une échelle de retour. Le contrôleur reçoit une tolérance après bord, une mémorisation avant réception et une hauteur variable. La sauvegarde passe au schéma 6 avec filtrage par région. Les limites de validation matérielle, de distribution native et de complétude artistique de cet audit restent ouvertes.
