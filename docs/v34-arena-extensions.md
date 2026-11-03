# Extensions de duel du catalogue 09–20

Les douze entrées 09–20 disposent chacune de quatorze images indépendantes réparties sur six plans. Le lot 13–20 ajoute 112 dessins sélectionnés et cinq variantes rejetées archivées hors couverture. Ces lieux restent des propositions originales fondées sur le catalogue local ; la conversation détaillée consacrée aux cent arènes n’est pas présentée comme retrouvée.

Le registre `pitArenaExtensions.ts` autorise explicitement ces douze identifiants. La première édition conserve ses huit identifiants, ses définitions et ses routes de chroniques. Un statut artistique `reviewed` ne crée jamais d’entrée dans le registre de combat. Le manifeste associe chaque extension à son identifiant exact, à son numéro de catalogue, au profil `neutral-duel-v1` et à une preuve de rendu réelle.

Les extensions utilisent une surface symétrique de 960 × 540, un sol à y=430, des limites à x=54/906 et des apparitions à x=300/660. Les textures de contact restent au facteur de parallaxe 1. Aucun module de décor ne modifie les collisions, les dégâts ou le déroulement déterministe du combat. Les ouvertures, accessoires, luminaires et avant-plans sont des PNG indépendants ; leurs proportions sont conservées avec des limites alpha mesurées. Les cent fiches de catalogue ne sont donc pas présentées comme cent arènes terminées.

Chaque extension livre un seul secteur de duel. Les secteurs supplémentaires, ruptures, transitions et accessoires interactifs restent des objectifs de conception non implémentés. Le catalogue expose séparément `implementedSectors`, `interactivePropsImplemented` et `transitionsImplemented`. Les images de ces douze kits sont fixes ; ce lot ne crée aucune animation de décor supplémentaire.

Les 168 images des extensions sont au statut `integrated` après les douze recettes de l’application complète V35, archivées dans `docs/v34-arena-009-…-fullapp-qa.json` jusqu’à `docs/v34-arena-020-…-fullapp-qa.json`. Chaque parcours vérifie la sélection, l’entraînement, le combat, les déplacements et le mobile : quatorze images chargées, six plans, quatorze sous-plans, aucune requête manquante et aucune erreur JavaScript. Six parcours utilisent Jungle Hunter / City Hunter, les six autres Tracker / Greyback. Ces preuves complètent le harnais de composition qui vérifie huit cadrages/scénarios et l’absence de changement du combat ou de la caméra.

La couverture totale est de **20 arènes de duel jouables et 80 concepts**, avec **288 PNG sélectionnés intégrés**. Les variantes rejetées et les originaux d’archives ne gonflent pas ce nombre. Les vingt kits comprennent 283 sous-plans ; la boucle de flamme existante du premier kit explique la différence entre sous-plans et fichiers PNG.

En cas d’échec d’une image obligatoire, une extension signale un kit indisponible ; elle n’emprunte aucun décor historique. Les huit arènes d’origine gardent leur secours bitmap propre. Les sources et reçus restent exclus du déploiement : la projection runtime versionnée est déterministe, et son contrôle compare le manifeste source et les preuves originales. L’audit vérifie les empreintes des PNG publics et des originaux archivés, ainsi que la transparence et le bord opaque du sol.


Le cadre visible du combat conserve explicitement le ratio 16:9 de la simulation 960 × 540. À partir de 1000 px de large, le laboratoire occupe une colonne latérale de 330 px. Sur téléphone, les commandes tactiles et le laboratoire restent sous l’arène et peuvent défiler ; aucune de ces interfaces ne recouvre les pieds des combattants. Les lignes de HUD et de statut gardent leur hauteur de texte. Le harnais `scripts/verify-pit-layout-v35.mjs` contrôle 1280 × 900, 1280 × 720 et 390 × 844, laboratoire fermé/ouvert, puis les deux cas sur appareil réellement tactile.

La panne contrôlée d’un PNG de sol est reproduite par `scripts/verify-pit-arena-failure-v35.mjs` : statut `unavailable`, avertissement visible, treize fichiers reçus mais aucun sous-plan dessiné, aucun décor historique emprunté et simulation toujours active. Aucun fichier public n’est supprimé pour ce test ; le navigateur intercepte une réponse en 404.


Recettes finales archivées après la dernière compilation V35 :

- [Cadrage : huit configurations, dont deux tactiles](v35-pit-arena-layout-qa.json).
- [Panne réelle de PNG avec avertissement visible](v35-pit-arena-missing-png-qa.json).
- [Audit des 288 PNG intégrés, sources et empreintes](v35-pit-arena-production-audit.json).

Les 48 tests ciblés arènes, caméra, replay, chargement et projection runtime passent. Aucun sous-plan n’est déclaré interactif par la seule présence de son image.
