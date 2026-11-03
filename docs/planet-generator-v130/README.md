# V130 — 16 nouvelles variantes de matière de sol et de milieu

**Suite de la PR #39** sans PR concurrente. Les 32 matières V125 et leurs pixels restent identiques. Les 16 ajouts (quatre par type de sol/milieu terrestre ou extraterrestre) forment un catalogue de **48 sources** indépendantes.

Nouveaux sols : éboulis granitique, polygones de sel, limon de mangrove, moraine sombre, cryoverre étoilé, ferrosphères sporifères, corail céramique, dunes fossiles ambrées.

Nouveaux milieux : lagon turquoise, eau de fonte glaciaire, marée de mangrove, estuaire saumâtre, miroir cryohydrocarboné, écume acide violette, magma vitrifiant, marée métallofluide.

## Technique

Les nouvelles sources sont des **variantes procédurales originales** de morphologies V125 : décalage de graine, nouvelle palette, rugosité et émission. Cinq canaux sont exportables (albédo, hauteur, normale, rugosité, émission). Leur aspect n'est pas une copie de ressources officielles Predator/AVP et ne constitue pas une validation visuelle 1:1.

Les listes de compatibilité V128 proposent ces variantes uniquement dans des biomes/milieux cohérents. Les recommandations automatiques antérieures restent fondées sur les anciennes 32 matières et les JSON V128 valides sont toujours acceptés. Les zones sans liquide ne reçoivent aucun océan artificiel. Le globe V129 affiche les sols régionaux au canal albédo ; la projection régionale des liquides et les shaders PBR complets restent à développer.

## Vérification

`tests/planet-extra-materials-v130.test.mjs` contrôle le décompte, l'identité des sorties V125, les cinq canaux, la sélection indépendante et les contraintes de biome. La QA navigateur V128 vérifie les 48 options dans le générateur. CI via `.github/workflows/planet-v114.yml`.
