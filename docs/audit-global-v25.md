# Audit global V25 — corrections et état de production

Date : 5 septembre 2026. Base : 94e93a8. Périmètre : jeu réellement présent, niveaux, props, cohérence, narration, rejouabilité, contrôles, persistance et livraison Windows. Les conversations ChatGPT accessibles restent partielles ; leurs pièces jointes absentes et réponses tronquées empêchent d’affirmer que tous les postulats ont été récupérés.

## Verdict

Le jeu progresse vers une livraison PC autonome, mais il n’est pas un produit commercial terminé. Les défauts reproduits de ce lot sont corrigés dans le moteur et les interfaces utilisés par le joueur. Les budgets de ressources, portraits de présentation et ateliers techniques ne sont pas comptés comme des niveaux ou animations livrés. Aucune durée de campagne en heures n’est annoncée sans parties chronométrées.

Le choix d’un rendu React/Canvas ne tranche pas, à lui seul, la qualité d’un jeu vidéo. Les critères retenus ici sont le parcours jouable, la lisibilité, les conséquences des actions, la fiabilité des sauvegardes, l’autonomie hors ligne, la finition et les tests sur les plateformes visées.

## Résultats par domaine

| Domaine | Correction ou contrôle V25 | Reste à produire ou mesurer |
| --- | --- | --- |
| Props et modularité | Raccords des coursives/puits répétés à taille nominale ; bordures transparentes V19 retirées uniquement du rectangle de dessin, pas des masters ; états de chute distincts. Voir l’audit spécialisé. | Mannequin autonome, supports dédiés de trophées et console de sas ; inspection artistique en situation de chaque famille. |
| Assets | 464 paires V19 contrôlées techniquement ; modules V21/V22 contrôlés, atlas et registres validés. | 336/800 paires V19 manquantes ; conformité technique différente d’une fidélité visuelle 1:1. |
| Level design | Six passages sous portes condamnés physiquement ; paliers marais/océan alignés sur l’impulsion requise ; retours possibles avant la capacité du raccourci futur. | Huit mondes conservent un axe principal de 8 400 px ; six branches partagent encore une structure proche. Les situations de combat, poursuites et objectifs principaux demandent plus de diversité. |
| Lisibilité des niveaux | Modules, commandes et pickups des six régions désormais dessinés ; carte et indices suivent les capacités, portes, dangers et acquisitions réels. | Illustrations exactes des six objets : deux supports V3 existants sont réutilisés, pas six nouveaux objets artistiques finalisés. |
| Lore | Cercle de basalte situé dans une annexe de Cinder ; Terrasse de verre replacée sur Serekh-9. Circuit présenté comme reconstitution réunissant plusieurs époques. | Campagne personnelle du chasseur, Bad Blood originaux et voies de Cinder. Les légendes jouables ne doivent pas être présentées comme ce récit déjà réalisé. |
| Narration | Promesses de choix/enquête retirées des objectifs linéaires qui ne les proposent pas. | Scènes, conversations de clan, conséquences de rang et de prises, enquête et embranchements jouables. |
| Durée de vie | Carte proposant le prochain sceau ou objectif secondaire réellement manquant depuis la sauvegarde ; préparation directe de revisite. Les gains restent bornés et acquis idempotents. | Playtests chronométrés, qualité des revisites et objectifs différents dans les cinq extensions. Aucun nombre de combinaisons n’est converti en heures de contenu inédit. |
| Campagne | Huit contrats, Apex, trophée, extraction et progression persistante ; acquisition/retour des régions couverts par les tests. | Huit parties intégrales avec combat et extraction n’ont pas été rejouées dans ce lot. Les tests de topologie isolent le déplacement des ennemis. |
| Combat campagne | Régressions de mêlée, projectiles, dégâts, interruption, contrôle et reprise incluses dans la suite globale. | Affinage manette en main, possibilités de traversal/combat avancées, profondeur des ennemis et attaques des Apex. Un test unitaire ne mesure pas le plaisir du combat. |
| THE PIT | Roster, règles, modes, Circuit, Descente, replays et sidecars conservés ; visite de sélection/Circuit vérifiée. | Silhouettes de match temporaires, prises synchronisées et finishers finaux, entraînement guidé et avance réelle d’un tick. L’atelier V24 reste distinct des matchs. |
| Anatomie et fidélité | Aucune nouvelle image produite ni retouche générative par script dans ce lot. Défauts connus des mains/masques/rigs maintenus comme réserves ; aucune validation 1:1 inventée. | Générer et contrôler chaque nouvelle pièce avec l’outil intégré : mains, nombre de doigts, prise, jointures, attaches, intersections, orientation et état de l’arme. |
| Honneur et IA | Règles et régressions existantes conservées ; aucune règle universelle de canon inventée. | Préavis contextuels, modèles de proie indigne/désarmée/blessée, réactions plus riches et comportements tactiques propres à chaque boss. |
| Interface et accessibilité | Deux défauts mobiles de la carte corrigés : scanner masquant le contrat et commandes parentes recouvrant son en-tête. Réglages et contrat accessibles à 390 et 1280 px. | Confort à 720p, lisibilité en action, clavier/manette de bout en bout et profils de joueurs à tester physiquement. |
| Sauvegardes | Schémas et identifiants existants conservés ; protection contre corruption, conflit, quota et duplication couverte par les régressions. Profil PC distinct du navigateur. | Export de campagne seulement dans l’interface actuelle : chasse active, vaisseau et PIT ne sont pas transférés par ce JSON. Pas de cloud ni de transaction multiclés. |
| Livraison Windows | Point d’entrée client dédié, ressources embarquées, protocole local restreint, renderer isolé et sandboxé, réseau distant bloqué, menu/F11, fermeture confirmée et profil stable. | Version portable non signée, pas d’installateur ni mise à jour signée. Steam/Deck, consoles et machines cibles non certifiés. |
| Audio | Moteur audio procédural et chargement local conservés. | Écoute casque/enceintes, mix, fatigue, transitions et alertes en combat à évaluer. |
| Performances et endurance | Build de production et assets de jeu disponibles ; aucun service distant requis par l’entrée PC. | Budgets CPU/GPU/mémoire, frametimes, latence et sessions longues sur matériel cible. Les mesures d’un navigateur caché ne constituent pas ces résultats. |
| Sécurité dépendances | Correctifs compatibles Browserslist, fast-uri et fflate appliqués ; exécutable sans node_modules ni serveur Next. | Deux alertes élevées image-size/Vinext restent dans l’outillage ; migration majeure non assimilée à un correctif prouvé. |
| Production/support | Scripts de build et recette PC, rapports spécialisés, preuves et limites consignés ; métadonnée de site ne dit plus que le jeu est déjà complet. | Localisation, support, rapport de panne enrichi, sauvegarde externe complète, signature et matrice de compatibilité. |
| Statut du projet | Mention de projet de fan non commercial conservée. | Aucune autorisation de commercialiser la franchise n’a été fournie. Cet audit ne vaut pas autorisation de vente. |

## Livraison PC et sécurité

Construction : `npm run package:windows`. Recette : `npm run qa:desktop`. Le dossier généré se trouve sous `tmp/desktop-release/`. Extraire l’ensemble du dossier et lancer `Yautja-La-Longue-Chasse.exe` ; il ne charge pas l’URL Vercel. Les fichiers du jeu et le runtime Electron sont inclus. Les licences du runtime restent avec le programme.

Le profil stable est `%APPDATA%\\YautjaLaLongueChasse`, indépendant de la version et du navigateur. F11 bascule le plein écran ; Alt révèle le menu PC. Utiliser « Suspendre et sauvegarder » avant de quitter une chasse et résoudre toute alerte d’écriture. Une mise à jour manuelle du dossier de programme doit conserver le profil.

Les contrôles natifs sont limités au processus principal : aucun preload, IPC ou accès Node exposé au contenu. Le protocole ne sert que les routes du jeu, les bundles et les assets embarqués. Les accès aux environnements/sources privées, chemins traversants, domaines tiers, webviews et fenêtres externes sont refusés. La fermeture propose de continuer ; les écritures Chromium sont vidées avant sortie confirmée.

Références primaires de mise en œuvre : [sécurité Electron](https://www.electronjs.org/docs/latest/tutorial/security), [sessions persistantes et téléchargements](https://www.electronjs.org/docs/latest/api/session), [particularités des modules ESM](https://www.electronjs.org/docs/latest/tutorial/esm). La lecture interne des ressources utilise le système de fichiers du processus principal, sans contourner le blocage réseau du renderer.

## Preuves et critères de sortie

La première validation globale V25 a réussi : lint, TypeScript, audit 464 paires, build Vinext et 851/851 tests, sans test ignoré. Les dernières corrections découvertes en QA exigent un nouveau passage avant publication. La recette PC, les empreintes et le déploiement final sont renseignés dans la section de clôture après exécution ; le seul fait de produire un EXE n’est pas un test de démarrage.

Rapports détaillés : [props](audit-props-v25.md), [niveaux](audit-level-design-v25.md), [lore et longévité](audit-lore-longevity-v25.md). Les anciens audits restent des instantanés datés, pas des preuves fraîches de cette version.

## Priorités restantes

1. Finir une tranche artistique cohérente réellement jouable : mains, masques, équipement et animations des chasseurs, puis objets du hub et récompenses régionales. Production uniquement par le générateur OpenAI intégré demandé, sans API séparée.
2. Différencier les situations des extensions et approfondir les Apex ; mesurer la lecture, le rythme et l’intérêt des retours avec de vraies parties.
3. Produire l’arc personnel de Cinder et ses choix, puis la vie du clan. Une correction de texte ne livre pas cette narration.
4. Terminer le combat visuel THE PIT et ses gestes manquants ; ne pas compter les milliers d’actions budgétées comme des animations produites.
5. Qualifier le produit PC : durée de vie mesurée, endurance, audio, manettes, matériel minimum, export complet du profil, distribution et droits avant toute promesse commerciale.

## Clôture vérifiée du lot

- `npm run qa:release` sur les sources finales : lint, TypeScript, 464 paires V19, build Vinext et **852/852 tests réussis**, aucun test ignoré. Preuve : `tmp/qa-release-v25-final.log`.
- QA interactive web : marche dans le hub, montée de puits et sortie forge ; vraie escalade d’une liane V19 ; carte → contrat → briefing ; Circuit et réglages à 390 et 1280 px, sans erreur JavaScript. La réception sur une plateforme et huit campagnes complètes ne sont pas certifiées.
- Défaut supplémentaire de décor corrigé pendant cette QA : une dalle étroite dessinée sur 998 unités de haut est maintenant répétée en modules proportionnés de 96 unités. Le bitmap et sa collision de 24 unités sont conservés.
- `npm run package:windows` : EXE Windows x64 et runtime local réellement construits, avec jeu et ateliers embarqués. Le bootstrap ESM et la lecture locale ont été corrigés avant validation. La jonction de dépendances utilise un vrai dossier terminal `node_modules` pour éviter deux copies de React.
- `npm run qa:desktop` sur cet EXE : démarrage ; vérification sandbox/isolation et absence de Node dans le renderer ; réseau bloqué ; lecture d’un WebP embarqué ; fichiers privés refusés ; réglage sauvegardé et export JSON natif ; hub → arène d’entraînement ; galaxie → Oseris → briefing → déploiement → suspension ; sauvegarde, réglage et chasse suspendue toujours disponibles après fermeture et redémarrage du processus. **Aucune erreur JavaScript, aucune requête locale en échec.** Preuve : `tmp/desktop-qa/verification.json`.
- Le test PC emploie un profil distinct et une fenêtre cachée avec simulation non ralentie pour l’automatisation. Il valide ces parcours, pas les performances, la manette physique ou la certification d’un matériel.
- Archive `app.asar` : 1 996 entrées, seulement `main.mjs`, `protocol.mjs`, `package.json` et `renderer` à sa racine ; aucune source d’art, environnement, configuration privée ou dépendance Node embarquée. Empreinte SHA256 : `2aefbcd6c5ef05ceda1b334cae87d1a274727358351b0371da5f53631e80f895`.
- Audit npm final : deux alertes élevées, `image-size` et `vinext` dans l’outillage. `npm audit --omit=dev` : zéro alerte. Ces résultats ne constituent pas une certification de sécurité du produit.

La version reste non signée et non commerciale. Les 336 paires V19 manquantes, les illustrations finales des personnages/objets, l’arc personnel de Cinder, la diversité des extensions et les tests matériels demeurent ouverts. Aucune génération d’image par API n’a été utilisée ; aucune limite supposée du forfait n’a servi à changer de fournisseur.

ZIP PC final : `tmp/desktop-release/Yautja-La-Longue-Chasse-PC-V25.zip`, 425 771 120 octets (environ 406 Mio), 74 entrées. Son app.asar décompressé correspond exactement à celui testé. SHA256 ZIP : `17b9724672b308eef869efd19d934dbd1f659e56de5c15e5c3a420d1316bfa16`.
