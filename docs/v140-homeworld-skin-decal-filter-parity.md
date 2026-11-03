# V140 — Homeworld filtrage anatomique et parité des decals

L'ancien Homeworld plaçait le filtre de teinte cutanée sur l'élément parent `data-homeworld-layer="body"`. CSS applique alors ce filtre **à tous ses enfants**, y compris les pigments personnalisés et les decals V133. L'aperçu animé et le Canvas en chasse filtrent seulement le bitmap anatomique avant d'appliquer les matières custom en couches indépendantes. Les vues ne pouvaient donc pas montrer les mêmes couleurs.

Le correctif V140 retire le filtre de teinte du parent. Il calcule maintenant `gradedFilter = hunterBodyPartColorV62(morphId,partId,HUNTER_SKIN_FILTERS_V114[appearance.skinId])` et l'applique **uniquement** aux `img` de chaque élément anatomique, y compris les découpes de tête compactes V62. Les couches `ChromaticSurfaceV113`, `DecalSurfaceV133`, filet, ceinture, dreads, armures et biomasks conservent leur ordre et leurs filtres propres.

`tests/homeworld-body-grade-decals-v140.test.mjs` vérifie le retrait du filtre parental, la préservation de la grade native Super/Feral, la compatibilité anatomique des corps, et le maintien des calques indépendants. Le test ne constitue pas une certification de texture officielle *Predator: Hunting Grounds* 1:1. Les 1 134 contrôles de captures restent ouverts.
