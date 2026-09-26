# V53 — Petite Fosse, pas chassés et parcours THE PIT

## Prologue : une Fosse de jeunesse jouable

Après la patrouille V52, le départ vers la petite Fosse est volontaire. Le joueur entre physiquement, assiste à la présentation et au compte à rebours, dispute un duel non létal, peut perdre et réessayer, puis récupère un insigne cosmétique et rejoint la cité. Quatre preuves séparées portent le chapitre à vingt preuves. La sauvegarde conserve la phase, les combattants, les tentatives et l'état de la récompense. Aucun rang adulte, rite, vaisseau, honneur ou monnaie n'est accordé.

La petite cage, ses murs et son toit grillagés viennent du postulat utilisateur archivé localement. Le décor, l'adversaire, les règles, les textes et l'insigne sont des adaptations originales explicites du projet. Le fond, la structure et le sol sont trois PNG indépendants ; le novice possède seize poses natives réparties sur deux PNG et l'insigne son propre fichier. Ces poses ne sont pas seize cycles complets. Voir `v53-youth-delivery.md` et `art/v53/youth-cage-provenance.json`.

## THE PIT : continuité des poses et progression au sol

City Hunter et Scar, dans les deux apparences masquées exactes fournies, reçoivent un pas chassé avant : garde écartée puis pied arrière rassemblé. Les deux directions sont dessinées indépendamment. Ce mouvement court n'est ni une marche naturelle complète, ni une animation de recul. Les premières planches présentant une silhouette coupée ou une alternance incohérente ont été refusées ; quatre candidats restent dans `art-source/v53`, sans chargement dans le jeu.

Deux PNG acceptés apportent quatre clips et huit dessins distincts. Le registre PIT atteint 337 clips, 120 pages logiques, 100 PNG et 677 dessins distincts ; il ne s'agit pas de movesets complets. Les seize poses du novice de campagne appartiennent à un autre moteur et ne gonflent pas ce compteur PIT.

À l'arrêt, en l'absence d'un idle dédié, le dernier dessin de l'introduction exacte peut être tenu. La garde, les attaques, les blessures, le recul, les sauts et les transitions de camouflage ne sont pas remplacés par cette pose. Le raccord ne change ni la simulation ni les replays et ne compte pas comme un nouveau cycle.

Prompts exacts des générations avec l'outil OpenAI intégré, références et rejets : `v53-openai-prompts.json`. Les PNG retenus restent identiques aux sources ; le découpage est décrit par des rectangles et des pivots, sans retoucher les pixels.

## Huit passages supplémentaires

Les treize parcours optionnels réutilisent les kits existants. Le lot V53 ajoute Forge → Fonderie, Ravin → Nid, Caverne → Réacteur, Crypte → Nécropole, Galerie des Serments → Atrium, Balise → Dorsale, Cour des Navigateurs → Salle des Routes et Porte de l'Audience → Trône. Les liens sont des rapprochements thématiques originaux, pas une géographie canonique certifiée. Deux lieux sont préchargés, un décor manquant bloque le lancement et une projection réussie près du bord transfère les deux combattants. Les noms et la liste complète figurent dans `pit-stage-journeys-v53.md`.

Les anciens identifiants et formats de replay restent compatibles ; une exhibition ne rapporte rien à la campagne. Aucun nouveau dessin d'arène, danger ou prop destructible n'est revendiqué par ces passages.

La recette visuelle a également corrigé un second compteur de parcours resté à cinq. Le menu de nouvelle partie décrit maintenant la Fosse disponible. Les vieux checkpoints qui ouvrent directement le briefing de Vey expliquent leur trajet historique et comment commencer le prologue dans un emplacement libre, sans prétendre que la nurserie manque encore ni écraser leur sauvegarde.

## Qualification

La compilation web finale, le contrôle TypeScript, les 1 695 tests automatisés et les 59 contrôles navigateur locaux passent. ESLint ne signale aucune erreur ; son avertissement historique sur l'image de `ClanChroniclePanel.tsx` demeure. Huit PNG servis ont été comparés octet par octet aux fichiers acceptés. Le build du renderer desktop passe également, sans constituer un test d'exécutable Windows. Détails et limites : `v53-validation.json`.

La V53 a également passé 59 contrôles distincts sur l'adresse publique : 8 menus/sauvegardes, 6 Fosse, 8 tactile, 18 animations, 16 parcours et 3 chargement/reprise de décor. Les huit PNG publics ont été comparés aux fichiers locaux. Le commit applicatif qualifié est `8a3c8aad2c3d12f0536855dacd76c6c14d1e73f9`. Le suivi de recette/documentation n'en change pas le runtime ; le déploiement final, les identités Git vérifiées et les rapports figurent dans `outputs/qa-commercial-audit/v53/publication-verified.json`.

Le premier test tactile demandait parfois un saut pendant la réaction à un coup. Les événements natifs ont confirmé que l'appui était reçu et correctement refusé pendant cet état. La recette attend maintenant un retour observable au repos, au sol et sans touche maintenue, avant le même appui de 100 ms. Deux passes publiques corrigées de huit contrôles ont réussi ; elles ne sont comptées qu'une fois dans les 59. Les échecs, traces et captures sont conservés dans `outputs/qa-commercial-audit/v53/youth/public-cage-touch-layout-browser-qa`. Les règles du jeu n'ont pas été changées pour faire passer le test.

L'archive Windows V52 précédemment livrée reste conservée, avec son exécutable et ses preuves. Cette livraison V53 web ne remplace pas implicitement ce ZIP. Le renderer intermédiaire V52 régénérable a été retiré pour libérer C:, après nouvelle vérification SHA-256 de l'archive conservée.

## Travaux encore ouverts

La majorité des apparences n'a pas de moveset complet ; les 401 variantes fournies encore statiques ne sont pas clôturées. Restent notamment les attaques/reculs et raccords dédiés des nouveaux chasseurs, 67 départs sans parcours dans les arènes 1–80, les props et dangers interactifs, les lots de jeux manquants, les rites suivants et la campagne adulte Homeworld, les véhicules pilotables et l'audio. Les arènes 81–100 restent des duels purs. Aucune nouvelle conversation privée non récupérée n'est supposée connue, aucun contenu commercial complet ni matériel physique certifié n'est annoncé.
