# V104 — Le relevé du cartographe

Un cartographe dédié reçoit au pupitre déjà présent dans la cour du registre du port. Après son choix et sa réponse, le joueur rejoint réellement le bac de basalte, puis la lampe de la cour, et revient à pied présenter son relevé. La carte fonctionnelle représente ces deux repères et les segments échantillonnés pendant la marche. Les zones inconnues restent absentes.

## Source exacte et adaptation locale

La scène est `D6-W-PNJ-ROLE-12` : `Scènes de dialogue V6!A392:Q392`, `Répliques V6!A3255:K3262`, `Choix et actions V6!A806:H807`. Le sous-ensemble `app/game/data/bibleCartographySceneV104.json` reprend les cellules sans réécriture. Son corpus V85 garde le SHA-256 `e36efdc3d5ac8fddb74dd683458b72873203446204e768b02aa13e4db17eed30` et l’original V6 référencé reste `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.

L’option B propose : « Je trace d’abord une route prudente entre les points connus. » Le cartographe répond : « Parcours-la. Je garderai le reste du secteur sans certitude. » La réussite source s’affiche seulement après les deux approches puis le retour effectif au pupitre. L’ouverture évoquant une crête et l’option A du point haut restent hors de ce parcours.

Le poste est une adaptation originale du projet. L’hôte réutilise le corps modulaire natif neutre `classic`, tête `reference`, peau `ochre-mottle`. Il ne remplace aucun résident ni personnage nommé. Son corps demeure une composition de bitmaps existants ; aucun nouveau cycle natif, accessoire cartographique peint ou doublage n’est produit par ce lot. Le relevé est une interface fonctionnelle locale, sans carte canonique revendiquée.

| Élément existant | Identifiant | Position |
| --- | --- | --- |
| Pupitre de lecture | `urban-v81:port-4:register` | 5890, 5080 |
| Hôte dédié | `bible-v104:port-cartographer` | 5860, 5160 |
| Départ et retour | `port-known-lectern-v104` | 5920, 5190 |
| Bac de basalte | `street-v92:port-registers:basalt-planter-left` | approche 6120, 5020 |
| Lampe de la cour | `urban-v81:port-4:light` | approche 6240, 5260 |

Les objets appartiennent au quartier éditorial `port`, à l’étage `0`. Cette cour annexe V81 est extérieure au rectangle de quartier historique : l’accès exige donc la visite déjà enregistrée du port et les objets réellement présents, sans inventer un nouveau territoire. Le sol, l’occultation et les segments du vrai modèle V92 sont contrôlés. Une route clavier praticable passe du bac vers 6120,5260, puis la lampe ; le retour rejoint 5920,5260 puis le poste.

## Marche, sauvegarde et reprise

Le reçu optionnel `homeworld.cartographyV104` conserve son propriétaire, sa version, sa révision, ses sources, ses approches, son état et une trace bornée. Les anciennes sauvegardes restent dépourvues de ce champ. Les données présentes malformées, futures ou étrangères sont refusées avant normalisation et écriture.

Seul l’intégrateur de déplacement fournit les positions avant/après au suivi. Les pas doivent être continus, compatibles avec la durée et la vitesse, sur le même étage, sur le sol praticable et dans cette cour. Un bouton, une coordonnée cible, un transit ou une position importée ne valide pas un repère. Les étapes sont conservées durablement à leur franchissement ; les autres sauvegardes ordinaires de cité emportent le brouillon de marche avec leur position correspondante.

Pause, changement de contexte et interruption du trajet aller **ou retour** conservent le préfixe atteint. La reprise demande de rejoindre à pied le dernier point sûr, avec une tolérance locale de 64 unités. Les écarts non échantillonnés d’une reprise sont séparés par `trailBreaks` : ils n’augmentent pas la distance observée et ne sont pas peints comme un segment continu. La présentation du retour ne peut avoir lieu qu’auprès du cartographe et du pupitre. Un refus d’écriture ne publie ni choix, ni repère, ni réussite ; les entrées restent suspendues jusqu’à une nouvelle tentative d’enregistrement.

À partir de 480 points, le dessin conserve son origine, les approches déjà obtenues et les 200 points les plus récents. Les intervalles retirés deviennent des coupures, sans tracer de raccourci. Le reçu conserve les repères et la distance observée ; cette dernière sature à un milliard d’unités sans arrêter le déplacement. Une longue marche dans la cour ne rend donc pas la demande impossible à terminer. Le test joue plus de trois mille pas avant de rejoindre les repères ; la revue indépendante joue également 5 370 pas, deux compactages puis une présentation réussie.

Ce reçu ne donne aucun objet, marque, rang, trophée, soin, équipement ou accès de campagne. Il ne clôt ni les 730 scènes V6, ni le chantier global de dialogues, ni les autres services de cartographie.

## Vérification

- `tests/homeworld-cartography-v104.test.mjs` : **13 sous-tests réels réussis**, zéro ignoré. Sources exactes, objets et géométrie réels, propriétaire, étapes, trajet intégré, anti-téléportation, reprise après deux repères, longue marche et compactage, transaction refusée, import et composants React.
- `node --test --test-reporter=spec tests/homeworld-cartography-v104.test.mjs tests/homeworld-street-contacts-v100.test.mjs tests/bible-cultural-save-v86.test.mjs` : **30 sous-tests réussis**, dont les 13 précédents, groupes recouvrants.
- Lint strict des fichiers runtime, tests et recette : zéro avertissement.
- `YAUTJA_QA_BASE_URL=http://127.0.0.1:3100 YAUTJA_CARTOGRAPHY_QA_OUTPUT=outputs/qa-v104/homeworld-cartography-production node scripts/qa-homeworld-cartography-v104.mjs` : recette sur le serveur compilé, **18 contrôles réussis et cinq captures réellement ouvertes**, statut **PASS_CIBLE**. Le rapport et les empreintes figurent dans `homeworld-cartography-v104-validation.json`. La recette de développement précédente reste archivée séparément.

La recette utilise une fixture explicite obtenue depuis les parcours modèle de cage et Premières Pistes, puis un checkpoint accepté au poste. Après cette entrée, tous les déplacements utilisent les vraies touches du jeu : refus de quota et nouvelle tentative, choix/réponse source, blocage derrière le dialogue, pause intermédiaire, approche du premier repère, sauvegarde et Continuer, second repère, retour, présentation, affichage mobile et rechargement final. L’horloge navigateur est contrôlée ; aucun setter privé ne déplace l’acteur après l’entrée. Cette preuve ne certifie pas une campagne jouée depuis la nurserie, une manette physique ou tous les matériels.

La recette du 22 octobre 2026 porte sur le build compilé `KfYVJdIUFim-1m9MRRQ6_`, issu du code `a974424b`. Les onze fichiers source suivis sont restés identiques avant et après les 18 contrôles. Les cinq captures de bureau et mobile ont été ouvertes et inspectées : interlocuteur au pupitre, présentation de la demande, retour demandé après les deux repères, relevé terminé et affichage mobile. Aucun succès de déploiement n’est déduit de cette validation locale.
