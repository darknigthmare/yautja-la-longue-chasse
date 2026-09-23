# V48 — de l’accueil Unblooded au premier réveil

## Ce qui est livré

Nouvelle partie commence toujours par le prologue V47 de la nurserie. Après sa victoire et l’ellipse, le jeune Unblooded doit encore rejoindre physiquement le chef puis le maître dans la cité. Le dialogue du maître ouvre désormais une formation jouable : déplacement entre balises, franchissement par saut, esquive d’un vrai coup annoncé, trois frappes distinctes à portée et projection du mannequin jusqu’à sa retombée. Une démonstration brève du maître accompagne chaque geste, sans donner de réussite automatique.

La première lame nécessite la fin du dojo et une interaction au râtelier. Le premier biomask nécessite un choix explicite de lien et une interaction au poste. Il est reçu et conservé pour la sortie : les exercices et le cutout de la cité restent sans masque. Le camp impose ensuite un parcours chronométré avec obstacles solides ET un duel non létal. Rejoindre la couche et se reposer mène au premier matin. Un échec recommence uniquement l’épreuve concernée ; pause, perte de focus et chargement incomplet arrêtent les horloges.

La sauvegarde V9 conserve le checkpoint, les six preuves et les deux pièces de jeunesse dans une même écriture. Une erreur de quota ou un conflit refuse l’avancement et la sortie sans écraser une autre session. Les V7/V8 adultes restent distinctes. La formation ne crée aucun honneur, rang adulte, plasma ou vaisseau. `training-completed` n’entre dans la chronique qu’après le parcours et le duel ; les preuves de chasse futures ne sont pas acceptées comme des étapes déjà jouées.

## Images et modularité

Huit PNG OpenAI nouveaux et inchangés : trois décors (dojo, camp, baraquements), quatre atlas de personnage (Unblooded et maître original, chacun dans deux orientations natives) et un atlas de huit accessoires indépendants. Les quatre atlas contiennent 80 dessins réellement distincts, réunis en 40 clips courts de deux dessins. Ils ne sont pas présentés comme des animations finales à forte densité d’images. Les actions/impacts ne bouclent pas ; les directions ne sont pas obtenues en miroir.

Les accessoires — mannequin, traverse, balise, râtelier, poste biomask, couche, porte, brasero — sont des découpes indépendantes, placées séparément du fond. Les obstacles affichés suivent les véritables collisions. Le dojo a une calibration de sa ligne de sol mesurée sur le PNG original ; aucune retouche des pixels sources. Les trois fonds sont des peintures complètes, pas encore des packs complets de plans de parallaxe indépendants.

Les prompts exacts et SHA-256 sont conservés dans `docs/v48-openai-prompts.json`. `docs/v48-art-qa.json` décrit les cadres, les marges et les limites de contrôle. Les huit sources runtime ont été comparées octet pour octet aux fichiers du générateur. Ces personnages et lieux sont des adaptations originales du clan du projet, pas des lieux ou chasseurs nommés prétendus fidèles 1:1 à une référence officielle.

## Quatre profils QA simulés

1. Novice/mécanique : parcours réellement joué au clavier, collision, esquive au bon moment, erreurs/reprises et checkpoints. Rapport `docs/v48-qa-novice-mechanics.md`.
2. Accessibilité : clavier/focus, récupération après image manquante, tactile 390px, petit paysage, texte agrandi, mouvements réduits, manette standard virtuelle. Aucun essai de manette physique revendiqué. Rapport `docs/v48-qa-scene.md`.
3. Fiabilité : reprise, sauvegarde manuelle, quota, écriture incertaine, concurrence et compatibilité adulte. Rapport `docs/v48-qa-youth-reliability.md`.
4. Continuité/visuel : retour aux conversations sources et au squelette jeunesse, silhouettes/échelle/orientations, récompenses, absence de faux rang et de vaisseau personnel, régression nurserie et THE PIT. Synthèse dans `docs/v48-validation.json` après les exécutions finales.

Les tests fonctionnels et les captures sont des preuves automatisées et des revues d’agents ; ce ne sont pas quatre personnes humaines ni une certification de jeu commercial terminé.

## Ce qui reste

La sortie accompagnée du désert du lendemain, la première petite cage PIT de jeunesse, sa progression propre et la suite des rites ne sont pas jouables dans V48. La grande mise en scène demandée du couloir, des flammes, de l’appel du nom et du trône n’est pas déclarée terminée : l’accueil chef→maître reste la version physique V47. Les équipements reçus n’ont pas encore de jeu complet de sprites portés pour chaque pose. Les gros chantiers d’arènes/parallaxe et d’animations de tous les chasseurs connus restent séparés et incomplets ; V48 ne les remplace pas.

Source de continuité : conversation `6aa9e35a-3288-83eb-a8bf-45d3197113bf`, tour utilisateur `7efc0ab0-c5af-4bea-a1ba-c62bc14676e2`, corrections du titre `1b26a092-3975-4e4c-9443-092965d0fd67` et du squelette `328e7d74-8f59-4381-b0d4-6e92e345ba0a`, copie locale `work/v36/new-world-specs/youth-thread-page-1.json` et audit `work/v47/spec-qa/prologue-source-and-qa.md`.
