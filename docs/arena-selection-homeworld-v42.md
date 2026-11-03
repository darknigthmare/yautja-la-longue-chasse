# V42 — Roster, 100 scènes d’arène et contre-enquête Homeworld

## Périmètre réel

Cette livraison complète les fonds propres des arènes 21 à 100 avec 80 nouvelles images créées par l’outil OpenAI intégré. Chaque scène assemble six plans P0–P5 : un fond propre, des modules transparents de la bibliothèque déjà produite, un sol de contact indépendant et des bordures de premier plan. Les réemplois sont déclarés par `libraryRef` et ne comptent pas comme de nouvelles images. Les vingt premiers kits restent conservés.

La scène neutre jouable et la totalité de la conception d’une arène sont deux états distincts. Les 33 signatures particulières encore listées dans `signatureBacklog`, les accessoires interactifs et la majorité des secteurs supplémentaires ne sont pas livrés par simple activation du décor. Les objectifs de deux ou trois secteurs du catalogue restent des objectifs, pas une preuve d’implémentation. Les variantes patrimoniales 51–60 sont des réinterprétations originales, pas des reproductions 1:1 des anciens jeux. La conversation privée dédiée n’a pas été récupérée dans ce lot.

## Sélection et combat

Le parcours sépare le choix de J1, la confirmation de J2, puis le choix du stage avec aperçu des plans réellement employés en combat. Le roster utilise les icônes des seize chasseurs disponibles. Les grandes présentations utilisent les images/poses existantes ; le combattant de droite est orienté vers la gauche. Le retour préserve les choix. La galerie monte au plus 24 vignettes par page pour éviter de charger cent grands fonds simultanément. Clavier, croix directionnelle virtuelle et tactile suivent le même parcours ; les autres modes existants restent accessibles.

Un échec de chargement affiche une reprise explicite et ne lance pas la simulation. L’aperçu ne remplace pas les contrôles de chargement du combat. Les mouvements réduits arrêtent la caméra d’aperçu et les animations de décor.

Le parcours d’exhibition optionnel **Porte des Réserves → Réserve des Crocs** réemploie deux scènes existantes. Une projection confirmée près d’une limite transfère les deux combattants dans la cour dans le même tick. Une projection ratée, déchoppée, un KO ou le temps écoulé ne déclenchent pas le passage. Le duel neutre reste le choix par défaut ; cette variante ne modifie pas les récompenses de campagne. L’entrée du sas était déjà ouverte : aucune fausse animation de porte ou destruction de mur n’est revendiquée. Les replays V6 conservent ce parcours ; les anciens V4/V5 restent relus avec leurs règles d’origine.

## Homeworld

La contre-enquête du convoi prolonge la première audience après les deux rapports d’expédition durables. Cinq étapes demandent des déplacements réels entre interlocuteurs, une confrontation des preuves et un choix de branche conservé. Les conséquences antérieures, notamment témoin et balise, restent reconnues. La version suivante d’une sauvegarde est refusée sans écraser le slot ni sa copie de secours. Le détail des sources, limites et migrations figure dans [homeworld-inquiry-v42.md](homeworld-inquiry-v42.md).

## Sources et contrôles

- Sources originales intactes : `public/game/sprites/v42/pit-arenas/<arena-id>/p0-depth.png`.
- Prompts exacts, SHA-256 et contrôles individuels : `art-source/v42/pit-arenas/<arena-id>/receipt-p0-depth.json` et `p0-visual-review.json`.
- Composition : `art-source/v42/pit-arenas/composition-plan.json` et manifeste de production V33 étendu.
- Preuve du rendu de chaque composition : `docs/v42-arena-*-renderer-qa.json` et `docs/v42-arena-composition-visual-review.json`.
- La recette complète de l’application exige chargements HTTP réels, six plans, simulation, largeur mobile et sauvegarde inchangée. Le statut `integrated` exige son résultat positif lié au digest de composition ; un script écrit ou un simple PNG ne suffit pas.

Les résultats finaux de compilation, tests et publication sont conservés dans le rapport de livraison V42. Ce document ne constitue pas, à lui seul, une attestation de publication ni de jeu complet.
