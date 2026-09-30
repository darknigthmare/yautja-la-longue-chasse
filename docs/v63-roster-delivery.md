# V63 — apparences Hunting Grounds

Elder et Captured de Predator: Hunting Grounds disposent chacun d’un portrait et de deux gardes natives à six poses, une par orientation. Le lot ajoute six PNG et 26 dessins : deux portraits et 24 poses. Les quatre entrées de pose tenue réutilisent ces dessins et ne comptent pas comme quatre animations supplémentaires.

Elder est une variante de Greyback (`elder-phg-official-unmasked-v63`), Captured une variante de Classic 2010 (`captured-phg-official-mask-v63`). Aucun personnage canonique supplémentaire ni capacité exclusive n’est inventé. Les anciens IDs, bitmaps, variantes et choix par défaut sont conservés. Le roster reste à 199 cases. Le classeur possède désormais 199 dossiers reliés sur 205, ce qui est une population distincte des cases du roster.

Les lignes V54 couvertes sont `02_PERSONNAGES!A206:V206` et `A208:V208`, avec `03_MANQUANTS!A11:L11` et `A13:L13`. Restent ouverts Bloodshed, le Super Predator de The Last Hunt, les incarnations Jaguar et Classic 2000, ainsi que le père et le fils de Blood Ties. Les silhouettes anonymes fournies ne leur sont pas attribuées sans preuve.

## Sources et fidélité

- Elder : [article officiel PlayStation du 12 juin 2020](https://blog.playstation.com/2020/06/12/june-free-update-now-live-in-predator-hunting-grounds/) et capture PS4 Pro qu’il contient.
- Captured : [Hunting Party sur PlayStation](https://blog.playstation.com/2021/12/15/predator-hunting-grounds-introduces-the-hunting-party/) et [visuel du DLC officiel Steam](https://store.steampowered.com/app/1847080/Predator_Hunting_Grounds__Hunting_Party_Bundle/).

Les parties visibles guident la morphologie, le masque et les équipements. Les mollets, le dos et certains microdétails cachés sont reconstruits ; le résultat n’est pas certifié 1:1. Le PNG OpenAI et son alpha restent byte-identiques. Les rectangles de lecture suivent la gouttière réellement transparente à y=540, sans redécoupage ni modification des pixels sources. Une première série traversant les limites de cellules a été rejetée et reste documentée.

## Vérifications et limites

41 tests ciblés passent. Le parcours Chrome V63 passe six contrôles : les deux apparences dans les deux sens, les 24 cellules natives, la pause, le choix de variante et deux vues mobiles en paysage avec mouvement réduit. Les huit captures ont été inspectées ; aucun échec JavaScript ou HTTP n’est signalé. Les preuves se trouvent dans `v63-fighters-runtime-qa.json` et `v63-generation/fighters-art.json`.

Ce lot livre uniquement les gardes animées. Marches, attaques, réactions, introductions et résultats de manche propres à ces apparences restent ouverts ; ils utilisent la pose native tenue déclarée et ne constituent pas un kit complet. La QA mobile est une émulation Chromium, pas un appareil physique. La publication et la QA publique sont des étapes séparées, non déduites de ce rapport local.
