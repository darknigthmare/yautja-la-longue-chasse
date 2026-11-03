# V155 — profil vertical du parcours interactif réel

Le V154 permet déjà de choisir des unités RTS-U existantes et de se déplacer sur les pixels émergés du véritable atlas V150. La V155 affiche **les altitudes de ces mêmes cases** sur une coupe verticale, sans créer de sommets ou de raccourcis fictifs.

À chaque clic de destination, le profil inclut les cellules parcourues et le chemin prévu. Le marqueur se déplace sur ce profil lorsque l'unité avance. La distance horizontale respecte le rayon sphérique et les variations d'altitude sont conservées en mètres ; l'échelle verticale SVG est volontairement amplifiée pour rendre le profil lisible.

L'export JSON V154 contient `terrainElevationProfileV155` avec tous les sommets, les dénivelés et la position actuelle. Les tests du module pur `tests/planet-traversal-section-v155.test.mjs` refusent les téléportations, les segments marins et les mondes étrangers. Le navigateur V154 contrôle maintenant la continuité du marqueur et l'export associé.

**Ce n'est pas une animation 3D à échelle métrique ni une collision de campagne** : une case de la carte planétaire peut représenter plusieurs dizaines de kilomètres. Les quatre modes de guerre V114, les routes stratégiques et les sauvegardes ne sont pas modifiés.
