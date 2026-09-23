# V47 — Le début du jeu est le prologue

## Source et périmètre

La conversation jeunesse du projet, récupérée localement dans `work/v36/new-world-specs/youth-thread-page-1.json`, est la source du déroulé. Le passage central est `7efc0ab0-c5af-4bea-a1ba-c62bc14676e2`, la correction du titre `1b26a092-3975-4e4c-9443-092965d0fd67` et celle du squelette `328e7d74-8f59-4381-b0d4-6e92e345ba0a`. Les demandes de l’utilisateur priment sur les propositions anciennes des assistants. Le transcript privé n’est pas publié.

Une nouvelle partie commence désormais dans la nurserie, pas dans le vaisseau ni sur Oseris. Le noir initial attend les images décodées puis une confirmation fraîche. La foule, l’entrée dans le cercle et le geste Prêt précèdent un vrai duel non létal. Le maintien de deux secondes peut être remplacé par une pression simple. Les coups de poing, l’esquive, la projection et la lame détachée utilisent les règles du moteur. Le KO gagné déclenche le village construit dans un ancien squelette creux de mille-pattes, puis la lune rouge et le titre exact **Yautja: The Long Hunt**. Aucun HUD de vie ou d’expérience n’est ajouté à cette séquence.

Après une ellipse explicite, l’Unblooded dispose d’une silhouette dédiée et rejoint le chef puis l’instructeur dans la cité. Ces rencontres sont conservées sans offrir de compétences ou d’équipement. Le vaisseau personnel et les activités adultes restent fermés dans cette nouvelle progression avant Blooded. Les anciennes campagnes adultes continuent normalement : aucune jeunesse rétroactive ni rite gratuit.

## Production artistique

Neuf PNG OpenAI sont livrés dans `public/game/prologue/v47/`. Ils comprennent les deux orientations dessinées de chacun des deux Younglings, les trois décors, une lame séparée et le personnage après l’ellipse. Le manifeste utilise 76 dessins sur les 80 cellules sources pour 40 clips courts. Cela ne signifie ni 80 animations complètes ni la finition des movesets adultes de THE PIT.

Les personnages sont de véritables créations juvéniles : proportions, vêtements, courtes dreadlocks et mandibles contrôlés. Une première planche a été rejetée pour une case absente et un visage incohérent ; les marges et les ancrages ont été corrigés et vérifiés. Les décors ont été harmonisés autour d’une seule lune rouge. Les images sont des adaptations originales du projet, pas une certification canonique 1:1. Les prompts, SHA-256, dimensions et limites figurent dans `v47-imagegen-prompts.json` et `v47-art-qa.json`. Aucune API de génération payante externe n’a été utilisée.

## Quatre profils QA simulés

1. Joueur de duel : commandes clavier, maintien interrompu, pause avec touche tenue, vraie victoire sans injection d’état, cinématique et titre ; tactile et manette standard virtuelle.
2. Novice et accessibilité : téléchargement PNG refusé puis récupération, clavier et focus, pause en quittant le combat, texte à 200 %, petit paysage, option Prêt accessible.
3. Sauvegardes et incidents : reprise, slots isolés, dix manuels et deux autos, refus de quota et récupération sans double temps, anciennes parties V7 préservées.
4. Progression et cohérence visuelle : reprise d’une archive issue du duel réellement joué, trajets physiques vers les PNJ, ordre chef puis mentor, absence de faux équipements ou rites, reprise et écran mobile.

Ce sont des profils de tests automatisés et des revues effectuées par les agents, pas quatre testeurs humains externes. Les tests de manette utilisent un périphérique virtuel standard ; aucun matériel physique n’a été certifié.

## Corrections issues de cette passe

- L’adversaire n’avance plus tant que la confirmation ou un axe reste maintenu à l’ouverture du duel ou après une pause.
- Les checkpoints incohérents dans leur chronologie sont refusés.
- Le chargement du chapitre suivant possède une échéance et une reprise contrôlée.
- Les défauts de focus après erreur PNG, sortie clavier du Canvas et course Reprendre/perte de focus sont corrigés.
- Les contrôles du dialogue ne se compriment plus avec le texte agrandi.
- La lame se fixe à la poignée, et une panne au commit final conserve le bouton de réessai même après une perte de focus.
- Le son parental de vaisseau ne joue plus pendant le prologue.
- Les textes de Nouvelle partie correspondent au démarrage réel.
- La composition des habitants rétablit les corps sous les couches de vêtements ; les PNJ ne doivent plus être réduits à des filets flottants.

## Reste à construire

Le corridor d’arrivée détaillé, la salle du trône scénarisée, les exercices complets du dojo, l’acquisition de la première lame et du biomask, le parcours chronométré, les baraquements et la sortie du lendemain ne sont pas terminés. L’accueil actuel est leur point de départ jouable et sauvegardé. Les animations adultes, les 100 arènes entièrement composées et les véhicules restent des chantiers distincts ; cette version ne les déclare pas achevés.

Les résultats définitifs de compilation, tests, quatre recettes et régressions THE PIT sont consignés dans `v47-validation.json`. Les vérifications publiques sont conservées sous `work/v47/` après publication.
