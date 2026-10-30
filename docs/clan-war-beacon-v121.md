# W3-RTS05 — Le porteur entre trois cratères (pilote tactique V121)

## Source et statut

Entrée exacte W3-RTS05 de la feuille Scénarios RTS de la Bible V6 (titre « Le porteur entre trois cratères », carte W3-MAP03 « Les Trois Cratères »). Cette fiche décrit la traque d'un porteur de balise dans des cratères, des arêtes de reconnaissance, un leurre et une récupération suivie du retour.

**Implémentation :** une épreuve tactique séparée du front V85 et de la sauvegarde principale, au format réduit **9 × 6** sur un terrain de la région W3-KR03. L'aire 36 × 28, les trois cratères complets, les animations de proie et les changements de vent cinématiques **ne sont pas réalisés 1:1** par cette étape.

### États effectivement joués

- L'ordre impose un vrai itinéraire de la Bible W3-L, une équipe de pisteurs W3-U01 et une équipe de traqueurs W3-U04 ou guides W3-U21, présentes, aptes, et payées en RAV au départ. Les membres gardent leur véritable identité V6.
- Le porteur adverse est le pion rival-0 déjà présent, sans génération d'un quatrième adversaire « spécial ». Une balise identifiée appartient à son inventaire jusqu'à son abandon ou sa mise hors combat.
- Le joueur voit un **signal suspect** dans le troisième cratère, mais ce leurre ne peut jamais valider l'objectif ni devenir une seconde balise. Un vrai éclaireur W3-U01 doit reconnaître la vraie balise grâce à la distance et à la ligne de vue locale avant toute récupération autorisée.
- Quand le porteur adverse tombe, la vraie balise reste au sol à sa dernière position physique. Le joueur doit faire venir un vrai traqueur W3-U04/W3-U21 sur cette case pour la récupérer ; le guetteur ne peut pas inventer une nouvelle capacité de portage.
- Si le traqueur tombe à son tour, la balise reste à son propre point de chute ; elle ne revient pas à la base et ne se duplique pas.
- Le succès n'est accordé qu'après reconnaissance et **arrivée du traqueur vivant avec l'unique balise à la coque (1,4)**. Les autres adversaires peuvent survivre. La victoire militaire générique ne remplace pas le trajet de retour.
- Un rapport identifié conserve W3-RTS05 comme source. L'expérience, les pertes réellement reconnues et les assignations de ce mandat utilisent les mêmes reçus V115 sans annexion fictive.

### Limites à lever

Le plan complet W3-MAP03 doit encore inclure les trois cratères à l'échelle source, les routes basses et hautes, les effets de cendre, l'échange de leurre selon la mobilité réelle du porteur, les patrouilles rivales et leurs escortes documentées, les interactions 2D du héros et le retour par un vrai véhicule. Le modèle actuel n'importe ni trophée canonique ni personnage connu d'un autre média.

La traçabilité et les sauvegardes sont testées dans tests/clan-war-beacon-v121.test.mjs ; le workflow .github/workflows/clan-war-v115.yml reste la référence pour un verdict CI réel. Aucun test automatique ne remplace une QA navigateur sur les chemins de carte, les touches manette, l'affichage mobile et le framerate.
