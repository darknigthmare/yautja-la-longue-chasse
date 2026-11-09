# Chasses rapportées et accords — suite narrative du 9 novembre 2026

Suite de `QUETES_VIVANTES_20261109.md` dans la PR 132, base publiée `9dce866a2f9972800e6adfca3e312d38c6aa8540`. Les conditions et les noms de la campagne existante priment ; ce document n'annonce ni nouvel événement canonique ni nouvelles chasses.

## Ce que les personnages savent

Quatre rapports de terrain qualifiés peuvent être repris avec les six contacts : la reconnaissance d'Oseris-IV, la route sous la glace de Nivalis-K, la chasse du paria de Cinder-12 et les observations des ruines d'Acheron-Sigma. Le joueur choisit de quelle expédition il parle. Le dialogue n'appelle jamais ce dossier « dernière chasse » : les compteurs de tentatives, le meilleur score et les trophées ne suffisent pas à établir le résultat d'une sortie plus récente.

Les douze opérations, leurs IDs, les récompenses, les rangs et les 50 répliques précédentes sont conservés. Les 42 nouvelles répliques comprennent 24 réactions aux quatre rapports de terrain et 18 réactions aux trois issues du Berceau. Le choix d'un récit ne modifie aucune sauvegarde, preuve, marque, relation ou affectation. Le volet se referme sans perdre le rapport ; seule sa sélection locale disparaît.

### Trois retours, pas une victoire automatique

- **Repli** : aucune reine vaincue, aucune crête rapportée. Les observations peuvent être discutées sans fabriquer une prise.
- **Victoire sans crête** : le combat est reconnu mais aucun socle ni objet n'est ajouté. Le texte ne suppose pas pourquoi le prélèvement a été abandonné.
- **Crête rapportée** : les personnages reconnaissent le retour ; ils ne certifient pas l'intégrité du trophée à distance et ne traitent pas le récit comme un examen médical.

Ces échanges sont disponibles seulement après le retour physique complet et le choix explicite de présenter au clan. **L'analyse conservée à l'atelier ne devient pas une information commune.** Un ancien dossier sans choix de partage explicite reste privé ; aucune migration n'invente une présentation. La simple extraction n'ouvre pas les réactions.

Les interlocuteurs doivent être au poste réel du navire du clan. Une personne mise en réserve, transférée, suspendue ou indisponible ne parle pas depuis sa fiche. Pendant C37, les deux témoins réunis restent concentrés sur l'audience ; cette conversation secondaire est absente. Les versions futures, propriétaires incompatibles et rapports contradictoires sont refusés sans effacer la progression.

## Accords avec les quatre compagnons pilotes

**Brèche.** Le gardien cherche une approche et un rappel fiables. Son refus d'une proie vivante pendant le premier essai tient à ce qu'il veut éprouver le rappel, pas la poursuite. Il ne proclame pas une interdiction morale universelle de la chasse. Le dialogue convient d'un essai futur ; il ne prétend pas qu'un dressage animé a déjà été joué. Le gardien reste avec le chien au refuge jusqu'à la préparation de l'habitat.

**Éclisse.** Un mécanicien veut comprendre les liaisons d'une commande retrouvée avant de la relier au navire. Une alimentation séparée, des outils déterminés et un arrêt accessible ont un sens technique concret. Ils ne deviennent pas un rituel ni un « protocole de conformité » récité. La réception de l'unité et son affectation à une baie restent séparées.

**Lance-Fendue.** Le vétéran refuse de rejoindre une sortie sans point de retour commun. C'est sa condition personnelle, pas une loi attribuée à tous les Yautja. Il accepte de préparer des exercices et des sorties, pas de gagner les épreuves individuelles du joueur. Son autonomie et celle du chasseur restent explicites.

**Opale.** Elle veut des observations sur son ancienne équipe, garde sa mémoire et peut refuser une sortie. Ses conditions appartiennent à ce personnage synthétique original ; aucune disposition universelle de la culture yautja n'en est déduite. L'accord ne l'installe pas d'office dans une cabine.

Trente-deux passages sont réécrits. Les titres, options, branches acceptées/refusées, seuils chiffrés, salles, IDs et règles de progression sont identiques aux définitions précédentes. Les valeurs nécessaires au joueur restent affichées dans les objectifs ; elles ne sont plus débitées dans les paroles des personnages. Un test compare les définitions complètes à la photographie mécanique antérieure en excluant uniquement les champs de prose.

## Fidélité : repères et limites

La traque, le camouflage, le biomask et l'arsenal avancé sont des repères attestés dans les présentations officielles de **Predator: Hunting Grounds** :
- PlayStation : https://www.playstation.com/en-us/games/predator-hunting-grounds/
- IllFonic : https://predator.illfonic.com/about/
- Arsenal officiel : https://predator.illfonic.com/the-predator/

Ces pages ne prouvent ni les paroles écrites ici, ni les planètes originales, ni les règlements de ce clan. Les missions, proies et personnages originaux proviennent de `app/game/data.ts`, de `clanShipOperations.ts`, de `companionResidence.ts` et de la bible actuelle. La filiation exacte de la cité d'Acheron-Sigma reste une question ; le dialogue ne lui donne pas arbitrairement un constructeur canonique. Aucune langue yautja inventée n'est présentée comme une traduction attestée.

La formule « lore friendly » qualifie ici un objectif de cohérence, pas une certification artistique 1:1. Aucun nouvel asset, animation, voix enregistrée ou traitement médical jouable n'est livré par ces répliques.

## Raccordements et vérification

- `clanShipHuntDialogue.ts` lit les reçus validés et le choix du retour, sans écrire.
- `ClanShipHuntConversation.tsx` ajoute un volet optionnel au vrai panneau existant ; les quatre sujets initiaux restent inchangés.
- `clan-ship-hunt-dialogue.test.mjs` couvre source du récit, confidentialité, ancien format, données invalides, présence, rechargement, absence de récompense et invariants des quatre recrutements.
- `qa-clan-hunt-dialogue-browser-20261109.mjs` exerce le vrai GameClient. Les prérequis, victoires et extractions sont des fixtures déclarées ; seuls les déplacements à bord, les choix de récits et le rechargement sont joués dans cette recette.

OPS-B05 reste partiel : pas de mémoire de toutes les tentatives ratées au sol ni de nouvelle relation persistante. OPS-B04, B06/B07, R2-M027 (mentor, intégrité, VFX/audio), OPS-Q26 et les autres lignes non réalisées gardent leur état ouvert. Les échanges ne remplacent pas l'escorte, le dressage ou l'animation manquants.
