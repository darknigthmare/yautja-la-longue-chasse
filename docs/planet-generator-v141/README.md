# V141 — une même matière sur les trois vues de la planète

La PR #39 fournit désormais un **profil visuel commun et optionnel** à :
1. la miniature du globe dans « Monde en exploration » ;
2. le globe et le planisphère de **l'atlas stratégique interactif** (`ClanWarAtlasV95`) ;
3. la comparaison géographique et PBR du kit régional.

## Comportement
L'application explicite du profil V134 depuis le kit régional transmet **exactement la même sélection** de matières terrestres, matières côtières, qualité PBR/albédo et rayon physique d'influence au canvas de l'atlas. `ClanWarAtlasV95` utilise le shader et les masques existants `PlanetMaterialCanvasV101` : aucune seconde géographie, texture, ou simulation n'est créée.

Les déplacements de caméra, la projection globe/planisphère, le zoom, les raccourcis clavier, les marqueurs de territoire et les ordres de guerre restent gérés par l'ancien atlas. La couche PBR est purement visuelle, non interactive et ne masque pas les commandes.

Le bouton « Rétablir le globe natif » restaure **aussi l'atlas**. Les autres usages de `ClanWarAtlasV95` dans le jeu n'ont pas de profil (valeur par défaut `null`) : leur rendu et leurs sauvegardes ne changent pas. Un nouveau code de monde réinitialise la personnalisation comme avant. Le fichier JSON V134 demeure un sidecar visuel volontaire, sans insertion dans une sauvegarde de campagne.

## QA
Le parcours Chromium existant vérifie que le même code du monde et le statut du profil sont présents sur l'atlas, puis contrôle le rendu du globe et son passage au planisphère, produit des captures des deux vues et valide la restauration des matériaux natifs.

La correspondance spatiale de la projection est suivie séparément par la fonction V138. **Le raccord graphique n'établit aucune certification artistique 1:1 des sources Predator/AVP**, ni un essai sur GPU mobile physique.
