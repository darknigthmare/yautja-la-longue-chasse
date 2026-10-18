# Fondations V90 : raccord local des corniches

Le contrôle visuel synthétique des Grottes Thermiques a montré une arche
horizontale détachée du bord droit de la plateforme. La capture valide est
`work-local/v90/qa/homeworld-thermal-actual-synthetic.jpg` ; le fichier antérieur
`homeworld-thermal-synthetic.jpg` affichait encore les alluvions méridionales et
ne prouve pas le cadrage des grottes.

Le pont apparent vers Y=900 de la capture est une partie peinte de
`basalt-city-foundation.png`, sur les faces `market:4:1` et `market:5:1`.
Le pattern V81 avait une origine mondiale et répétait son bandeau vertical
tous les 525 pixels projetés. Une deuxième corniche apparaissait donc dans
le corps de la face, environ 130 à 200 unités sous son vrai bord. Le panorama
rendait ce raccord visible ; il ne changeait pas la géométrie.

Chaque face possède désormais une origine locale à son extrémité projetée
la plus haute. Le PNG entier reste à une échelle uniforme, `1050×525`, sans
rotation, cisaillement, nouveau PNG ou modification des pixels. La période
verticale dépasse la hauteur complète de la face : seule une rangée peut
apparaître. La répétition horizontale demeure. Le clipping est toujours le
quadrilatère exact V81 ; le socle sombre existant, la profondeur et le trait
du véritable bord sont conservés.

Ce correctif n'oriente pas le bitmap suivant une arête oblique. Sur les pentes
fortes, le bord peint de l'image est recoupé par le vrai polygone et ne constitue
pas une corniche architecturale parfaitement ajustée. Une face plus haute que
le PNG conserve le socle sombre après sa seule rangée, sans étirer l'image ni
inventer de pixels. Les formations naturelles V85, qui utilisent aussi ce PNG,
restent hors de ce lot ciblé et conservent leur renderer existant.

Aucun sol, collider, escalier, seuil, arrivée, sauvegarde ou accès régional
n'est modifié. Ce décor demeure une adaptation originale compatible avec
l'univers ; aucune fidélité canonique 1:1 ou visite régionale n'est revendiquée.
Les tests ciblés contrôlent la vraie sortie SSR, les ancrages/proportions, les
polygones inchangés et la régression de la corniche basse. Après compilation,
le cadrage synthétique des grottes a été revu dans le navigateur : la face
du marché suit son bord et la corniche basse détachée a disparu. La capture
`work-local/v90/qa/homeworld-thermal-corrected-synthetic.jpg` conserve le même
modèle `(460,3600)`, la même caméra `(-480,692)` et le zoom panorama `×0,45`.
Ce contrôle de composition n'est pas un parcours jouable de campagne.

Le positionnement du motif suit les coordonnées SVG de la face, indépendantes
de la caméra : [spécification SVG 2 des patterns](https://www.w3.org/TR/SVG2/pservers.html#Patterns).
