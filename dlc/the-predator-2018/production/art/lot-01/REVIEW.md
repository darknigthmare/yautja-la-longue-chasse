# Lot 01 — deux sprites candidats, pas une validation 1:1

Deux sorties de génération sont conservées sans modification : `master-01.png` et `master-02.png`. Elles montrent les deux mêmes personnages ; ce ne sont pas quatre personnages uniques.

Deux PNG individuels sont exportés : le Fugitive du premier master et l’Upgrade du second. Le fond possède un vrai canal alpha, vérifié avec Pillow. Les pixels de bruit alpha <=12 sont éliminés et une marge transparente de 24 pixels est ajoutée. Aucun agrandissement artificiel n’est appliqué. Les rectangles de découpe, dimensions, empreintes et pivots provisoires figurent dans `manifest.json`.

Statut : **draft-generated-not-approved**. Les deux silhouettes ont été contrôlées sur fond de vérification de transparence ; aucune superposition plan par plan aux images du film n’a été validée. Le masque, les éléments d’armure et la morphologie restent à corriger après confrontation aux références. Le haut de l’Upgrade du premier master est trop près du bord : cette variante n’est pas retenue pour le sprite individuel.

Il s’agit d’une pose par personnage. Les animations, humains, Predator Dogs, états endommagés, intégration bitmap et fusion HuntCanvas restent à produire. Aucun de ces nouveaux dessins n’est activé automatiquement dans le moteur.
