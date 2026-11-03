# V66 — Progression, récits et première Game Reserve

Cette version avance quatre chantiers confiés à quatre agents distincts, puis raccordés au jeu principal. Elle ne déclare ni la campagne, ni les réserves, ni les animations des 187 stages entièrement terminées.

## Accès dans le jeu

- **Solo — Les Premières Pistes** : après la formation et la cage, rejoindre le maître dans la salle d’entraînement du Homeworld. La nouvelle sortie comporte sept preuves ordonnées, un retour et un compte rendu au mentor. La validation finale inscrit cette étape ; elle ne donne ni vaisseau ni rang supplémentaire.
- **Histoire annexe — La marque empruntée** : pour un chasseur autonome, rencontrer le maître dans la salle d’entraînement. L’enquête passe par la forge, le registre et un choix de dénouement. Deux branches et onze étapes sont sauvegardées.
- **Missions de PNJ — Les passages de retour** : parler à la soigneuse de la loge du clan. Les deux missions demandent de nouvelles sorties dans les Marches de Cendre puis le Désert de Verre, et un débriefing auprès du PNJ. Les anciens comptes rendus ne terminent pas rétroactivement ces missions.
- **Game Reserve — Vharuun** : dans le dossier du clan, onglet des réserves, préparer l’expédition. Cette première sortie réservée aux chasseurs autonomes relie trois secteurs avec huit humains armés et deux appareils d’évasion. Le joueur observe, chasse, sabote ou rejoint son point de retour. La reprise conserve les faits de la sortie ; une nouvelle expédition demande confirmation.

## THE PIT

Neuf nouvelles planches OpenAI transparentes, chacune de six dessins, ajoutent trois animations indépendantes à chacun de ces stages :

1. Balcon du Roi de la Chasse — vapeur, éclairage et mécanisme.
2. Temple de la Double Lune — souffle, éclairage et volet rituel.
3. Salle du Porte-Cendres — échappement, indicateur de four et mécanisme industriel.

Le tirage est renouvelé au lancement. La graine visuelle est conservée dans le replay existant ; elle ne modifie pas les dégâts, l’IA ou les récompenses. La pause fige les animations et le mode mouvements réduits conserve une pose native.

L’audit compte **38 stages sur 187 avec un ensemble d’animations dédié**, donc **149 encore sans cet ensemble**. Les observateurs partagés historiques ne sont pas comptés comme trois animations uniques. L’inventaire détaillé est `docs/v66-stage-animation-coverage.json`.

## Fidélité et limites

Les nouveaux récits, les noms des adversaires de Vharuun et les lieux originaux sont présentés comme des créations du jeu compatibles avec sa continuité, sans les déclarer canoniques ou certifiés fidèles 1:1. Les étapes de jeunesse ne débloquent pas artificiellement une vie de chasseur autonome.

Game Reserve livre **une réserve sur dix et trois secteurs sur les quatre-vingts prévus**. Les cent profils et deux cents PNG évoqués dans ChatGPT ne sont pas importés : les fichiers n’ont pas été récupérés. Huit humains partagent trois atlas existants ; le chasseur utilise encore une pose tenue. Les neuf autres réserves, les rivaux, les contrats, le multijoueur et les trophées persistants restent à produire. Le délai de départ des appareils est visible, mais un appareil déjà en cours d’embarquement ne peut pas encore être saboté.

Les preuves techniques, les recettes navigateur, la revue visuelle et l’état de publication doivent être lus séparément dans les rapports V66. Un build réussi ne constitue pas à lui seul une validation de ces parcours.

Qualification locale : **2 095 tests réussis sur 2 095**, builds Vinext et Next webpack, TypeScript et contrôle du HUD compilé validés. Le lint conserve trois avertissements existants, sans erreur. Les recettes couvrent les deux fins de l’enquête, les nouveaux parcours solo/Reserve, les dialogues PNJ et les neuf animations ; les preuves de terrain PNJ sont vérifiées par moteurs et callbacks, pas présentées comme des expéditions entièrement jouées au navigateur. L’état public exact est consigné dans `docs/v66-release-gates.json` et le rapport de déploiement.
