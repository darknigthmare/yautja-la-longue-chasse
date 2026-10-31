# V126 — PHG 2025–2026, quatre matières originales à valider

**Dernière annonce vérifiée au 30 octobre 2026 :** 28 juillet 2026, épée Yautja disponible gratuitement au niveau 105 ; cette annonce **n'ajoute pas de skin**. Father est sorti le 28 avril 2026 (patch 3.7.0) ; Jotun le 20 janvier 2026 (patch 3.6.0, modification de Feral Default). Oni et Witch datent de 2025. Références : https://store.steampowered.com/app/1556200/Predator_Hunting_Grounds/, https://forum.predator.illfonic.com/t/the-father-predator-joins-the-hunt/37649, https://forum.predator.illfonic.com/t/the-jotun-predator-has-arrived/37412.

Pack local `PHG_V126_Recent_Material_Studies.zip` : 4 études originales Father (armor), Jotun (skin), Oni (armor) et Witch (outfit). Atlas 1024², quatre diffuse 512², PNG, WebP, aperçus et cartes normales/rugosité **approximatives**. Toutes ces créations sont des interprétations graphiques, jamais des UV officiels ni des copies 1:1 certifiées. Father PHG n'est pas le père de Dek (*Badlands*), et Jotun/Oni PHG ne remplacent pas les variantes du film *Killer of Killers*.

### Activation seulement après contrôle des fichiers
```bash
python3 scripts/install-phg-recent-v126.py --bundle /chemin/PHG_V126_Recent_Material_Studies.zip --verify-only
python3 scripts/install-phg-recent-v126.py --bundle /chemin/PHG_V126_Recent_Material_Studies.zip
python3 scripts/install-phg-recent-v126.py --verify-installed
```
Par défaut, `app/game/data/phgRecentV126Installed.json` est vide : les quatre matériaux sont **mentionnés**, mais non sélectionnables jusqu'à installation des fichiers validés et reconstruction du build. Le script vérifie le SHA de la ZIP et de l'atlas, les quatre diffuse, le manifeste et le format des 21 fichiers ; aucun PNG de l'ancien pack V120 n'est écrasé. L'atelier utilise les mêmes masques du chasseur : ne pas recolorer par erreur prothèses, biomasks ou dreadlocks.

**Acceptation artistique future :** capture du menu PHG avec classe + variante sélectionnée, comparaison sous éclairage neutre face/profil/dos, morphologies Yautja, masques, filtres, coutures, absence de dédoublement, et contrôle du rendu en chasse.

## GitHub V126 — atlas effectivement installé

L'atlas WebP 1024×1024 des quatre études est désormais **versionné dans la branche PR #27** (`public/game/assets/v126/phg-recent/atlas.webp`) avec SHA-256 `7a337cad2bd818b77d1ff5d8a67745f7fdca843607f177fee8a788653a09ec05`. Le registre `phgRecentV126Installed.json` active les quatre IDs. Les matériaux sont donc sélectionnables directement dans les ateliers, la prévisualisation et les missions sur cette branche. Les PNG 512², normales et rugosités auxiliaires restent disponibles dans le pack Drive : ils ne sont pas nécessaires au rendu 2D standard, mais peuvent être installés plus tard avec le script. L'inscription dans la PR ne constitue **toujours pas** une certification artistique 1:1.
