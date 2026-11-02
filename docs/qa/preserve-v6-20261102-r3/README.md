# Preserve V6 — proportions natives R3, 2 novembre 2026

Le dessin des couverts V6 utilisait une largeur calculée pour la hauteur du collider, puis ajoutait6unités à la hauteur affichée. La mesure réelle du premier couvert Vharuun donnait un crop720×478 dessiné95×69 : les deux échelles différaient d’environ9,4%.

Le renderer calcule maintenant la hauteur depuis la largeur et le vrai ratio du crop natif. Le pied reste ancré à sol+6 par translation verticale. Exemple corrigé : **95×63,0694**, mêmes échelles X/Y, pied inchangé à444. La simulation et les colliders V6 sont intacts ; la branche V1–V5 n’est pas modifiée.

Le nouveau test charge les vrais fichiers avec leurs dimensions décodées, appelle le véritable renderer et contrôle tous ses arguments `drawImage` de couvert : crop, échelle uniforme, pied et absence de mutation de l’état/physique. Les quatre mondes échouaient avant le correctif et passent après. **4/4 nouveaux cas +6/6 parités legacy rejouées =10/10PASS**. Types complets et lint ciblé passent. Les mesures et les deux journaux sont conservés.

**Aucun nouveau build ou parcours navigateur R3 n’est revendiqué.** La recette R2 de27contrôles reste liée à son build `wykGbB5CIbk8_a6MIh9Q6`, avant ce changement de renderer. Le parent vérifiera le runtime combiné compilé R8. Les preuves R1 et R2 restent intactes dans leurs dossiers ; le présent `SOURCE-MANIFEST.json` est le manifeste courant des31fichiers source/support à intégrer.

Aucun nouveau dessin, asset, certificat R7, gel, XLSX ou Git modifié. Le manifeste de163ressources publiques réutilisées est recopié ici pour la consolidation des assets R8, avec leur provenance03cf et leurs empreintes.
