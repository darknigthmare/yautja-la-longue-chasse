# Registre des compagnons V56 — recette et revue

**PASS**, build local V56 du 30 septembre 2026, `http://127.0.0.1:4175`.

La recette `scripts/verify-companion-catalogue-v56.mjs` a été exécutée par l’agent principal dans un contexte éphémère avec la fixture de campagne synthétique existante. Ce sous-agent n’a injecté aucune donnée dans l’IAB et a inspecté indépendamment les quatre captures produites.

|Contrôle|Preuve|
|---|---|
|Onze fiches sélectionnées|11 sur desktop, 11 sur mobile portrait et 11 sur mobile paysage|
|Onze découpes et onze originaux|HTTP 200, dimensions attendues, SHA-256 exacts|
|Clavier|Activation Entrée, focus maintenu et anneau visible|
|Responsive|1280 × 900, 390 × 844 et 844 × 390 ; pas de débordement horizontal sur mobile|
|Sauvegarde|Trois clés locales inchangées octet pour octet du pont au retour au pont|
|Erreurs|Aucune erreur JavaScript ni réponse HTTP en échec|
|Revue indépendante|Quatre captures vues ; silhouettes complètes, fonds transparents, texte et sélection lisibles|

Rapport détaillé : `docs/v56-companion-catalogue-qa.json`. Captures : `work-local/v56/qa/companion-catalogue/01-desktop-preddog.png`, `02-desktop-first-companion.png`, `03-responsive-390.png`, `03-responsive-844.png`.

La consultation n’ajoute ni compagnon recruté, ni cabine, ni occupant, ni progression. Les dessins restent onze poses fixes ; aucune animation native, mission de recrutement ou fidélité cinéma 1:1 n’est certifiée. Aucun correctif bloquant n’est nécessaire pour ce registre. Les trois profils humanoïdes du pack et le chien de Tracker ont des recettes distinctes.
