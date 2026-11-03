# V141 — Séparation canonique des cosmétiques PHG

Le patch [2.19](https://forum.predator.illfonic.com/t/patch-notes-2-19/20975) établit des catégories indépendantes : deux **teintes d'armure** (Requiem et Nova), huit **teintes de biomask** (Requiem, Nova, Ogre, Instinct, Glypic, Tyrant, Warlord, Paroxysm), une **teinte Waves/Gator de peau**, trois **formes de masque** (Mr Black, City Hunter Rebreather, Saber), et six **Warpaints** (Waves, Sun, Erode, Cortex, Retch, Attend).

Le patch [2.50](https://predator.illfonic.com/news/patch-notes-2-50/) précise que le masque Pirate ne devait pas exposer les menus officiels Warpaint/Scar. Le patch [3.00](https://predator.illfonic.com/news/patch-notes-3-00/) corrige l'application des Warpaints et cicatrices sur certains biomasks, notamment `Scar 1` sur Jungle Hunter '87.

## Modifications vérifiées

- `phgOfficialCosmeticsV141.json` inventorie les noms, restrictions de classes, état de l'art et URLs exactes, sans fusionner deux catégories de même nom. Les peintures d'armure Requiem/Nova **n'utilisent pas** frauduleusement les pixels du biomask V132.
- `maskClassForAppearanceV132` vérifie désormais la **présence exacte** du concept dans `conceptBiomasksV133.json` ; les cinq concepts Alpha-only ne reçoivent pas les peintures Samurai même si leur propriétaire est Samurai. Les concepts inconnus préfixés `concept-v133-` restent rejetés.
- L'atelier indique ce qui est toujours une référence (textures armure Requiem/Nova, modèles canoniques, six Warpaints) plutôt que de déclarer les matières originales 1:1.
- `phg-official-cosmetics-v141.test.mjs` verrouille les noms, les restrictions, la non-confusion des canaux, le filtre Samurai/Alpha et l'absence de fausses UV.

Ces correctifs sont une avancée **technique et documentaire**, non une certification visuelle 1:1. Le suivi V137/V140 conserve l'ensemble des écarts de captures.
