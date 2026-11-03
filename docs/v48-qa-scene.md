# V48 — formation jouable : présentation et accessibilité

## Périmètre

La scène YouthTrainingScreen présente le moteur déterministe de jeunesse : balises de déplacement, franchissement solide, esquive annoncée du maître, trois frappes sur cible, projection physique avec retour au sol, lame gagnée, choix du lien de biomask au poste, parcours chronométré, duel non létal, couche et matin. Aucun bouton ne valide les exercices de déplacement ou de combat. Les preuves et récompenses sont écrites par la campagne avant reprise du jeu.

Les corps Unblooded et mentor sont des atlas bitmap indépendants, avec deux orientations natives. Les accessoires modulaires sont découpés depuis un atlas PNG : cible, traverse, balise, râtelier, piédestal, couche, porte et brasero. Le mannequin de projection est un accessoire distinct, déplacé et incliné suivant sa vraie trajectoire ; il n'est pas annoncé comme un personnage avec des animations complètes.

## Commandes et comportement

Les touches reprennent les raccourcis J1 réellement configurés : déplacement, saut, poing, lame, esquive, projection et interaction. La manette standard utilise stick/croix, A, X, Y, B, RB, LB et Menu ; haut/bas choisit le lien à l'armurerie, A permet de retenter un duel perdu. Les huit boutons tactiles mesurent au moins 44 pixels. En portrait, le terrain conserve exactement son ratio 16:9, sans les grandes bandes noires d’un conteneur de 420 pixels ; les commandes restent sous le terrain. Deux indicateurs d’équilibre accessibles existent uniquement pour le duel du camp et sa défaite, jamais dans le dojo ni la nurserie. Une manette virtuelle vérifie le contrat, sans prétendre remplacer un essai matériel.

Pause, perte de focus, onglet masqué, déconnexion manette, chargement incomplet et écriture de preuve en cours arrêtent simulation et chronomètre. Une entrée maintenue avant la reprise ne donne pas d'avance au maître : toutes les commandes doivent être relâchées. Quitter attend une sauvegarde réussie. Une preuve gagnée reste en attente en mémoire si le stockage échoue, avec reprise explicite et sans rejouer son exercice.

Le dojo donne une démonstration courte du maître (repos, geste complet, repos) ; elle se rejoue sur demande et se masque. Elle est cachée par défaut sur petit écran et statique en mouvements réduits, sauf lancement manuel. Les poses d'impact ne bouclent pas. Cette vignette ne touche jamais au moteur ni aux récompenses.

## Corrections pendant le développement

- Le signal initial disait d'esquiver dès l'anticipation, avant la fenêtre efficace. Le dojo a désormais une fenêtre pédagogique plus large et annonce d'abord la préparation, puis « Esquivez maintenant ». Le duel conserve ses timings propres.
- Une sélection de teinte faite pendant la neutralisation des commandes pouvait disparaître ; elle est conservée jusqu'à son application effective par le moteur.
- La pose de saut ne dépend plus d'un compteur d'action immobile : ascension et descente choisissent leurs dessins distincts.
- Le premier audit navigateur a reproduit un blocage après PNG indisponible : le focus quittait le terrain encore vide, ouvrait Pause et interceptait le clic Réessayer. La pause par perte de focus exige désormais des images chargées ; le bouton Réessayer est un contrôle explicitement autorisé. Le retour redonne le focus au terrain, pas au bouton disparu.
- La capture a révélé les pieds trop bas dans la bordure avant du dojo. La ligne de sol source est calibrée à 733 pixels, sans modification des pixels du PNG ; elle correspond désormais à la collision Y=430.
- Les preuves en attente restent réessayables au clavier, y compris dans la fenêtre de pause.
- La préférence de mouvements réduits de l’OS peut arriver après le premier montage React. Son activation annule maintenant une démonstration automatique déjà armée ; un lancement manuel reste possible.
- Le focus à la fin du chargement est conditionné à une scène encore montée et sans pause interne ou externe.
- La revue du quatrième profil a relevé un combat du camp sans retour de dégâts lisible. Deux indicateurs d’équilibre non létal affichent les vraies valeurs de chaque combattant.
- La capture mobile montrait 220 pixels de bandes noires sans utilité. Le format portrait est désormais 16:9 ; une sonde CSS isolée a vérifié un terrain de 360 × 202,5 pixels et une page de 844 pixels pour un écran de 844 pixels, avec pause et reprise encore accessibles. La confirmation visuelle et fonctionnelle sur le build final 4 est réussie : le terrain est bien 16:9, les huit commandes restent lisibles et la pause reste utilisable sur petits écrans.

## Vérification

14 tests de présentation, de commandes et des PNG définitifs passent : validation des ressources, distinction des orientations et du mentor, cadres/ancres, poses non bouclées, props aux dimensions de collision, phases de saut, absence de rendu de remplacement en chargement, raccourcis remappés, tactile/manette et cycle de démonstration. Commande : `node --test tests/youth-art-v48.test.mjs tests/youth-presentation-v48.test.mjs`.

La recette de parcours physique est `scripts/verify-youth-scene-v48.mjs` (exécution indépendante par le profil mécanique). Elle reprend une archive issue d'une vraie victoire au prologue puis marche jusqu'au chef, au mentor et au dojo ; aucun résultat de formation n'est injecté. La recette d'accessibilité est `scripts/verify-youth-accessibility-v48.mjs`. Le build final 4 valide les six scénarios d’accessibilité : PNG 404 puis reprise et focus, Tab/pause et piège de focus, vrai tactile CDP 390 pixels et commandes de 44 pixels, paysage 640 × 280 et texte à 200 % sur 320 pixels, axe manette tenu puis relâché et déconnexion, puis démonstration sans mouvement automatique lorsque l’OS demande une réduction des mouvements. Le dernier scénario compare les pixels du canvas : ils restent identiques sans demande, changent pendant un lancement manuel puis restent identiques pendant Pause. Rapport : `work/v48/final4-youth-accessibility-qa/report.json`. Aucun contrôleur physique n’a été testé. Les captures mobile et du dojo ont été inspectées visuellement ; le premier échec 404 reste dans `work/v48/youth-accessibility-qa/report.json`.
