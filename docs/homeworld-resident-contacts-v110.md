# Résidents : approche et conversations cohérentes — V110

Les 98 résidents historiques conservent leur identité, leurs chemins et leurs
poses natives. Leurs conversations utilisent maintenant le même critère de
présence physique que les contacts urbains V100 : personne visible, même étage,
rayon strict de 100 unités et approche entière praticable. La recherche V77
historique reste disponible ; le nouveau provider ne modifie aucune de ses
données ni les registres de visite.

Le besoin vient de la mission utilisateur conservée dans
`docs/specifications/homeworld-v81/mission-homeworld-original.txt`, §15
(population, circulation et interactions). Cette correction ne constitue pas
une livraison des gestes BODY, des dialogues ROLE complets ou d’un rite.

## Deux incohérences physiques reproduites

À l’horloge de cité 0, `resident-port-1` se trouve à
7085.727272727273 / 2534.5. L’ancien sélecteur le proposait au joueur placé sur
un sol praticable à 7165.727272727273 / 2534.5, alors que la peinture d’un
bâtiment le cache. Depuis 7116.34194731648 / 2608.4103626009028, il le proposait
également avec une approche physique bloquée. Les deux cas sont refusés par
`homeworldResidentContactReachedV110`.

Un cas indépendant vérifie le segment sans le masque : `resident-port-3`,
horloge 15, reste visible à 6835 / 3344.5, mais le joueur à
6761.089637399097 / 3313.885325410793 ne peut pas l’atteindre directement.
La conversation attend une véritable approche dégagée.

Le segment V109 inclut les empreintes natives des lots ROLE19 à leur position
actuelle. Le test transporte réellement le lot large sur plus de 3000 unités
avec le moteur, le pose près du résident puis le reprend : la présence de
l’obstacle invalide la demande de repère conservée, sa reprise physique la
rend à nouveau possible. Le registre des lots est contrôlé et doit appartenir
à la partie courante.

## Dialogue, pause et repères

Le dialogue porte `{ id, owner }`. L’admission revérifie son propriétaire, la
partie courante, la position, l’étage, l’espace extérieur, l’horloge finie et
l’absence de transit. Les entrées inactives refusent une nouvelle action.
Le Hub peut garder une conversation affichée pendant les réglages en utilisant
un contexte physique actif pour sa sélection et un contexte réellement actif
pour ses commandes ; la pause désactive tous ses contrôles.

Le callback du Hub lie une commande à l’objet du dialogue issu de l’état React ;
les refs sont consultées au moment du clic. Chaque clic relit la position, le
propriétaire, l’horloge, les lots et les découvertes. Un dialogue remplacé, même
avec les mêmes champs, invalide l’ancienne commande. Une petite ref d’admission,
synchronisée en effet de layout, refuse également un ancien callback dès le
changement de propriétaire ou de pause, avant les effets passifs historiques.
Les seuls repères proposés sont les
bâtiments publics existants du quartier déjà enregistré comme visité. Texte
et boutons utilisent la même liste filtrée.

L’ouverture publie aussi l’horloge de simulation exacte avec l’arrêt du joueur.
Le rendu à 30 Hz peut précéder la dernière pose simulée de 32 ms : au bord du
rayon, ce décalage faisait fermer immédiatement une conversation pourtant
valide. Le cas réel du convoyeur à l’horloge 60, avec un rendu précédent à
59.968, reste ouvert après cette synchronisation.

`HomeworldResidentConversationV75` conserve ses trois sujets et les cibles
tactiles existantes. `paused` ou `disabled` désactive les sujets et les boutons
de repère et suspend le texte animé. Les paramètres supplémentaires restent
optionnels pour les consommateurs historiques.

## API d’intégration

Le nouveau modèle exporte les recherches `nearestHomeworldResidentContactV110`
et `homeworldResidentContactReachedV110`, la sélection de dialogue
`homeworldResidentDialogueContactV110`, la liste
`homeworldResidentContactPlacesV110`, la demande pure
`requestHomeworldResidentLandmarkV110` et sa factory à getters. Le Hub appelle
la demande pure depuis un callback lié au dialogue en état ; aucune ref n’est
lue pendant le rendu React. La factory offre le même contrôle d’identité pour
les autres consommateurs qui la créent au moment d’ouvrir leur conversation.

Le contexte reçoit `ownerCreatedAt`, `currentOwnerCreatedAt`, `actor`, `levelId`,
`seconds`, `active`, et les valeurs optionnelles `interiorId`, `inTransit`,
`cargo`. Les recherches d’interaction et les callbacks du Hub doivent construire
ce contexte depuis leurs refs courantes ; le rendu utilise les états courants.
L’ouverture arrête les entrées et la vitesse puis publie simultanément le
dialogue et sa ref. Une sélection devenue distante ou étrangère doit fermer
la fenêtre avec un contrôle d’identité avant de rendre le focus au viewport.

## Vérification du lot

`tests/homeworld-resident-contacts-v110.test.mjs` comprend onze tests sur les
vrais modèles et le rendu React : approche visible, deux reproductions
masquées, obstruction visible, refus de contexte, repères connus, callback
conservé et refs remplacées, vrai portage/pose/reprise d’un lot, commandes
désactivées, vrai callback du Hub avant ses effets passifs et fermeture différée
protégée contre le remplacement du dialogue et horloge exacte à l’ouverture
d’un contact mobile en bord de rayon. Ces tests exécutent des
comportements ; aucune capture navigateur
ni nouvelle animation n’est attestée par ce fichier.

Le lint ciblé du modèle, du composant et de ces tests ne signale aucune erreur
ni avertissement. Les parcours réels du Hub et la validation du build restent
consignés dans la recette globale V110 après intégration.

Les 32 tests d’entrées réelles du Hub passent également après raccord du vrai
module `homeworldTransitionsV110` au bundle de leur fixture VM. Leurs assertions
et scénarios restent inchangés. L’essai initial qui révélait cette liaison
absente est conservé dans `docs/qa/v110-homeworld/integrated-tests-initial.log` ;
la nouvelle sortie complète est
`docs/qa/v110-homeworld-residents/input-runtime-v110.log`. Les régressions
des conversations V75 (deux tests) et des contacts V100 (sept tests) passent
avec leurs sorties séparées dans ce même dossier.
