# V76 — relecture visuelle, 3 octobre 2026

## Statut de cette relecture

**Relecture artistique de la deuxième candidate, pas validation finale de livraison.** Les images ont été ouvertes une par une avec `view_image` depuis les captures du serveur compilé `http://127.0.0.1:4194` (PID 75064). Aucun nouveau navigateur n'a été lancé et aucun fichier de l'application, des scripts, des tests ou des PNG n'a été modifié pour cette relecture.

Cette candidate doit être remplacée après correction d'un brasero historique `brasero-citadel`, dont un coin dépasse le terrain praticable. Le rapport `exterior-decor-local/report.json` échoue sur `exterior-v76-029` : `unavailable` au lieu de `reachable`. Les captures sont donc des preuves artistiques partielles de cette candidate, jamais un PASS global. Elles seront archivées sous `work-local/v76/second-candidate/`. Les anciennes images de `work-local/v76/first-candidate/` ne servent pas à cette relecture. Le nouveau build et le nouveau lot complet de captures doivent être relus avant publication.

## Images effectivement examinées

| Lot | Captures ouvertes | Couverture réelle |
| --- | ---: | --- |
| `angles-local` | 15 | Les six façades obliques, leurs six intérieurs, quai portrait extérieur/intérieur et codex du dépôt |
| `interior-decor-local` | 11 | Quai, atelier, Mémoire, armurerie, admission du Pit, deux résidences ; collision de l'étagère du quai ; approche réelle des parures du Pit ; Mémoire et pause portrait |
| `exterior-decor-local` | 4 | Marché desktop/portrait, terrasse et image d'échec ; lot interrompu, quatre nouvelles familles extérieures pas encore toutes clairement visibles |
| `connections-local` | 7 | Jungle, Cendres, Côte, Orages, Grottes ; seuil et autorisation du Désert en portrait |
| `landscape-local` | 4 | Accotements Jungle desktop/portrait, Orages et Grottes |

Les contrôles automatisés présents lors de la lecture sont PASS pour angles (9 contrôles), intérieurs (16), connexions (15), paysage (15), FAIL pour l'extérieur (3 contrôles terminés). Ces chiffres décrivent cette candidate et ne remplacent pas les nouveaux contrôles après correction.

## Observations artistiques

Les six nouveaux bâtiments présentent réellement un flanc dans leur dessin, avec orientation alternée et sans silhouette de façade artificiellement aplatie. Les parvis suivent l'orientation des seuils. Dans les six vues dédiées, les pieds du jeune se posent sur le sol devant l'ouverture ; le pavage, la balise et l'invite d'entrée restent associés au même accès. Les voisins au premier plan recouvrent correctement une partie des façades éloignées. Au Sanctuaire, cette superposition est dense mais le seuil central reste visible.

La fonction des façades est différenciée : fenêtres techniques cyan du contrôle des quais, silhouette cérémonielle du Mausolée, monumentalité du Sanctuaire, équipements de toit et niches de maintenance de l'atelier, volumes fermés du dépôt, vigie aux fenêtres cyan. La palette commune pierre, métal sombre et éclairage chaud relie ces variantes aux bâtiments conservés.

Dans les intérieurs examinés, le mobilier diagonal ajoute une direction lisible au sol et les étagères hautes restent verticales. Les usages se distinguent par les établis de maintenance, les coffres et jarres du dépôt, les consoles d'archive, les parures du Pit et les zones de repos/repas des résidences. Les nouvelles étagères ne se superposent pas au jeune dans la vue de collision du quai. Le jeune atteint les parures historiques du Pit sans disparaître derrière la nouvelle étagère. Les captures sont cohérentes avec les résultats d'entrée/sortie, mais elles ne prouvent pas à elles seules toutes les collisions possibles.

En portrait, le personnage, la sortie « VERS LA CITÉ », l'invite d'entrée, la carte et les commandes restent visibles. Les grandes façades débordent naturellement du cadrage ; il ne s'agit pas d'une image rognée dans sa propre boîte. La pause montre un bouton de reprise entier et lisible. Le titre long est tronqué dans le bandeau, sans masquer les commandes.

Les liaisons régionales ont un volume visible : arches hautes, supports au sol, pavement menant au seuil et végétation/relief modulaires autour. La Jungle se distingue par une arche organique ; les Grottes par des flancs à ailettes et les fumerolles. Dans les vues examinées, aucun pilier ne ferme visuellement le centre du passage. Le parcours et les transitions relèvent des recettes de navigation, pas d'une image fixe.

## Réserves honnêtes

- Le défaut d'accès au brasero doit être corrigé puis le lot complet doit être rejoué. Le présent rapport ne valide pas l'intégralité des 74 éléments extérieurs.
- Les bâtiments de premier plan deviennent très transparents lorsqu'ils couvrent le jeune. Cela conserve sa visibilité, mais produit encore une silhouette « fantôme », particulièrement marquée au quai en portrait et sur la terrasse. Une transition ou un traitement de toit plus discret améliorerait la finition.
- La canopée du marché est presque transparente lorsque le jeune se trouve dans sa zone d'occlusion. Ces captures vérifient la lisibilité du jeune, mais ne suffisent pas à apprécier nettement toute la forme de cette canopée ; une vue hors emprise est nécessaire au prochain lot.
- Plusieurs pièces de service utilisent une enveloppe murale très proche. Le mobilier et les divisions changent, mais une variation plus poussée de la structure, des matériaux et des murs rendrait les fonctions mieux reconnaissables. Les grandes marges sombres desktop autour des petites résidences restent visibles.
- Les noms de sous-zones au sol sont assez petits sur desktop et certains se superposent visuellement à un pied de meuble ; ils n'empêchent pas l'accès mais ne doivent pas porter seuls une information essentielle.
- L'autorisation portrait du Désert répète le début de la description « Plaques vitrifiées et prédateur fouisseur sensible aux vibrations ». C'est une réserve de texte, pas un blocage de navigation.
- Les vues portrait sont des captures Chrome émulées. Elles ne prouvent pas la consommation mémoire, la fluidité ni la qualité tactile sur un téléphone physique. L'architecture et les lieux sont des créations originales du projet compatibles avec son parti pris Yautja, pas la preuve d'une ville canonique reproduite 1:1.

## Suite obligatoire avant conclusion finale

Relire les nouvelles captures après déplacement du brasero et reconstruire un rapport distinguant clairement : nouvelle candidate compilée, contrôles complets, relecture artistique et publication. Cette relecture ne revendique ni déploiement public V76, ni achèvement des demandes ultérieures des nouvelles conversations ChatGPT.

## Addendum — candidate finale locale du 3 octobre 2026

La source gelée à 02:27:52 UTC passe les deux builds, les contrôles TypeScript/CSS/ESLint et les 2 597 tests sans échec ni omission. Les 16 recettes navigateur ont ensuite été entièrement rejouées sur cette source : toutes PASS. Le parcours extérieur comporte maintenant 12 contrôles et sept captures, avec cinq trajets au clavier réellement accessibles. Le contrôle des 37 intérieurs secondaires passe ses 42 vérifications et 40 captures. Le collecteur compare les 69 empreintes source/test/PNG au gel, sans changement.

Le responsable a ouvert les nouvelles captures du marché desktop/portrait, du banc des terrasses, de la jardinière de la Mémoire, du rack des convois et de la jardinière du rempart, ainsi que les façades du Mausolée, du Sanctuaire et du quai portrait. Les appuis des jardinières et du rack sont visibles et cohérents avec le sol ; leurs silhouettes ne sont ni étirées ni retournées. La caméra suit les parcours effectivement réalisés. Le déplacement de 12 unités du seul brasero historique corrige son appui sans modifier son PNG, son identifiant ou les routines des habitants.

Les réserves artistiques précédentes restent explicites : le fondu du premier plan demeure fort, la canopée du marché n'est pas montrée sous sa forme pleinement opaque dans ces vues, et plusieurs petits intérieurs partagent leur enveloppe. La présence, le décodage et le recadrage visible de la canopée sont contrôlés, sans prétendre que sa silhouette entière a été appréciée hors occlusion. Ces réserves ne bloquent pas les parcours vérifiés. Le rapport de publication séparé sera la seule preuve de la source effectivement déployée et des contrôles publics. Les nouvelles demandes V77 restent distinctes.

## Addendum — vérification publique finale

La production V76 `fffa1105cefc77f3272774161b3a6362ddea15b9` est READY sous l'alias canonique. Les seize recettes publiques passent, ainsi que les 67 comparaisons HTTP/SHA des PNG natifs. Les outils ont été exécutés depuis une archive de cette source précise pour que les modifications V77 en cours ne changent pas les modèles utilisés par le contrôle V76. Le manifeste d'archive et les rapports complets restent conservés.

Le responsable a également ouvert la capture publique `angles-public/convoy-workshop-native-angle.png`. Le seuil oblique, les appuis de façade et le jeune devant l'entrée sont lisibles ; la silhouette transparente au premier plan reste la réserve déjà notée. Cette relecture confirme cet échantillon visuel et ne remplace pas les seize parcours. Le rapport `v76-release-qa.json` distingue la source, GitHub, le déploiement, les contrôles locaux et publics. Il ne valide aucune modification V77.
