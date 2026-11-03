# Forge R6 — renderer final

Nouveau contrôle sur le Next de développement 3105 après les changements du WorldScene : 7 contrôles passent, 11 captures originales ouvertes, les trois sources observées restent strictement identiques avant/après. Les six vrais dessins de flamme, la pause UI, le mouvement réduit et les deux situations de ressource défaillante sont conservés.

**Erreurs ordinaires :0. Erreurs injectées :4 observations console et4requêtes échouées**, intégralement présentes dans le brut. Elles proviennent de l’avortement délibéré de la flamme02 et de l’atlas V72 ; il ne s’agit pas de0erreurglobale.

La capture de façade manquante reste une observation pendant chargement, pas une reprise terminée après disponibilité globale. Campagne et arrivée sont une fixture déclarée ; ni trajet joué, ni perte de focus, ni passage derrière façade, ni recette compilée globale ou validation humaine ne sont prétendus.

Brut : `context-run-TzZnh7/result.json`. Sources, SHA et lecture : `forge-context-review-r6.json`. Les11fichiers ouverts avec empreintes sont listés dans `opened-r6.json`. R5 et les essais refusés restent intacts. Aucun fichier produit ou historique n’a été modifié pour cette vérification.
