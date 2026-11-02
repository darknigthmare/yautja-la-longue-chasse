# Homeworld canonique B2 — revue des 39 captures

Build `OzWVxNAbS8mWbL_Pue9Zg` du commit `719fe0d77e65be5349b76f507938309f56a67619`. Rapport brut : PASS, 249 critères, six familles de parcours, quatre listes d’erreurs vides. Les 1 964 entrées source sont identiques avant et après.

Les 39 PNG ont réellement été ouverts individuellement. Leurs noms, octets et SHA-256 correspondent tous au rapport brut ; aucun PNG supplémentaire ni nom dupliqué. `opened.json` conserve les noms bruts dans l’ordre de `result.json`. Les 29 captures ciblées Forge/Marais ne sont pas comptées ici.

Les seuils examinés présentent un sol sous le joueur et une invite d’entrée ; meubles et citoyens restent sur les surfaces visibles des vues retenues. Les dialogues réels et les vues à 390 px sont lisibles dans leur largeur. Les migrations montrent une acceptation explicite, la conservation sans récompense et une reprise volontaire distincte. Aucun nouveau bloqueur physique n’a été établi par cette revue statique.

Les coutures polygonales, répétitions de faces rocheuses et aplats sombres sous/entre les rives restent perceptibles. Ces images ne suffisent pas à établir un trou physique ni à prononcer une finition artistique complète. Certaines longues boîtes de dialogue ou prévisualisations sont montrées après défilement et ne présentent pas tout leur contenu dans une seule capture.

Quatre incohérences de texte héritées restent ouvertes :

| Texte visible | Capture témoin | Source de donnée |
| --- | --- | --- |
| Cour edge_cluster | place-arrival-marker-native-contact-and-clearance.png | app/game/systems/homeworldAuthoredLotsV81.ts:38 |
| Cour edge_stagger | place-arrival-planter-native-contact-and-clearance.png | app/game/systems/homeworldAuthoredLotsV81.ts:32 |
| Cour single_anchor | place-delegation-planter-native-contact-and-clearance.png | app/game/systems/homeworldAuthoredLotsV81.ts:29 |
| Cour rest_pocket | place-traveler-marker-native-contact-and-clearance.png | app/game/systems/homeworldAuthoredLotsV81.ts:26 |

Source commune : `app/game/systems/homeworldCivicNeighborhoodsV80.ts:16` expose directement `composition.toLowerCase()`. Aucun correctif n’a été appliqué dans ce lot B2.

Cette revue ne constitue pas une admission artistique humaine, une conformité canonique exhaustive ou une clôture globale du Homeworld. Elle ne remplace pas les assertions du pilote : le relecteur n’a effectué aucune interaction navigateur, écriture de sauvegarde ou marche supplémentaire.

Chaque capture et son observation figurent dans `opened-review.json`.
