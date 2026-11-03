# V133 — appliquer les matières au globe principal sans altérer le monde

La prévisualisation V131 n'est plus limitée au panneau de comparaison : bouton explicite **« Appliquer les matières au globe principal »** dans le kit régional V128.

Le générateur transmet les attributions validées au canvas principal `PlanetQuicklook` et `PlanetMaterialCanvasV101`. Le shader V131 est demandé avec ses canaux PBR ; si le GPU ne fournit pas 10 unités, le chemin albédo V129 demeure. Cette opération est **locale et réversible** via « Rétablir le globe natif ».

Le changement d'identité de la planète ou une nouvelle génération remet automatiquement l'apparence à l'état natif ; la carte administrative, les routes, le code de recette, le dossier stratégique et les sauvegardes de guerre sont indépendants de ce seul état de présentation.

Le script navigateur V128 vérifie désormais que l'application modifie les vrais pixels du globe principal, que la restauration fonctionne et que `data-preview-planet-code` ne change pas.

Limite volontaire : pour sauvegarder une personnalisation régionale au-delà de cette session, utiliser les fonctions d'export et d'import JSON V128. Une écriture automatique dans la sauvegarde du jeu doit recevoir son propre schéma de version et des migrations testées avant toute intégration canonique.
