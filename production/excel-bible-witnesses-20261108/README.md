# Audience C-37 — suite Excel et bible du 8 novembre 2026

Cette tranche poursuit le lot local `5d0c8d9202c15c1b15c2b613a779d0f2877c0406`,
publié sans changement d’arbre dans la [PR #128](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/128).
Elle traite le critère **OPS-B03** : comparer les marques et la télémétrie,
puis faire une restitution motivée devant deux témoins. La source du critère
reste [operations-production.json](../clan-ship-20261104/operations-production.json),
complétée par la section 12.3 de la spécification du Clan Ship.

## Parcours livré

Le joueur conserve la première partie de l’enquête C-37 : examen du support,
relevé de chasse, relevé de transfert et témoignage de Balafre de Cendre.
Après ces preuves, le parcours proposé dans le jeu prépare une audience :

1. Inviter **Balafre de Cendre** en personne à son poste disponible.
2. Confirmer la réunion avec **Trace Froide** à son propre poste.
3. Rejoindre la **galerie des trophées**, où les deux témoins disponibles
   sont représentés simultanément, avec leurs identités graphiques habituelles.
4. Comparer et consigner les trois passages du relevé C-37 dans leur ordre.
5. Proposer l’une des quatre conclusions existantes. Les deux propositions
   non étayées renvoient au relevé à relire. Une proposition étayée est
   présentée dans la galerie, puis la réponse finale y clôture l’audience.

La prise de rendez-vous utilise une transition de scène annoncée après les
deux invitations. Aucun trajet de PNJ ni cycle de marche supplémentaire n’est
revendiqué. Pendant l’audience, leurs avatars de poste sont masqués ; les
quartiers déjà installés restent présents. La clôture rend les avatars à
leurs postes habituels.

La présence ne vaut pas recrutement : les conditions du personnage et son
affectation existante restent nécessaires. Une réserve, des soins, une
suspension ou une affectation sur le vaisseau personnel ne produisent pas
un témoin à distance. Une indisponibilité ultérieure empêche la restitution,
sans effacer les invitations et observations déjà enregistrées.

## Relecture des traces

La télémétrie présente les faits déjà établis par les deux relevés du dossier :

| Passage | Observation | Source dans le dossier |
| --- | --- | --- |
| Prélèvement | La strie B-17 existe avant la ligature. | C-37/01 |
| Mise en coffre | T-04 est ajoutée pour le transport ; B-17 demeure dessous. | C-37/02 |
| Retour | Les deux traces appartiennent au même objet C-37 et à deux actes distincts. | Comparaison C-37/01 et C-37/02 |

Le lecteur offre des étapes sélectionnables et une lecture automatique que
le joueur peut mettre en pause. La lecture n’enregistre aucune preuve à elle
seule : chaque observation passe par une action de campagne, dans l’ordre,
à portée du support. Les entrées restent utilisables avec mouvement réduit.
La lecture s’arrête lorsque la page perd le focus ou devient masquée.

Cette relecture illustre un dossier original du jeu. Elle ne constitue pas
une nouvelle technologie canonique de la franchise ni un capteur en direct.
Les inscriptions sont dessinées en SVG afin de conserver leur exactitude.
Les acteurs réemploient les mêmes sprites individuels statiques que leurs
postes ; aucune nouvelle image, animation de personnage ou validation
artistique humaine n’est déclarée dans cette tranche.

## Sauvegarde et récompense

Le journal optionnel `clanShipTrophyHearing`, version 1, contient au plus
sept événements : deux invitations, trois observations, une conclusion et
une réponse finale. Le journal est lié au propriétaire de la campagne.
Chaque événement conserve sa révision, l’emplacement observé et une référence
à la révision du dossier d’incident qui justifie l’action.

Le format d’incidents V2 reste inchangé. Les anciens dossiers sans journal
d’audience, y compris ceux déjà clôturés ou ayant déjà reçu un verdict,
conservent leur procédure historique. Ils ne deviennent pas rétroactivement
des audiences communes. Les entrées étrangères, les versions futures,
les révisions périmées, les observations hors de portée et les journaux
incohérents sont refusés par les frontières de sauvegarde concernées.

La décision d’incident et la présence des témoins sont écrites ensemble par
le propriétaire de campagne existant, `persistSocialProgress`. La clôture
conserve la gratification de **35 marques, une seule fois**. Une invitation
ou un échantillon n’accorde ni marques, ni rang, ni compagnon, ni trophée.
Une écriture non confirmée ne fait pas avancer le dossier affiché.

## Commandes

Le bouton **Dossiers du bord**, la touche **I** et le bouton **Y** de la
manette ouvrent le panneau. Lorsque ce panneau reçoit le focus, les commandes
de déplacement du pont sont suspendues ; le lecteur et les choix utilisent
la navigation de menu existante. **B** ou **Échap** rend le focus au pont.
Une manette maintenue lors d’un changement de contexte doit revenir au
neutre avant de déclencher une nouvelle action.

Ces raccords de commande sont testés au niveau du code et du modèle d’entrée.
La recette sur manette physique reste distincte.

## Vérification et suivi

Le [rapport local initial](verification.json) relie les commandes exécutées,
les résultats et les empreintes du commit `ff112b4`. Les tests d’audience vérifient la
présence, les réaffectations, les reprises, les anciens dossiers et les échecs
d’écriture. Les tests de présentation exécutent les vrais composants React
en rendu serveur ; ils vérifient les éléments présents, pas leur apparence
dans un navigateur hydraté.

La nouvelle tentative locale Chromium est conservée dans
[qa/browser/launch-probe.json](qa/browser/launch-probe.json) : le processus
échoue avant toute page avec un refus `EPERM` de création de socket Unix.
La recette native `scripts/qa-clan-trophy-hearing-browser-20261108.mjs`
utilise le vrai GameClient et une campagne de départ déclarée, préparée par
les reducers. Les prérequis de cette fixture ne sont pas présentés comme
des chasses jouées dans le navigateur. Les éventuels résultats GitHub Actions
doivent être évalués sur la révision exacte qui les a exécutés.

Les corrections révélées par les contrôles GitHub et leurs validations sont
suivies dans le [reçu des correctifs CI](qa/ci-fixes/verification.json).
Ce reçu complète la photographie locale initiale et documente la régénération
du relevé courant après modification des recettes concernées.

Le [reçu d’intégration du banc spatial](qa/spatial-host/verification.json)
documente ensuite le passage du seul hôte photographique à Vite/React compilé
pour la production. Les 152 tests ciblés repassent dans l’arbre de l’audience ;
les sources du jeu, les critères de capture et l’inventaire courant sont
conservés. Son effet sur le délai natif doit être mesuré par la CI de la
nouvelle tête publiée. Le [diagnostic du banc](../qa/evidence/spatial-host-production-20261108/README.md)
conserve les échecs antérieurs et les limites de cette correction.

La [correction du focus des gantelets](../qa/evidence/gauntlet-focus-20261108/README.md)
traite ensuite une promesse non attendue dans une autre recette navigateur :
les contrôles d'interface réussissaient, puis le focus rejetait à la fermeture.
L'appel est désormais attendu avant la touche Entrée. Son reçu distingue
la vérification locale de la future exécution native sur la tête publiée.

La [recette native de l’audience sur `bdc2b4af`](qa/native-c37-bdc/inspection.json)
a ensuite réussi ses **27 contrôles**, neuf dans chacun des formats 1440 × 1000,
390 × 844 et 320 × 740. Ses six captures ont été inspectées ; le reçu conserve
les limites de cadrage mobile, les toasts et la portée des interactions.
Cette preuve est attachée à cette révision exacte, avec mouvement réduit et
sélection manuelle des observations. Elle ne valide ni une manette physique,
ni la lecture automatique de la télémétrie, ni une campagne intégrale.

La [correction commune du démarrage planétaire](../qa/evidence/arrival-startup-20261108/README.md)
traite ensuite une course entre fin du préchargement et ancien callback
d’animation. Elle modifie cette scène commune, sans changer les quatorze
sources applicatives de l’audience. Le relevé courant a donc été régénéré ;
les gels historiques et les preuves précédentes gardent leurs octets et
leurs dates. Les contrôles complets restent requis sur la nouvelle tête.

Le complément de suivi se trouve dans
[Yautja_Audience_C37_20261108.xlsx](suivi/Yautja_Audience_C37_20261108.xlsx).
Il conserve séparément l’implémentation, les tests de logique, le rendu serveur,
la recette navigateur et la revue artistique. Les 108 classeurs d’origine,
le suivi consolidé et le suivi de suite précédents restent inchangés.
Les qualifications de ce classeur correspondent au rapport local initial ;
les résultats GitHub ultérieurs restent datés dans leurs propres reçus.

Le [contrôle du classeur](suivi/verification-classeur.json) atteste les deux
feuilles, les 12 critères, les formules recalculées et les cinq rendus inspectés.
Une lecture XML indépendante a comparé 866 cellules et les empreintes des
108 classeurs ainsi que des 124 fichiers des deux lots précédents. Le suivi
conserve **zéro parcours navigateur validé** et **zéro critère entièrement
clôturé** ; les résultats CI ultérieurs restent dans leurs reçus séparés.

## Limites et autres chantiers

Le parcours de restitution commune et la relecture des traces sont raccordés.
La clôture globale de production d’OPS-B03 reste conditionnée aux recettes
de présentation et de périphériques indiquées dans le suivi.
Cette tranche ne clôture ni **OPS-B04** (escorte d’un groupe du hangar aux soins),
ni **R2-M027** (compléments du retour du Berceau), ni la recette globale
**OPS-Q26**. Les suites parallèles de ces chantiers doivent conserver leurs
propres preuves et être rapprochées avant toute qualification globale.
