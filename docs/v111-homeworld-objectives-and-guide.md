# Homeworld V111 — objectifs et guide compact

Le guide arrivé gardait sa grande carte de texte et ses trois commandes sur le petit terrain mobile. V111 affiche d’abord le lieu atteint et la touche d’interaction configurée. Les options de carte et de recalcul restent dans un volet volontaire, avec des cibles de 44 pixels. Une fois ouvert, le guide entier est limité à la hauteur réelle du terrain ; son titre, ses instructions et ses commandes défilent dans un panneau interne. Une hauteur fondée sur la seule fenêtre ne suffit pas lorsque le carnet réduit le terrain. Effacer le trajet reste disponible directement. La notice complète est conservée ; le guide n’exécute jamais l’action indiquée.

Le nouveau composant est `HomeworldRouteGuideV111.tsx` avec son propre module CSS. Les composants V98/V109, leur CSS, les moteurs V110 et leurs preuves publiées restent inchangés. L’Atlas courant branche le composant et le Worker V111. Les attributs de guidage V98/V109 restent présents pour les commandes et la recette ; les attributs V111 distinguent l’affichage compact et son volet. Une cible ou une étape nouvelle remonte un volet fermé.

## Continuation K-17

Le fournisseur V111 vérifie le registre de continuation avec le reçu B de la même sauvegarde. Il projette ensuite la nouvelle étude pour la seule lecture de l’Atlas ; cette vue ne doit jamais être sauvegardée à la place de B. Les repères physiques gardent leurs identifiants, positions et objets existants. Les objectifs de continuation portent des identifiants `objective-continuation-…-v111` distincts des anciens objectifs, afin qu’une ancienne réponse du Worker ne puisse réactiver une étape terminée.

Les phases d’ouverture, choix, réponse et accord renvoient au poste consentant. L’étude active dirige ensuite vers le bord manquant, la comparaison, la reprise et le fragment réellement révélé. Une interruption ordinaire conserve son point exact et le rayon de trois unités. La fin de l’épisode retire l’objectif de continuation, en conservant les objets connus. Les reçus étrangers, futurs, modifiés par rapport à B ou privés du quartier connu ne fournissent pas de nouveaux repères.

## Sortie réellement atteinte

L’entrée latérale de V110 conservait correctement un point libre à 31,5 unités d’une porte occupée, mais son ancien planificateur extérieur repartait encore du centre occupé. V111 lit le checkpoint du même propriétaire, étage et intérieur avant de calculer la première partie extérieure.

La reproduction utilise le dépôt et l’approche de `residence-port-2` préparés par 603 pas du vrai moteur. Le plan V110 est indisponible. Le plan V111 valide d’abord un court départ avec le corps natif et les obstacles actuels, puis reprend les marges de rue ordinaires de V109. Cette exception ne change aucune constante du moteur : ses points sont échantillonnés tous les trois unités, ne dépassent pas 96 unités du point réellement atteint et ne passent jamais à travers un lot, un meuble ou un mur.

Le premier chemin extérieur est également reconnu après la sortie réellement enregistrée. Les empreintes du propriétaire, de la géométrie et de la destination restent celles des autres propositions du Worker. Un déplacement ultérieur de charge invalide ce préfixe. Un ancien checkpoint dont l’ancrage est déjà occupé ne reçoit pas d’égresse supposée : il renvoie au seuil et à la récupération volontaire distincte de V111.

## Vérifications

`tests/homeworld-objectives-v111.test.mjs` couvre onze scénarios de modèle et de rendu React : recommandations historiques, nouvelle approche B→A, consentement, reprise exacte, invalidation après changement d’étape, fragment conservé, refus des reçus invalides, départ latéral et trajet réellement suivi par le moteur sur plus de 2 000 unités, nouvelle prise de charge et affichage compact avec pause/cible périmée.

Les contrôles de modèle et SSR ne certifient pas la taille peinte, le défilement natif ou l’interaction sur téléphone. La recette navigateur V111 doit mesurer le guide entier à 390 pixels de largeur, ouvrir ses options, recalculer avec le vrai Worker et parcourir l’étude dans le jeu compilé.
