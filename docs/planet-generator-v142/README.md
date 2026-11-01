# V142 — récupérer volontairement ses matériaux sur l'atlas de guerre

La PR #39 possédait déjà une V134 qui enregistre un profil indépendant par **code exact de planète** et une V141 qui applique les matériaux au globe et à l'atlas du générateur. Le panneau de guerre réel (`ClanWarPanelV85`) ouvre pourtant un nouvel `ClanWarAtlasV95` indépendant, sans profil.

## Réparation de continuité

L'atlas autonome dispose maintenant d'un contrôle **« Charger mes matières locales »**, visible uniquement lorsqu'il n'est pas piloté par l'éditeur. Au clic, il lit et valide le sidecar V134 de la planète active, puis le rend à travers le *même* `PlanetMaterialCanvasV101`. Le choix s'applique au globe et au planisphère de guerre, avec exactement les mêmes régions, liquides, distance côtière et chemin PBR/albédo que les vues précédentes.

« Matières natives » retire immédiatement le profil de l'atlas sans toucher au stockage local. Le panneau n'enregistre jamais de préférence, ne crée pas de sauvegarde ni n'ouvre de monde en cache à la place d'un autre. Une absence de profil, une entrée étrangère ou un stockage indisponible entraîne un retour natif sûr et un message clair.

Le moteur `resolveWarAtlasVisualV142` traite les trois cas : profil externe explicitement fourni (éditeur), `null` externe explicite (bouton de reset de l'éditeur) et aucun prop externe (jeu réel, activation locale volontaire). Un profil local ne peut pas traverser vers un autre code de planète.

## QA

Les tests de domaine couvrent l'ordre de priorité, le monde étranger, le profil malformé et l'absence d'écriture des données de guerre. Le parcours Chromium ouvre également un **véritable exercice** après avoir enregistré une apparence depuis le générateur et vérifie le comportement désactivé → actif → désactivé.

Cette fonction ne publie aucune texture du film et ne certifie pas un asset comme reproduction artistique 1:1.
