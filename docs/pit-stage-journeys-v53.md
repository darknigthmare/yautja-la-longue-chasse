# THE PIT V53 — huit passages supplémentaires

Ce lot relie seize kits bitmap déjà intégrés. Il prolonge les cinq parcours V42/V52 sans changer leurs identifiants, leur mécanique ou leurs checksums. Ces liens sont des adaptations locales originales pour les duels d’exposition, pas des trajets certifiés par les films, comics ou jeux Predator/AVP.

| Départ → arrivée | Lien thématique proposé | Identifiant persistant |
| --- | --- | --- |
| 010 Forge des Lames Muettes → 040 Fonderie Zéro | Un atelier rituel débouche sur une ligne de fabrication arrêtée. Aucun marteau ne frappe les combattants. | `forge-foundry-passage-v1` |
| 023 Ravin des Planeurs → 026 Nid des Razorwings | Des passerelles de hauteur conduisent à une plate-forme de nids abandonnés. Aucune créature n’est ajoutée. | `ravine-nest-passage-v1` |
| 024 Caverne des Vapeurs → 043 Réacteur de Basalte | Les grottes thermiques et l’installation creusée dans la roche partagent un environnement volcanique. La vapeur reste décorative. | `steam-reactor-passage-v1` |
| 029 Crypte du Disciple → 039 Nécropole des Chasseurs | Une salle de rite se prolonge par un espace funéraire. Aucun trophée ou gain d’honneur n’en découle. | `crypt-necropolis-passage-v1` |
| 045 Galerie des Serments → 076 Atrium des Médiateurs | La galerie civique mène à une place de médiation entre maisons. Aucun tribunal canonique précis n’est revendiqué. | `oath-mediation-passage-v1` |
| 066 Balise de Rabattage → 032 Dorsale du Sandmaw | Une antenne de rabattage domine une crête désertique. Ni l’antenne ni le Sandmaw ne sont des dangers actifs dans ce lot. | `beacon-ridge-passage-v1` |
| 014 Cour des Navigateurs → 079 Salle des Routes Stellaires | La cour de navigation donne accès à une salle de cartographie. Les projections restent hors des collisions. | `navigator-starmap-passage-v1` |
| 050 Porte de l’Audience → 020 Trône Fracturé | Une avant-cour donne sur une salle cérémonielle endommagée. Le lien est une proposition du projet, sans attribution à un clan officiel. | `audience-throne-passage-v1` |

## Sources et limites de fidélité

Les correspondances reprennent les noms et fonctions du catalogue local `app/game/systems/pitArenaCatalogue.ts`, les kits approuvés dans `pitArenaProductionData.generated.json`, le contrat de passage `docs/pit-stage-journey-v42.md` et les limites du chantier décrites dans `docs/v42-remaining-work.md`. Aucune nouvelle conversation privée n’a été récupérée pour ce lot ; aucun texte manquant n’est prétendu retrouvé.

Les images et sous-plans existants sont réemployés sans invention d’un nouveau PNG. Les six plans de chaque kit et le sol neutre restent en place. Les obstacles, ruptures de décor, accessoires signature et dangers télégraphiés inscrits au catalogue restent à produire : un dessin de porte, de machine ou de créature ne constitue pas une interaction physique. Le choix d’un parcours ne modifie pas les indicateurs de complétude des arènes neutres.

## Contrat conservé

Le menu **Options & parcours** propose le duel neutre et **13 parcours** au total. Chaque nouveau parcours sélectionne son départ et précharge les deux kits ; un asset manquant bloque le départ et peut être réessayé. Le changement manuel d’arène désactive le parcours. Les modes CPU, local et entraînement libre peuvent l’activer, tandis que les circuits et exercices imposés gardent leurs règles existantes.

Une projection confirmée au bord gauche ou droit transfère les deux combattants, une fois par manche. Le passage n’ajoute ni dégâts ni ressource, conserve l’ordre et le sol de contact, et ne prime jamais sur un KO ou un timeout. Déchoppe, attaque bloquée, capture seule, attaque manquée et rupture Traque ne déclenchent pas le transfert. Revanche, reset d’entraînement et manche suivante reviennent au premier secteur.

Le moteur reste en version 6 et l’enveloppe replay en version 3. L’état du parcours conserve exactement les quatre clés `id`, `sector`, `transferFrame` et `exitSide`. Une sauvegarde forgée avec un mauvais départ, une clé additionnelle ou un numéro de transfert futur est rejetée. La sérialisation du combat n’est pas présentée comme une nouvelle sauvegarde persistante de campagne : l’exposition reste sans statistiques ni récompenses, avec replay disponible dans la session selon le contrat existant.

Le total devient **13 départs avec un parcours à deux secteurs**, dont **8 nouveaux**. Les **67 autres départs du groupe 1–80** restent sans parcours ; 81–100 restent des duels purs. Ce lot ne signifie donc ni 100 arènes complexes terminées, ni huit environnements entièrement nouveaux, ni des props nouvellement jouables.

## Validation

`tests/pit-stage-journeys-v53.test.mjs` apporte 34 contrôles : inventaire, seize kits réels, passage des deux côtés, neutralité des dégâts, un seul transfert, restauration à chacun des 260 ticks d’un combat enregistré, replay identique, refus des états forgés et resets. Les cinq checksums V6 publiés sont vérifiés explicitement :

| Parcours historique | Checksum, 260 ticks |
| --- | --- |
| Réserves | `47ceba24` |
| Convoi → Dernier Quai | `a1e0d27f` |
| Chantier → cale | `a8a86f8d` |
| Archive → Échos | `780b6ee3` |
| Écluse → Mangrove | `da3fdfa5` |

Les fixtures V4/V5 ne sont pas modifiées. Les suites V53, V52, Réserves et replays ont réussi **67/67 tests**, puis les suites de stockage des replays et d’intégration GameClient **20/20**, soit **87 contrôles ciblés distincts**.

La recette `scripts/verify-pit-stage-journeys-v53.mjs` a réussi **16/16 contrôles navigateur sur le build local V53 final** : panne/reprise de la destination et passage réellement joué au clavier pour chacun des huit liens, avec vérification du libellé, de la scène, des deux positions et de l’absence d’écriture de progression. Les huit captures finales de sélection et les huit captures finales de transfert ont été inspectées : compteur de 13 liaisons, destination affichée correcte, personnages opposés et contact au sol cohérents, HUD lisible. Le navigateur a été fermé à la fin de la recette.

La première passe fonctionnelle avait déjà réussi 16 contrôles, mais l’inspection visuelle avait révélé un ancien libellé figé à « 5 liaisons ». Le compteur a été rendu dynamique et son texte ajouté aux assertions avant la seconde passe. Les preuves des deux builds restent séparées dans `D:/CodexQA/yautja-v53/stage-journeys` et `D:/CodexQA/yautja-v53/stage-journeys-final` (`report.json`, `visual-review.json` et captures). Cette validation locale ne constitue pas une validation de publication ni d’un nouveau portable Windows.
