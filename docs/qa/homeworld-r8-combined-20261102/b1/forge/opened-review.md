Revue indépendante Forge R8 B1 : **11 / 11 captures réellement ouvertes**, sans retouche. Le [brut exécuté](result.json) indique **PASS_TARGETED_COMPILED_APP**, sept critères réussis, `completeRecipe: false`.

Build HTML vérifié sur cinq réponses : `wUnrV1ggo6EZPYklVbGCp`. Commit déclaré par le pilote : `a83d23911ad4b5370494de0ca0bb025bd1d89449`. Les six fichiers locaux surveillés et sept ressources natives restent identiques avant/après.

| Capture ouverte | Constat |
| --- | --- |
| [00-context.png](00-context.png) | La forge deep-forge est réellement présente dans la cité. Le feu tient dans le foyer gauche de la façade ; aucun débordement visible sur le capot, la lèvre ou la porte centrale. |
| [frame-3.png](frame-3.png) | Dessin natif 3 réellement ouvert : autre forme de langue et de cœur lumineux, sans débordement hors du foyer. |
| [frame-4.png](frame-4.png) | Dessin natif 4 réellement ouvert : variation visible de la silhouette de flamme dans la même ouverture. |
| [frame-5.png](frame-5.png) | Dessin natif 5 réellement ouvert : sixième forme retenue dans le foyer, même parent et même masque. |
| [frame-0.png](frame-0.png) | Dessin natif 0 réellement ouvert : contour de flamme distinct, ancré dans le même foyer et le même cadrage de façade. |
| [frame-1.png](frame-1.png) | Dessin natif 1 réellement ouvert : variation visible des langues de feu dans la même ouverture ; socle, lèvre et masque conservés. |
| [frame-2.png](frame-2.png) | Dessin natif 2 réellement ouvert : contour distinct de la flamme ; la façade et le foyer restent alignés. |
| [pause.png](pause.png) | Le dialogue « Exploration en pause » est visible avec son voile flou natif. Cette image seule ne permet pas de distinguer précisément la frame ; le brut observe la frame 2 inchangée pendant 2000 ms. |
| [reduced-motion.png](reduced-motion.png) | Le dessin 0 est visible dans le foyer. Les six lectures brutes successives restent sur 0 ; une capture isolée ne prouve pas cette stabilité temporelle. |
| [missing-resource-static.png](missing-resource-static.png) | Après le refus réel de la frame f02, la façade existante et son ancien foyer orange statique restent visibles. Les langues animées ajoutées sont absentes. |
| [missing-facade-no-orphan-fire.png](missing-facade-no-orphan-fire.png) | Aucun feu orphelin visible ; la forge manque derrière le voile « Préparation de la cité — Animations : 20 / 92 ». Il s’agit du contexte de chargement indisponible déclaré, pas d’une préparation complète ni d’une récupération démontrée. |

Les six dessins présentent des silhouettes de flamme distinctes dans le foyer gauche. Le masque conserve le capot et la lèvre au premier plan. Parent et enfant mesurent environ 546,637 × 538,228 pixels, avec une opacité propre de 1. Les empreintes complètes et `opened: true` figurent pour chaque capture dans [opened-review.json](opened-review.json).

Les quatre refus réseau volontaires et leurs quatre erreurs console restent bruts. Le classement du pilote les relie aux refus effectivement consommés ; aucune erreur ordinaire, page, Worker, HTTP ou de route n’est signalée.

La capture de pause est voilée et floue ; le gel de la frame 2 repose sur les lectures pendant 2000 ms. La réduction de mouvement reste sur 0 dans six lectures. Le refus de façade laisse « Préparation de la cité — Animations : 20 / 92 » : absence de feu orphelin dans ce contexte de chargement, sans récupération ou préparation complète démontrée.

Cette revue porte sur un emplacement initial déclaré et une réutilisation de six sources natives. Elle ne certifie ni trajet d’approche joué, ni fabrication achevée, ni domaine Homeworld complet, ni admission artistique humaine. Aucun autre pilote n’a été lancé ; aucun code ou document historique n’a été modifié.
