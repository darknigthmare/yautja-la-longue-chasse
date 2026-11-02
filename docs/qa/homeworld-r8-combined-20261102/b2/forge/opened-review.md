Revue indépendante Forge **R8 B2** : **11 / 11 nouvelles captures réellement ouvertes**, sans réemploi des ouvertures B1 et sans retouche. Le [résultat B2](result.json) porte `PASS_TARGETED_COMPILED_APP`, sept critères réussis et `completeRecipe: false`.

Build vérifié sur cinq réponses HTML : `OzWVxNAbS8mWbL_Pue9Zg`. Commit déclaré par le pilote : `719fe0d77e65be5349b76f507938309f56a67619`. Les six fichiers locaux observés et sept ressources natives restent identiques avant/après. Les octets, SHA256, sources et `opened: true` sont détaillés dans [opened-review.json](opened-review.json).

| Capture B2 ouverte | Constat |
| --- | --- |
| [00-context.png](00-context.png) | Vue B2 de la forge réellement montée dans la cité. Le feu se trouve dans le foyer gauche sous le capot, sans débordement visible sur la lèvre ni sur la porte centrale. |
| [frame-5.png](frame-5.png) | Dessin natif 5 B2 réellement ouvert : silhouette de flamme distincte dans la même ouverture gauche, même socle, cadrage et masque de façade. |
| [frame-0.png](frame-0.png) | Dessin natif 0 B2 réellement ouvert : silhouette de flamme distincte dans la même ouverture gauche, même socle, cadrage et masque de façade. |
| [frame-1.png](frame-1.png) | Dessin natif 1 B2 réellement ouvert : silhouette de flamme distincte dans la même ouverture gauche, même socle, cadrage et masque de façade. |
| [frame-2.png](frame-2.png) | Dessin natif 2 B2 réellement ouvert : silhouette de flamme distincte dans la même ouverture gauche, même socle, cadrage et masque de façade. |
| [frame-3.png](frame-3.png) | Dessin natif 3 B2 réellement ouvert : silhouette de flamme distincte dans la même ouverture gauche, même socle, cadrage et masque de façade. |
| [frame-4.png](frame-4.png) | Dessin natif 4 B2 réellement ouvert : silhouette de flamme distincte dans la même ouverture gauche, même socle, cadrage et masque de façade. |
| [pause.png](pause.png) | La capture B2 présente le voile flou « Exploration en pause ». La frame exacte est difficile à distinguer sur cette image ; le pilote observe la frame 4 inchangée pendant 2000 ms. |
| [reduced-motion.png](reduced-motion.png) | Le dessin 0 est visible dans le foyer gauche ; le brut B2 conserve six lectures successives à 0. La durée ne se déduit pas de cette seule image. |
| [missing-resource-static.png](missing-resource-static.png) | Après le refus effectif de f02, le bâtiment et son ancien foyer orange statique restent visibles. Les langues de flamme ajoutées sont absentes. |
| [missing-facade-no-orphan-fire.png](missing-facade-no-orphan-fire.png) | La façade de la forge manque et aucun feu orphelin n’est visible. Le voile B2 affiche « Préparation de la cité — Animations : 39 / 92 » : état de chargement indisponible, sans préparation complète ou récupération démontrée. |

Les six contours de flamme sont distincts et restent dans le foyer gauche. Capot, lèvre et porte centrale restent lisibles ; enfant et parent conservent le même cadrage et une opacité propre de 1. Le refus de f02 conserve le foyer statique de la façade.

Les quatre échecs réseau volontaires et leurs quatre erreurs console sont conservés bruts et reliés aux refus consommés. Aucune erreur ordinaire, page, Worker, HTTP ou de route n’est déclarée par le brut.

Limites B2 : le gel de pause sur la frame 4 pendant 2000 ms et les six lectures à 0 en réduction de mouvement sont des observations du pilote. La capture de façade refusée reste sous « Préparation de la cité — Animations : 39 / 92 » ; elle montre l’absence de feu orphelin dans cet état, sans prouver récupération ou préparation complète.

Cette preuve ciblée ne certifie ni approche jouée, ni fabrication achevée, ni domaine Homeworld complet, ni admission artistique humaine. Aucun autre pilote n’a été lancé ; aucun code, document historique ou Git n’a été modifié.
