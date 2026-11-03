# Customisation du chasseur — PHG × Homeworld V113

La branche contient **44 PNG réutilisables** dans `public/game/imports/v85/drive-latest` (12/13 peaux selon archives, dreadlocks, parure et armures). Ils sont des reconstitutions guidées par référence, **pas** des textures officielles, pas des modèles UV pixel-à-pixel. Les trois City Hunter ’97 provisoires restent identifiés et la première version Demon archivée n’est pas sélectionnable.

La personnalisation ajoute des palettes organiques, des ligatures et des laques, chacune persistante sur la sauvegarde avec remise à `null` quand on revient à une teinte unie. Un preset de film est rétrogradé à `custom` si on le modifie ; un legacy save sans ces champs conserve son apparence.

L’**Atelier des parures** du district des Forges devient la **Teinturerie des Forges** sans déplacer son point d’accès. La **Maison des soins** reste un accès existant ; son aile pigmentaire peut accueillir une interface médicale lore-compatible, mais le scénario ne prétend pas qu’un ADN Yautja se reprogramme instantanément. Les pigments corporels resteront préférables aux modifications génétiques non attestées du canon.

Catalogue source complet : https://drive.google.com/drive/folders/1o6sNCx__9dOVg7rqQfJ8vHqztds0T7Wd

Le jeu doit appliquer les textures sur des calques indépendants (peau, dreads, équipement) ; voir les modules `HunterRigPreview`, `HomeworldModularHunter` et `HuntCanvas`.

## Évolution après fusion de V117/V118

Les trois sélecteurs expérimentaux `skinMaterialId`, `dreadMaterialId` et `outfitMaterialId` de la PR #25 étaient un schéma transitoire. Ils sont maintenant **importés** via `migrateLegacyPhgAppearanceV115` dans l'unique `appearance.chromaticsV113`, qui contient quatre canaux : peau, dreadlocks, vêtements et plaques. Ces champs transitoires ne doivent plus être écrits en parallèle par le jeu.

Le moteur commun `ChromaticSurfaceV113` (aperçu et Homeworld) et `chromaticCanvasSourceV113` (chasse) remplacent les anciens composites directs `phgMaterialForV113` pour éviter le double filtrage. Une teinte et un PNG peuvent être utilisés simultanément depuis V117. Le laboratoire de chromatophores, la teinturerie et l'établi du vaisseau sont les mêmes points d'accès physiques, sans transformation d'ADN canonique inventée.

Les 156 PNG présents seulement dans les archives Drive ne sont pas importés par cette fusion. Aucune correspondance UV 1:1 officielle n'est certifiée. Voir `docs/v116-phg-drive-coverage.md` et `docs/v117-phg-pigment-compositing.md`.
