# Vie des villages V69

Les dix communautés régionales disposent chacune de dix-huit habitants supplémentaires et de quatre activités locales. La population totale passe de douze à trente habitants par village, soit trois cents sur les dix régions. Les douze témoins V68 restent les seuls interlocuteurs comptés par leurs objectifs existants ; écouter un nouvel habitant n’invente aucune preuve de chasse ni récompense.

| Région | Activités de la communauté |
| --- | --- |
| Marches de Cendre | Tri des charges, réglage des balises, mémoire des convois, réserves |
| Désert de Verre | Tour des citernes, conduits, transmission des routes, réserve du soir |
| Jungle des Piliers | Ancrages des treuils, charges, écorces, relève des hauteurs |
| Marais Luminescents | Relevé des crues, socles, racines, réserves hors des eaux |
| Chaîne des Orages | Lests, harnais, récits des traversées, relève des guetteurs |
| Côte des Léviathans | Table des marées, amarres, algues, réserve de la corniche |
| Grottes Thermiques | Conduites, outils, matériaux, galerie froide |
| Couronne Froide | Réserves, joints, routes enneigées, abris |
| Ruines de la Première Cité | Fragments, socles, récits, archives |
| Réserve Interdite | Caisses scellées, signaux, observateurs, poste extérieur |

Les routines alternent trajet court et séjour aux deux extrémités. Leurs positions sont dérivées du tick V68, qui reste arrêté pendant les dialogues, la pause, les réglages et un refus de sauvegarde. Le rendu retire les habitants hors du cadre et ordonne les corps selon leurs pieds. Un habitant fait un court pas de courtoisie à proximité du joueur seulement lorsque toute son empreinte reste sur le sol praticable.

Les dix-huit accessoires supplémentaires par village réutilisent les cellules natives mesurées. Ils reposent sur les deux côtés des fondations existantes. Leur empreinte demeure entièrement dans un bâtiment déjà solide et hors du passage peint de sa porte. Aucun nouvel obstacle n’occupe une position auparavant accessible : une sauvegarde V68 n’est ni déplacée ni rejetée à cause de cette densité. Le codex conserve les points d’appui, les routines, les socles, les activités et les cellules originales.

L’accès aux villages ordinaires suit désormais la formation réellement accomplie et le chapitre des Premières Pistes pour les jeunes Unblooded et YoungBlood. Les campagnes indépendantes existantes gardent leur accès. Cette permission ne débloque ni un vaisseau personnel, ni une chasse hors monde, ni le poste de Réserve : celui-ci conserve son prérequis d’enquête du Désert de Verre.

Les corps sont les compositions bitmap natives existantes, déplacées sur des trajets sûrs avec mouvement limité des dreadlocks. Ce travail ne fournit pas une nouvelle planche complète de marche ou de manipulation d’outils. Les activités sont matérialisées par les stations existantes, les aller-retours, les temps de séjour et les conversations ; aucune animation de forge inexistante n’est annoncée. Les communautés demeurent des créations originales compatibles avec le cadre du jeu, sans certification de carte canonique 1:1.

La suite `tests/homeworld-village-life-v69.test.mjs` rejoint physiquement les extrémités des cent quatre-vingts routines et les cent vingt portes ; elle échantillonne les trajets et les pas de courtoisie, vérifie les accessoires et la lecture intacte des checkpoints V68. La recette `scripts/verify-homeworld-villages-v69.mjs` utilise des checkpoints de départ isolés puis des commandes clavier réelles pour contrôler la population, la pause, un dialogue, une porte, la consultation et la sortie. Elle peut cibler trois implantations représentatives puis les dix villages. Les traversées de corniches et les contrats sont des recettes séparées.

La recette `scripts/verify-homeworld-youth-villages-v69.mjs` part d'une formation et de Premières Pistes réellement simulées par leurs intégrateurs de modèle. Ces prérequis ne sont pas annoncés comme joués dans son navigateur. Elle parcourt ensuite la cité, atteint l'armurerie, accepte une demande des Marches, rejoint physiquement la sortie et traverse la corniche jusqu'au guide du village. Elle vérifie le rang Unblooded inchangé, l'absence d'accès au vaisseau personnel, le refus d'une écriture, sa reprise et le rechargement de la même sortie. Aucune position ni preuve n'est injectée après l'entrée dans cette recette.

## Inspection des socles

Trois captures de référence sont conservées dans `docs/v69/qa/village-props-baseline/` : `ash-marches-house-n-0-props.jpg`, `ash-marches-house-n-1-props.jpg` et `ash-marches-interior-open.jpg`. Elles proviennent d'un parcours clavier réel vers deux petites façades des Marches de Cendre puis d'une entrée dans la maison commune. Les deux façades restent opaques et montrent un coffre, des balises et une armoire sur leur plinthe frontale, sans cacher le passage de porte ; la troisième montre le sol, les murs en coupe et les meubles de l'intérieur.

Ces images établissent un placement visuel sur ces deux façades seulement. Elles ne certifient pas à elles seules les cent quatre-vingts accessoires, tous les angles d'occultation ou les dix communautés. Les accessoires V69 sont des équipements de socle et de façade, pas cent quatre-vingts nouveaux obstacles ou objets libres sur les rues. Leurs coordonnées restent dans les emprises solides déjà présentes afin de préserver les anciennes positions sauvegardées. Les captures de référence précèdent la correction des nouvelles peaux cyan et de la disposition du dialogue ; elles ne doivent pas être présentées comme la preuve des couleurs finales. La recette des dix villages doit être rejouée après la compilation de ces corrections.

## Recette locale finale et continuité du jeune chasseur

Le 1 octobre 2026, la reconstruction locale a passé les dix villages : 60 captures, routines actives puis arrêtées par la pause, conversations, deux approches de façade, entrée dans la maison commune, service et sortie, sans erreur JavaScript ou HTTP. Des vues d'activité ou de façade ont été inspectées pour les dix biomes. Ce premier rapport se trouve dans `docs/v69-villages-local-qa.json` ; il suit les corrections des peaux et des dialogues et précède la retouche du seul sélecteur d'apparence jeune.

La recette jeune a révélé une incohérence réelle : l'apparence Unblooded de la cité devenait un adulte masqué dans les régions. La politique visuelle historique de la cité est désormais partagée par `usesHomeworldYouthAppearanceV69`, avec le même bitmap `unblooded-player-v47`, sa taille peinte de 82 et son appui natif mesuré. La cité garde son rendu précédent ; les corniches, villages et intérieurs ne changent plus le corps du jeune. Le preset enregistré, les équipements, le rang et les collisions ne sont pas réécrits. Le rapport précédant cette correction est conservé et signalé dans `docs/v69-youth-villages-before-appearance-fix.json`.

Après la dernière reconstruction, le trajet jeune renforcé passe deux contrôles de progression et durabilité, six captures et cinq assertions d'identité visuelle : cité, corniche, village, intérieur et rechargement. Les coordonnées de peinture vérifient la même stature de 82 et le même appui natif ; le preset sauvegardé demeure identique. Trois villages adultes représentatifs ont été rejoués, avec dix-huit captures, sans erreur navigateur. Leurs rapports sont `docs/v69-youth-villages-local-qa.json` et `docs/v69-villages-appearance-local-qa.json`. Cinq captures finales inspectées sont conservées dans `docs/v69/qa/village-life-final/` ; leurs observations et limites précises sont consignées dans `docs/v69-village-final-visual-inspection.json`. Ces vérifications locales n'annoncent pas une publication ni une certification de chaque angle de décor.
