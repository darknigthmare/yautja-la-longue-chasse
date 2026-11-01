# V137 — bibliothèque consultable de 120 formes planétaires réellement utilisables

Le catalogue existant de la recette V115 comprenait 120 vrais profils géographiques : **40 îles, 40 continents et 40 régions**, distribués en 10 motifs et quatre échelles. L'ancienne interface n'affichait que les trois profils sélectionnés et de longues listes déroulantes de 40 éléments.

La nouvelle bibliothèque V137 présente sur demande huit modèles à la fois, avec :
- filtres par famille et par emprise relative ;
- recherche textuelle insensible aux accents (p. ex. « écaille » / « ecaille ») ;
- aperçu SVG de chacun des **vrais rayons utilisés** par V115, sans utiliser d'images de catalogue sans lien avec le moteur ;
- sélection par bouton qui modifie le brouillon V115 ; les anciennes recettes et la planète active ne sont jamais écrasées avant le clic volontaire « Générer l’aperçu » ;
- indication du rayon physique sélectionné en kilomètres. Ce rayon joue sur les distances/surfaces, pas sur l'identité des formes angulaires, conformément au contrat V115.

La bibliothèque n'ajoute pas artificiellement un territoire, une île fictive, un océan ou une frontière politique ; elle rend directement utilisables les 120 variantes existantes. Aucun de ces contours ne prétend reproduire une carte de tournage Predator/AVP 1:1.

## QA
`tests/planet-shape-library-v137.test.mjs` garantit 120 profils paginés sans duplication, recherche accentuée, changement de catégorie, index originaux et filtres bornés. La QA navigateur vérifie la sélection d'un profil, son report dans le brouillon V115 et le maintien du code du monde tant que la nouvelle carte n'a pas été générée.
