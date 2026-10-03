# Chroniques de personnage V79 — adaptation bornée du vrai CQC v0.56

Vérification du 3 octobre 2026, relevé initial 07:33:55 UTC puis contrôle supplémentaire du modèle après passe littéraire à 07:40:11 UTC. Trois fichiers nouveaux appartiennent à QA1 : le modèle app/game/systems/pitCharacterChroniclesV79.ts, son test tests/pit-character-chronicles-v79.test.mjs et ce document. Aucune modification de PitCanvas, GameClient, pitSave, pitArcade, sauvegardes de campagne ou assets par cet agent. Leur intégration UI appartient au root.

## Source réelle lue

L’archive fournie sous C:/Users/chuck/Downloads/CQC_Versus_Legacy_v0.56_BACKLOG_SPLIT/cqc-versus-v056/src a été lue directement, sans reconstruire CQC depuis une conversation. SHA256 :

| Fichier CQC | SHA256 |
| --- | --- |
| chronicles-core-v056.js | 57a6adbcdc488a6ab6ad0ee1678f65e64f82324a0d32abd070afbf97507a0a84 |
| chronicles-data-v056.js | bd82874766b56cdb348a4b781228516ceee0cb739b140427d7f926b2a64034d0 |
| chronicles-cinema-v056.js | 07aa7f877ca678927424a69429fe82c2334ac8dae382f31b9d9b254f31355e33 |
| chronicles-v056.js | 29298ff1d4af9b5f3ebcf243f579f823833a0c40089e89a79cd34d3cd899a804 |

Le moteur pur CQC distingue intro, pre, fight, post, defeat, outro et finished. Une route possède trois panneaux d’introduction, huit duels spécifiques avec before/challenge/after et trois panneaux d’épilogue. Le contrôle combat vérifie token, source iframe, héros, adversaire, stage, gagnant, manches et résultat ; quitter ou reprendre un combat revient au chapitre pre sans consommer de reprise. Les options de combat sont figées au début de la route. La galerie distingue introduction découverte et fin gagnée. Deux slots alternés portent révision et checksum, puis la lecture choisit la dernière copie valide.

Le comptage réel du fichier de données, exécuté en mémoire, donne 354 personnages, 354 histoires, 2832 duels, 2124 panneaux, 432 panneaux de scènes entièrement peintes et 1692 compositions. Seulement 72 histoires ont leurs six panneaux entièrement peints. Toutes les références adversaire/stage des routes existent. Ce comptage ne certifie pas la fidélité lore ni la qualité visuelle de chaque image.

Le renderer CQC utilise un catalogue d’atlas, des recadrages dans la cellule, contain pour l’inspection, un cache limité à huit images, annulation des décodages évincés et contrôle de demandes pour éviter le retour d’un ancien dessin sur une nouvelle scène. Une scène fullScene ne reçoit pas un second portrait par-dessus ; une composition peut juxtaposer décor et portrait. Ces principes sont transférables, les lieux, héros, dialogues, objets militaires et canon MGS ne le sont pas.

## État réel de The Pit avant ce modèle

- pitArcade.ts : douze premiers chasseurs, huit combats déterministes chacun, intro et ending courts ; six adversaires par rotation, rival puis Warlord. Les storyBeat sont communs, sans panneaux narratifs individuels.
- pitCircuit.ts : cinq chapitres et douze combats par premier chasseur, avec histoire de reconstitution déclarée ; routes et arènes largement communes. Les snapshots circuitRuns et descentRuns existent dans le sidecar Pit V5.
- pitSave.ts : Arcade conserve bestEncounter/completions/nextEncounter, mais pas de snapshot de run, de scènes ou de continues. PitCanvas crée un run Arcade au combat zéro à chaque nouveau lancement. Ne pas annoncer une reprise d’histoire individuelle depuis ces compteurs.
- pitNarrativeTrialsV57.ts et PitCanvas narrativeEncounter/onNarrativeComplete : seam de duel CPU imposé déjà présent, séparé des statistiques historiques et de la progression de campagne. C’est le point d’intégration choisi pour V79.
- Les 199 profils de duel et 187 arènes réels ne constituent pas 199 histoires achevées.

## Livraison du modèle V79

Quatre routes réellement écrites, chacune avec deux panneaux d’introduction, trois rencontres, texte avant/après chaque duel et deux panneaux de fin : Greyback, Tracker, Machiko Noguchi et Theta. Leurs textes, adversaires et successions d’arènes diffèrent. Une deuxième passe littéraire remplace les réserves répétées à chaque scène par des intentions et conséquences concrètes : espace de retrait chez Greyback, lecture des issues chez Tracker, position personnelle et passage chez Machiko, regard au-delà de la vengeance chez Theta. Les réserves restent dans continuity/limitation, hors récit. Aucun colon ni captif n’est crédité comme réellement extrait. Les lieux sont des ids runtime existants. Les tableaux réutilisent des plans de stage et un portrait du chasseur ; aucune nouvelle peinture, scène filmée ou animation dessinée n’est livrée dans ce lot.

| Personnage | Route originale | Adversaires de reconstitution | Arènes existantes |
| --- | --- | --- | --- |
| Greyback | Ce que juge un ancien | Boar, Shaman, City Hunter | vaisseau des trophées de Predator 2 |
| Tracker | Fermer la piste | Falconer, Classic 2010, Berserker | hautes herbes, épave de Noland, camp de Predators |
| Machiko | La place des vivants | Broken Tusk, Tichinde, Enforcer simulé | Prosperity Wells puis The Pit |
| Theta | Ceux que la chasse retient | Enforcer, Bad Blood, Berserker, tous modèles simulés | avant-poste de toundra, réserve The Last Hunt |

Les autres 195 entrées reçoivent une archive du profil existant, provenance et limite explicites ; getPitCharacterChronicleRouteV79 retourne null. Aucun chapitre généré à partir d’un nom n’est annoncé comme récit complet. Une archive de profil ne certifie pas une biographie canonique ni une fidélité 1:1.

Les biographies sont très courtes et distinctes des branches originales : [Elder et son silex — NECA](https://necaonline.com/2018/02/predator-2-7-scale-action-figure-ultimate-elder-the-golden-angel/), [Tracker et son hound — Sideshow/Hot Toys](https://www.sideshow.com/collectibles/predator-tracker-hot-toys-901303), [Machiko humaine et Broken Tusk — NECA](https://store.necaonline.com/blogs/news/shipping-this-week-predator-series-18-aliens-ultimate-warriors-chucky-body-knocker-and-ultimate-chucky-restock-1), [trilogie Machiko — Dark Horse](https://digital.darkhorse.com/books/9bb496a44e944fcda26662b44db247be/aliens-vs-predator-the-essential-comics-volume-1), [Theta et les captifs — Marvel](https://www.marvel.com/comics/collection/110461/). Les URL directes initiales NECA/Marvel ont retourné 403 ; les notices citées ont ensuite été récupérées par recherche sur les domaines primaires. Les duels, leurs choix et leurs fins sont originaux ; ils ne changent pas les films/comics et n’identifient pas un combattant existant au meurtrier des parents de Theta.

## Contrat pour le wrapper root

PIT_CHARACTER_CHRONICLE_ROUTES_V79 est un tableau. getPitCharacterChronicleStatusV79(id) retourne route + archive/provenance ; null pour id inconnu. Les cartes des quatre routes sont accessibles même depuis une archive non scénarisée. Le wrapper doit démonter le PitCanvas normal pendant la lecture, puis monter un PitCanvas CPU narratif seulement pendant la rencontre : ne pas conserver deux listeners manette/clavier concurrents.

createPitCharacterChronicleRunV79(fighterId, ownerSaveCreatedAt, runId) crée intro/page0. advancePitCharacterChronicleV79(run) parcourt intro→pre→fight ; post→pre ou outro ; defeat→pre ; outro→finished. Failed et finished restent terminaux. encounterIndex est le nombre de victoires : post affiche route.encounters[index-1], pre/fight utilisent getPitCharacterChronicleEncounterV79(run).

Le callback ajoute runId et encounterId, depuis le run capturé au lancement, au vrai PitNarrativeResultInput reçu par onNarrativeComplete. applyPitCharacterChronicleResultV79 vérifie CPU, run, héros/adversaire/arène exacts, gagnant appartenant au duel et identité du résultat. Un doublon identique est sans effet ; un identifiant contradictoire est refusé. Le KO peut rester visible avant onExit, pendant que le run post/defeat est déjà écrit. La prochaine scène n’est ouverte qu’après l’action du joueur.

Deux récupérations sont disponibles. La troisième défaite produit failed ; un nul revient à pre sans dépense ni victoire. La fin n’est accessible qu’après trois vrais reçus de victoire ordonnés. Les ids sont bornés, l’historique limité à 24 résultats ; s’il est plein, ne pas inventer une fin ni supprimer des reçus, proposer explicitement un nouveau parcours. Les résultats sont conservés et rejoués pour vérifier les compteurs.

pitCharacterChronicleStorageKeyV79(owner) utilise une namespace indépendante avec propriétaire. serializePitCharacterChronicleRunV79 checkpoint le pending fight vers pre ; parsePitCharacterChronicleRunV79(text,expectedOwner) refuse propriétaire étranger, version future, ids incompatibles, reçus désordonnés, phase impossible, JSON invalide et taille supérieure à 32 KiB. Une reprise recommence le duel ; elle ne promet pas une reprise exacte à une frame du combat. Ce module ne fait pas d’I/O et n’ajoute pas à lui seul une sauvegarde vérifiée en navigateur, une double copie ou une synchronisation de compte. Le wrapper doit afficher échec/volatilité d’écriture et ne pas annoncer la persistance avant confirmation réelle.

## Vérification et limites

node --test tests/pit-character-chronicles-v79.test.mjs : 14/14 PASS, vrais fichiers TypeScript chargés en mémoire avec tests/helpers/homeworld-scene-ssr-v78.mjs, vrais registres de personnages et d’arènes. Les tests exécutent les callbacks du reducer : chaque route complète, reprise du deuxième duel, doublon/contradiction, mauvais run/mode/adversaire/stage, trois défaites, nul, corruption/owner/version/historique forgé et limite des reçus. Aucun bundler ni binaire natif n’est substitué au modèle. Premier tsc --noEmit --incremental false --pretty false : exit0 sans diagnostic sur le checkout partagé au moment de l’exécution. Le deuxième tsc après passe littéraire et pendant intégration concurrente du wrapper retourne un diagnostic TS18047 dans PitExperienceV79.tsx(92,101), preview possiblement null, signalé au root. Aucun diagnostic dans le modèle ; ne pas transformer le premier PASS en validation du checkout concurrent final.

SHA256 modèle après passe littéraire et nouveau 14/14 PASS : 1fd394afd1a03f9b6f17713783ec40ae4f07697bc28c57029989cd8b14ef4867. Premier modèle avant passe littéraire : c962ab6b100458f0ea99979ed1a26f789e4760ccc94957da1ce789fd4dc12c53. SHA256 test inchangé : b56e7e9d0e5d2436cc370412d5a2be682326310bf533b92379b699bcecd20dc6.

Pas de build complet, de navigateur lancé, de captures V79, de commit/push ou de publication par cet agent. Les preuves V77 existantes restent historiques. Le gameplay réel et les tableaux illustrés du wrapper V79 doivent être vérifiés après intégration ; les tests purs ne prouvent ni leur peinture ni leur jouabilité à l’écran. Sauvegardes Arcade/Circuit anciennes préservées, aucun gain de campagne ou cosmétique ajouté.
