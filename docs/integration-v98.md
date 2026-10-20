# Trois parcours jouables — V98

Ce lot poursuit les guerres de clans, Preserve Hunt et Homeworld dans leurs
écrans existants. Les 30 théâtres et leurs côtes V97 sont conservés. Le numéro
de contenu affiché et celui des exports deviennent V98 ; les versions des
formats d'archives gardent leurs contrats de compatibilité.

## Guerres de clans

Le poste de commandement regroupe les sites contrôlés, leurs garnisons,
liaisons de ravitaillement, personnes disponibles, blessés et stocks locaux
après réservation. Les filtres isolent les frontières et les sites à sécuriser.
Les actions ouvrent la préparation d'un ordre sur le vrai territoire.

L'aperçu consulte la validation du moteur avant toute réservation. Il explique
les créneaux, coûts et blocages, avertit lorsqu'un mouvement engage les derniers
gardes et distingue le renseignement inconnu d'une observation datée. Les
conditions des objectifs sont détaillées par région et le long du corridor.
Les effectifs et stocks étrangers ne deviennent pas visibles dans ce tableau.

Voir [le poste de commandement et ses vérifications](clan-war-command-v98.md).

## Preserve Hunt

La première expédition de Vharuun conserve ses trois secteurs et ses huit
combattants. Le sabotage peut interrompre un appareil pendant les quinze
secondes d'embarquement. Les passagers reviennent à la rampe réelle ; les
survivants peuvent réparer et tenter un nouveau départ. Un décollage achevé
reste définitif. Les événements d'interception et de débarquement accompagnent
la sauvegarde pour distinguer cette transition d'un retour arbitraire en arrière.

Le suivi tactique rend les objectifs, secteurs visités, interactions proches
et alertes de moteurs consultables en texte. Il conserve les limites de
connaissance du chasseur. Le mode libre reste distinct de la campagne.

Voir [les règles d'interception, le carnet et les sauvegardes](v98-preserve-hunt-interceptions.md).

## Homeworld

Le repérage de la cité actuelle s'appuie sur les destinations et autorisations
du registre existant. Un itinéraire relie les rues, passages entre étages,
portes et approches intérieures à partir de la position du joueur. Le guide
reste visible après fermeture de la carte ; les changements de lieu suivent
les interactions physiques habituelles. Le calcul utilise les collisions du
monde courant et refuse un trajet sans passage vérifié.

Le guidage est un repère de session : il n'ajoute ni déplacement automatique,
ni permission, ni progression narrative dans une archive.

Voir [les parcours physiques et le calcul du guidage](homeworld-wayfinding-v98.md).

## Vérification reproductible

`npm run test:worlds:v98` exécute les contrôles V98 et les régressions ciblées
des moteurs de réserve, de la sauvegarde de campagne, du repérage historique
et des fronts planétaires. Cette commande est intégrée au workflow applicatif.
Son checkout réduit conserve les dix images natives nécessaires à la réserve
(1,96 Mo), afin que le contrôle des ressources fonctionne aussi en CI sans
remplacer les originaux par des images factices.

Les contrôles navigateur utilisent `scripts/qa-three-modes-v98.mjs`. Le rapport
distingue les actions réellement jouées des états de préparation de recette.

Sur la source V98 stabilisée :

- `npm run test:worlds:v98` : **105 tests réussis, aucun échec, aucun ignoré**.
- Suite générale : 4 427 cas. Le lancement initial donne 4 422 réussites,
  quatre tests de sources privées ignorés et un échec de configuration :
  Google Chrome est absent de cette machine. Le contrôle d'accessibilité
  concerné a été rejoué avec `AUDIT_CHROME_EXECUTABLE=/usr/bin/chromium` et
  réussit. Bilan après cette relance ciblée : **4 423 cas validés, quatre
  ignorés, aucun échec fonctionnel restant**. Le journal initial conserve
  son code de sortie 1 et n'est pas présenté comme un lancement vert unique.
- `npm run build:production` : compilation Next et worker réussie, contrôle du
  CSS compilé réussi. Les étapes propres à Vercel sont sans objet en local.
- `npm run qa:next-production` : cinq contrôles réussis sur le serveur compilé,
  ses scripts et les trois routes de QA protégées.
- `npm run typecheck` : aucune erreur TypeScript.
- Recette des trois modes sur la compilation finale : **54 contrôles réussis,
  13 captures inspectées, aucune erreur JavaScript ni erreur console**. Les
  empreintes des sources sont identiques avant et après le parcours.
- ESLint global : aucune erreur ; 169 avertissements historiques. Le lint
  strict des fichiers V98 et de leurs intégrations ne produit aucun avertissement.

La recette finale est exécutée contre le serveur Next local compilé. Les
captures intermédiaires de développement et les candidats échoués restent
identifiés séparément. Le parcours Homeworld prépare une campagne de jeunesse
validée par les modèles du jeu ; l'embarquement Preserve utilise un checkpoint
de recette explicite. La marche Homeworld utilise les vraies commandes et
collisions avec une horloge de test pilotée ; le calcul du worker est mesuré
en temps réel. Ce sont des preuves locales, sans affirmation de publication.

Le parcours Homeworld marche réellement du port jusqu'à l'Escalier du Conseil,
traverse jusqu'au palier +1, recalcule le guidage, vérifie sa pause et son
effacement, puis enregistre et recharge la position au même palier. Le calcul
initial du repère a pris 18,6 secondes sur cette machine cloud ; l'interface
reste utilisable et le calcul est annulable. La recette ne certifie pas la
performance d'un téléphone physique ni une partie complète de campagne.

Preuves locales : `outputs/qa-three-modes-v98/production/result.json` et les
13 captures du même dossier. Les anciens diagnostics d'horloge de recette
sont conservés dans un dossier séparé et ne remplacent pas ce rapport final.
Un complément Preserve seul a rejoué 17 contrôles sur la même source, vérifié
que le canvas était dessiné et remplacé les quatre captures correspondantes.
Le rapport principal conserve ses 54 contrôles et indique cette provenance ;
ces 17 reprises ne sont pas ajoutées au compte comme des tests indépendants.

Les résultats agrégés, codes de sortie et journaux sont conservés dans
`outputs/qa-three-modes-v98/verification.json` et son dossier `verification/`.
Les quatre cas ignorés concernent les classeurs privés V6/V3 et trois anciens
checkpoints V88 absents du checkout, sans remplacement par des données inventées.
