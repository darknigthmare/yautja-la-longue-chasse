# V122 — Types planétaires versionnés après fusion de la PR #26

**Cause corrigée :** l'ajout de `WarPlanetProceduralV115` dans `WarPlanetV96.procedural` avait laissé des consommateurs V103/V114 typés exclusivement `WarPlanetProceduralV103`. La suite TypeScript remontait 11 erreurs : propriétés `physical`, `shapes`, `materialDiversity` non discriminées, `planetSize` lu dans une fermeture sans capture de version, et monde V115 transmis à un déploiement acceptant uniquement V103.

**Correction sans cast de compatibilité :**
- L'UI du générateur V103 n'affiche les données V115 que si les trois propriétés physiques sont présentes et la version est bien 115.
- Le dossier tactique V114 accepte les graphes V103 ou V115 et capture le `planetSize` d'une recette V115 avant de calculer les kilomètres. Les kilomètres des recettes plus anciennes restent omis, sans estimation inventée.
- `warDeploymentV103` reçoit un monde partageant le contrat public de stratégie commun à V103/V115, sans forcer `version=103`.
- Tests V122 : monde historique V103, monde V115 physique, production de troupes et lancement du front avec code V115.

Ce changement ne modifie ni les codes de génération enregistrés, ni le nombre de territoires ni le coût tactique historique. Il est volontairement indépendant des textures Yautja V120 ; la PR #27 pourra ensuite intégrer la réparation via `main`.
