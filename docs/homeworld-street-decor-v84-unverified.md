# Homeworld V84 — décors des quais, haltes et préparations

Douze placements extérieurs authored réutilisent quatre nouvelles sources PNG indépendantes à transparence native. Ces douze instances candidates ne sont ni douze images nouvelles ni douze objets déclarés visibles : le provider tardif accepte ou refuse leur placement exact lorsque le jeu charge son monde. Aucun import de ce provider, test, audit, lint, typecheck, build local ou parcours navigateur n’a été exécuté pour en établir le nombre monté.

| Source V84 | Candidats extérieurs authored | Repères de composition |
| --- | --- | --- |
| maintenance-console-right | 3 | Cour technique du Port à 4010/5540 ; contrôle du quai à 3600/5130 ; maintenance des galeries -1A à 4250/2915. |
| care-cabinet-left | 3 | Accueil clanique à 3660/2520 ; arrivées du Port à 6700/5640 ; refuge -1A à 3090/4350. |
| training-rack-left | 3 | Préparation des maîtres à 1890/2110 ; cercle à 2430/1320 ; clans bas -1A à 4070/4770. |
| ritual-brazier-right | 3 | Parvis du Conseil +1 à 3240/1390 ; mémoire à 1370/1490 ; délégations du Port à 5540/5520. |

Le fichier `homeworldStreetDecorPlacementV84.json` conserve les douze identifiants, positions, niveaux, pivots, faces de travail et fonctions. Toutes les instances extérieures gardent l’échelle authored ×1. Les contacts sont les appuis du dessin, ramenés une seule fois au plan de sol ; le rectangle alpha entier n’est pas un bloc de collision. Les meubles présentent leur orientation peinte, sans miroir, rotation ou déformation CSS. Les mesures alpha et SHA des quatre fichiers sont conservées dans `homeworldStreetDecorSourcesV84.json` ; elles ne certifient ni une caméra canonique ni l’accès en jeu.

`homeworldStreetDecorV84.ts` est un provider de sources, géométrie et collision, avec seulement une référence de type au World. `homeworldWorldV77.ts` fournit le terrain, les volumes historiques et les réserves de portes, routes, habitants, services, paliers et raccords. `homeworldStreetDecorMountV84.ts` attend les collections antérieures V78/V80/V83 et leur donne la priorité, y compris leurs faces d’usage et trajets d’extras urbains. Les nouveaux objets gardent leur emplacement exact ; le refus ne cherche pas un offset, ne réduit pas le meuble et ne déplace aucun ancien objet.

Les consoles, meubles de soins et râteliers ont une bande opérateur réservée. Le brasero garde une réserve chaude authored de 72 unités, prise en compte face aux placements et solides existants. Ces réserves limitent l’implantation, **sans devenir des murs invisibles** ; seule l’empreinte de contact du candidat accepté entre dans la collision. Les marges sociales restent des intentions de composition, sans certification corporelle.

`HomeworldWorldSceneV77.tsx` dessine les props acceptés par ce même provider avec projection, niveau, pivot, hauteur, profondeur et culling du renderer existant. Le Hub précharge les quatre sources V84. `homeworldStreetDecorCodexV84.ts` décrit chaque candidat dans une seule fiche : prop de monde si accepté, panneau d’authoring sans empreinte s’il est refusé. Le ContextCodex ajoute ces fiches après les mappers historiques pour préserver les coordonnées du Port. Le nombre réellement visible dépend également de la caméra et du niveau ; il reste non certifié.

La console V84 est aussi réutilisée dans l’intérieur existant `convoy-workshop` à 134/190, échelle ×1, comme une instance supplémentaire de cette source. Le dépôt `convoy-store` réutilise deux sources V83, le rack cargo et le comptoir. Ces trois instances intérieures figurent dans les quarante-cinq instances de mobilier du lot portuaire ; elles n’ajoutent aucun PNG au total de quatre nouvelles sources.

Les quatre dessins sont des créations originales compatibles avec la cité du jeu. Aucun objet officiel nommé, symbole canonique, arme nouvelle, dimension officielle ou reproduction 1:1 n’est affirmé. La flamme reste statique dans le PNG ; aucun geste de maintenance, soin, distribution d’équipement ou rite animé n’est produit. Les services, preuves, progression, accès et sauvegardes restent ceux du jeu.

Ce lot livre l’intégration de sources et les raccords runtime. Il ne certifie pas le nombre monté, l’aspect en jeu, les trajets, performances, corps complet, lore 1:1 ou comportement de production, et ne constitue pas un reçu Git ou Vercel.
