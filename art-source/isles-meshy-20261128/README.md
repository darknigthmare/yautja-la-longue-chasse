# The Isles · modèles Meshy du 28 novembre 2026

Huit modèles 3D générés pour Verdant en chasse libre, sur décision du propriétaire du projet (art : « Modèles Meshy »). Les descriptions sont originales et ne reprennent aucun personnage, logo ni insigne existant.

- **Outil** : Meshy CLI 0.4.0. Géométrie en text-to-3d (preview, environ 8 000 triangles), texture en refine 2k sans cartes PBR. Rigging Meshy pour les trois humains, avec les clips de marche et de course fournis.
- **Compte** : celui du propriétaire, par la clé enregistrée dans l'environnement.
- **Crédits consommés** (champ `consumed_credits` des tâches) : 8 × 20 (preview), 8 × 10 (refine) et 3 × 5 (rigging), soit 255.
- **Licence** : les modèles relèvent des conditions du plan Meshy du compte. À vérifier avant une diffusion commerciale.

| Modèle | Rigging | Description (`models.json`) |
| --- | --- | --- |
| braconnier | oui, marche et course | braconnier de la jungle, vêtements olive, gilet de munitions, chapeau de brousse |
| unite-tactique | oui, marche et course | unité tactique moderne, casque, gilet porte-plaques, sans insigne |
| archeologue | oui, marche | archéologue de terrain, chapeau à larges bords, sacoche |
| jaguar | non | jaguar adulte debout |
| chien | non | chien de pistage, harnais sans texte |
| sanglier | non | sanglier à défenses |
| crocodile | non | crocodile de fleuve couché |
| autel | non | autel en pyramide à degrés, couvert de lianes, glyphes inventés |

Chaque dossier contient :
- les réponses des tâches (`task_*.json`) ;
- l'aperçu (`preview.png`) ;
- le modèle texturé (`model.glb`) ;
- pour les humains, `walking_glb.glb` (maillage, squelette et marche) et `running_armature_glb.glb` (clip de course).

`state.json` garde les identifiants des tâches, ce qui évite de relancer un travail déjà payé.

Les fichiers du jeu sont produits par `node scripts/build-isles-models-v1.mjs` :
- textures intégrées réduites à 1024 px en JPEG, géométrie, squelette et animations inchangés ;
- sortie dans `public/game/isles/models/` (6,9 Mo pour les 10 fichiers), avec `manifest.json` ;
- `--check` vérifie que les fichiers publiés correspondent aux sources.
