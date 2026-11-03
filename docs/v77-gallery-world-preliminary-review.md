# V77 — relecture galerie/faune et cité, 3 octobre 2026

**Relecture préliminaire de captures du candidat 1, pas une validation du candidat 2.** Cinq images ont été réellement ouvertes avec `view_image`. Aucune source applicative ni donnée de placement n'est changée par cette relecture.

## Galerie corrigée

Sources : `work-local/v77/qa/fauna-candidate3/gallery-corrected-and-preserved-variants.png`, `whole-reference-boards.png`, `failure.png` et `report.json`, URL locale 4195.

Les isolés volcanique et cuirassé sont visibles, avec une échelle uniforme et des labels déclarant explicitement la pose fixe, l'absence de clip animé et l'identité biologique non certifiée. Le choix conserve l'ancienne version cuirassée. Le cadrage ne fait pas artificiellement passer une planche de référence pour une animation.

La capture `whole-reference-boards.png` est prématurée : les images lazy ne sont pas encore décodées ; la grande scène est vide et la planche de montures est presque vide. Dans `failure.png`, les deux images entières sont ensuite correctement visibles. Il faut attendre les images visibles réellement complètes/décodées avant d'émettre une preuve de galerie chargée. Le rapport historique reste FAIL, mais l'échec de retour vient du sélecteur QA `/Retour/` suivi de `.first()` : il ciblait le bouton de l'en-tête global derrière la modale, sur lequel le `main` interceptait correctement le clic. Ce n'est pas un blocage du bouton de retour propre à la galerie confirmé par cette preuve. Le runner cible désormais `/^← Retour à la cité/`. Le nouveau résultat final est attendu avant de valider le parcours retour ; aucun ancien FAIL n'est converti en PASS.

## Cité / quai et escalier

Sources : `work-local/v77/qa/world-local/01-port-east-native.jpg` et `failure.jpg`, rapport world-local FAIL sur contrôle de ratio natif. Ces preuves précèdent les corrections de supports/ratios du parent.

Le vaisseau repose sur une aire distincte de la rue, le terminal et le chasseur ont un point d'appui lisible, et la sortie vers les quais apparaît avec une invitation locale. Le prolongement de rue se lit comme un chemin praticable. Les vastes zones de lisière nues restent une réserve esthétique, sans déclarer une collision défectueuse à partir d'une image seule.

Au Conseil, l'escalier et son invitation sont visibles ; la façade à droite, sa porte et ses marches ont une lecture claire. Le grand escalier arrière, la façade de Temple semi-transparente au centre et des props voisins superposés donnent cependant une profondeur/lecture d'étage ambiguë. Le candidat 2 doit être revu après les réglages de stairs et de leurs supports, avant de statuer. Aucun nouveau défaut bloquant de navigation n'est inféré de ces seules captures.

Pas de vue du passeur sur lave disponible dans ce lot : pivot/passager et support des quatre coins ne sont pas visuellement validés par ce rapport. La statuette et les paysages ne sont pas déclarés canoniques 1:1. Cette relecture ne valide ni un build, ni un déploiement, ni l'achèvement du Homeworld entier.

## Candidat 2 compilé — relecture complémentaire sur 4196

Trois images de `work-local/v77/qa/fauna-final-local` et les douze JPG de `work-local/v77/qa/world-final-local` ont ensuite été réellement ouvertes avec `view_image`. Cette section ne remplace pas l'historique du candidat 1. Elle distingue la qualité des images des gates de focus/navigation encore en cours.

Dans `gallery-corrected-and-preserved-variants.png`, les deux isolés sont propres et leur provenance/pose fixe est explicite ; l'ancienne variante reste sélectionnable. Dans `whole-reference-boards.png`, la planche de montures et la scène de caverne sont désormais entièrement visibles, sans faux découpage animé. Le rapport de ce passage est néanmoins **FAIL sur « Actual world keyboard focus »**, sans erreur page ni HTTP ; `failure.png` montre l'intérieur assombri après sortie de galerie. Ce résultat ne confirme pas à lui seul un défaut du jeu : le parent vérifie l'attente/focus du runner. Aucun PASS du retour ou des régions n'est accordé ici avant son passage final. Ces trois images ne constituent pas une certification canonique de l'identité de toutes les espèces.

Images de cité : `01-port-east-native.jpg`, `02-council-flat-lower-landing.jpg`, `03-council-transit-paused.jpg`, `council-upper-existing-frontage.jpg`, `palace-existing-audience-frontage.jpg`, et les sept `level-*.jpg` (acropolis-stair, clan-lift, council-stair, industrial-ramp, lower-gallery-stair, service-ramp, slum-slope).

Le quai garde une séparation claire entre aire du vaisseau et rue ; terminal et jeune ont leurs points d'appui. Le palier bas du Conseil se lit maintenant comme une dalle horizontale avant de monter les marches. Le palier haut est également lisible, et l'image de pause de transit montre l'overlay attendu. Le nouvel escalier du Conseil est le raccord artistiquement le plus abouti de ce lot.

Les six autres raccords apparaissent encore comme des bandes rectangulaires beige unies, souvent avec un trait central, sans relief ni texture de marches/rambarde visible : acropole, ascenseur, ateliers, galeries basses, maintenance et longue descente. La rampe de maintenance est correctement diagonale, mais reste schématique. Les ateliers présentent des props alignés sur la bande. Leurs invitations locales sont présentes ; aucune panne de navigation n'est déduite de la seule image. **Ces raccords peuvent être livrés comme connexions fonctionnelles, mais ne doivent pas être annoncés comme décors artistiquement achevés.**

Deux façades hautes existantes conservent une superposition semi-transparente d'extension de porte/marches devant le volume principal, particulièrement au Bastion et à la Citadelle. Cela évite une occlusion totale du jeune mais laisse la profondeur architecturale ambiguë. Les grandes surfaces pavées et lisières peu meublées restent une réserve de densité. Ce lot n'établit pas que la ville entière est complète, réaliste ou fidèle 1:1.

Aucune capture nouvelle du passeur sur lave n'est incluse dans ces quinze images. Ses pivots et appuis restent à relire sur la preuve finale dédiée, pas seulement dans les métadonnées.
