# Relecture navigateur V79 — 3 octobre 2026

Profil de QA : lecture narrative, clavier et mise en page tactile. Ces contrôles sont effectués par un agent, sans prétendre représenter quatre personnes humaines. Aucun profil utilisateur ni sauvegarde personnelle n'a été utilisé. Aucun fichier app/CSS n'a été modifié par cette passe de QA.

Les 51 captures des quatre lots ci-dessous ont été réellement ouvertes avec `view_image`. Le reçu `work-local/v79/qa/v79-development-visual-review.json` conserve leurs empreintes, l'empreinte de chaque rapport brut et l'heure réelle de fin de relecture/vérification. Les rapports bruts et images historiques restent intacts. Ces preuves concernent le composant isolé ou le vrai GameClient de développement, pas une publication V79.

| Lot | Ce qui est réellement vérifié | Limite |
| --- | --- | --- |
| `chronicles-preview-corrected/report.json` | 11 contrôles, 20 captures : quatre profils/intro/précombat desktop et mobile, scène/portrait natifs, retour, rechargement, confirmation de remplacement, focus/Escape/Tab, panne HTTP réelle du décor puis retry | Serveur 4199 : vrais composants/React/CSS transpilés en mémoire, mais pas Next/Vinext ni CSS généré de production. Mobile utilise un viewport étroit avec scrollbar de bureau ; Theta mobile du vrai GameClient est vérifiée séparément. |
| `chronicles-gameclient-localhost/report.json` | 7 contrôles, 19 captures : titre sans partie → slot1 → ouverture du prologue par UI ; entrée Pit via GameClient ; chronique Greyback ; vrai duel CPU ; pause ; résultat ; sortie explicite ; rechargement ; Theta mobile | Serveur Next dev `localhost:4201`, fixture legacy `defaultSave` dans des contextes QA séparés pour accéder au pont. Aucun prologue gagné ni accès campagne acquis n'est revendiqué. Capture04 du pont exclue comme preuve artistique complète car prise avant peinture des images ; la recette suivante attend leur décodage. |
| `reference-hunters-framework-grid-corrected/report.json` | 5 captures : filtres uniques Super Predator—The Last Hunt et Predator—AVP Classic2000, portraits/roster, sélection de stage, vraie intro et signal de début du combat ; quatre assets HTTP200 et SHA exacts ; saves inchangées | Deux poses fixes natives. Le miroir gauche du second adversaire reste provisoire/déclaré. Pas de KO ni de victoire revendiquée. La case unique étirée de l'ancien lot est corrigée et les nouvelles captures01/02 montrent une case compacte. |
| `homeworld-native-props-framework/report.json` | 7 captures, sept props chargés : alpha, ratio uniforme, position d'appui, profondeur, joueur adjacent, aucun chargement DOM absent, sept assets HTTP200/SHA exacts | Checkpoints d'observation initiaux avant création de chaque page, autorisés pour cette QA ; aucun déplacement d'acteur pendant le jeu. Ne prouve pas la marche depuis le spawn. Lot antérieur au remplacement du chemin beige par le pavage et au correctif d'invite hors pont. Recapture de ces corrections nécessaire sur le serveur final. |

## Duel réellement joué

Greyback affronte Boar dans la salle des trophées. Le runner envoie uniquement des commandes clavier publiques : approche sans attaque, pause/reprise, puis le CPU met réellement Greyback KO lors de deux manches. Aucune vie, phase, horloge ou victoire n'est injectée. Les introductions gauche/droite et le compte à rebours3/2/1 sont observés ; le moteur reste à frame0 et les commandes sont bloquées pendant cette préparation.

La pause immobilise les snapshots du combat. Après le vrai résultat final, l'écran KO reste monté et le checkpoint est déjà enregistré une seule fois. Le bouton `Lire l'issue de l'épreuve` retourne explicitement au récit de défaite ; il reste une reprise. Un rechargement complet du GameClient retrouve ce résultat. Le receipt historique est `pit-b4e8668d-55ff-42e0-812d-332abadf38f6`, rencontre `pit-character-greyback-1`, gagnant `user-boar`. La sauvegarde de campagne reste inchangée. Cela ne constitue pas la complétion des trois duels des quatre chroniques.

La capture12 montre Greyback agenouillé et Boar debout à la fin d'une manche ; la13 montre la fin du duel. Les appuis coïncident avec le plan de sol. Ces images ne certifient pas de nouvelles planches animées complètes. Les chroniques restent des reconstitutions originales clairement signalées « hors canon », avec les biographies et sources séparées du récit.

## Modules de la cité réellement observés

| Prop natif | Observation initiale `(x,y)` | Niveau | Lecture visuelle |
| --- | --- | --- | --- |
| `market-stall-right` | `(3150,3037.57)` | −1A | Étal/toile/stock inclinés vers la droite, joueur devant, pieds visibles ; grande cour arrière encore peu habillée. |
| `forge-workstation-left` | `(3600,4722.28)` | −1A | Atelier/table/outils visibles à l'échelle de la devanture ; ensemble statique, pas une nouvelle forge interactive. |
| `archive-shelf-right` | `(4150,2926.67)` | −1A | Bibliothèque inclinée et joueur chargés ; ancienne façade translucide devant l'ensemble masque partiellement le pied : réserve de profondeur/lisibilité. |
| `terrace-retaining-front` | `(3266.39,4025)` | −1A | Muret/soutènement frontal visible à gauche du joueur ; pas une animation d'escalier ni un étage intérieur ajouté. |
| `clan-common-table-left` | `(4210,4793.01)` | −1A | Table commune/vaisselle et joueur au premier plan ; densification locale, répétition de modules de devanture encore visible. |
| `civic-water-cistern-right` | `(4840,4463.12)` | −1A | Citerne/bassin/stock lisibles avec joueur adjacent ; ancien chemin beige traverse le secteur sur cette capture historique. |
| `port-cargo-sorting-cart` | `(3500,5133.08)` | 0 | Chariot et cargaison ancrés près de l'arche du port, joueur adjacent ; volumes du port visibles, pas un trajet à pied prouvé. |

Les supports déclarés ont une tolérance de mesure ±12px dans l'image source. Les dimensions/collisions/canaux de déplacement ne sont pas déduits du seul alpha. Six modules retenus à cause d'anatomie ou de perspective ne sont pas montés. Les nouveaux modules sont des adaptations originales du jeu ; ce lot ne certifie pas une ville canon1:1 ni des props tous séparés en animations indépendantes.

## Défauts relevés et suites

1. Case du roster étirée avec un seul résultat : corrigée par root, revalidée dans le lot `grid-corrected`, sans modifier les colonnes mobiles.
2. Contraste hover du bouton principal, portrait mobile débordant et cadrage trop petit de Machiko/Theta : corrigés par root ; les nouvelles scènes desktop sont lisibles, Theta du vrai GameClient mobile tient dans l'écran. Les quatre previews mobiles présentent un corps entier dans sa colonne.
3. Invite « Sas de chasse à portée. E/X pour utiliser. » visible dans la cité (captures02–07) : signalée à root. Son diagnostic ultérieur confirme que le pont était démonté mais que le toast global persistait2,6s. Root a corrigé le changement d'écran pour effacer ce message (sans effacer les refus de progression). Aucun correctif n'est revendiqué dans les anciens PNG ; une assertion au premier montage de la cité, avant expiration automatique, est préparée pour la production locale.
4. Bandes beiges de raccords/traits schématiques : root a remplacé seulement leur habillage par le pavage natif existant après les captures ; physique et largeur conservées. Validation visuelle du nouveau rendu attendue après build.
5. Transparence de l'ancienne façade devant l'archive : réserve visuelle encore ouverte, transmise à root. Le joueur reste discernable mais le bas de l'archive se superpose à cette structure.
6. Répétition des façades/devantures, textures et cours encore vides : réserves artistiques. Les sept assets visibles ne rendent pas la ville entière achevée ou commerciale.

Le premier essai GameClient sur `127.0.0.1:4201` avait échoué avec refus de websocket HMR et bouton de nouvelle partie encore occupé après60s. Le serveur écoutait `localhost` : l'essai suivant sur `localhost:4201` fonctionne sans modifier la configuration ni contourner la politique d'origine. Ce lot diagnostic reste `chronicles-gameclient-current`, non assimilé aux PASS.

Le lot GameClient valide zéro exception JavaScript, zéro erreur console/HMR et aucun HTTP>=400. Deux annulations réseau de transition sont conservées dans son ledger (ambiance du vaisseau et préchargement RSC), donc aucune affirmation « zéro requête annulée ». L'icône `N`/`Rendering…` des captures est l'outil Next dev, pas un HUD publié.

## Recette suivante

Le runner `work-local/v79/qa/verify-chronicles-gameclient-v79.mjs` accepte `V79_QA_BASE`, `V79_QA_OUTPUT`, `V79_FRAMEWORK_KIND`. Il attend désormais le pont réellement non suspendu et toutes ses images SVG/HTML décodées avant capture, ainsi que le bouton narratif initial de la nurserie prêt. Les autres recettes sont séparées pour garder la provenance des checkpoints et des poses fixes.

Rejouer sur le serveur Next production local, puis sur l'alias public après identification de son SHA exact et Vercel READY. Relire les nouvelles captures ; ne pas réemployer ces PASS dev comme preuve finale de production. Aucun build, push, READY public ou parcours complet de campagne n'est affirmé par ce rapport.
