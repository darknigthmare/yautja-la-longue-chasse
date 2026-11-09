# Quêtes vivantes — suite des retours et accords

**Code qualifié : `ed9ad613598a48bcff7c5918ee8bf8d49d02e0bc`. Base de reprise : `9dce866a2f9972800e6adfca3e312d38c6aa8540`.** La suite prolonge la PR 132 sans modifier les branches mobilité, DLC ou art. Elle n'est pas annoncée fusionnée ni déployée.

[Classeur complet, 12 feuilles](Yautja_Quetes_Vivantes_Suite_20261109.xlsx) · [Avenant à la bible](../../docs/campagne/QUETES_RETOURS_ET_ACCORDS_20261109.md) · [Reçu des validations](verification.json) · [Reçu XLSX](verification-classeur.json) · [Lot initial conservé](../quetes-vivantes-20261109/README.md).

## Récits ancrés dans les événements enregistrés

Un volet facultatif au poste réel permet de reparler de quatre chasses de terrain archivées. Le joueur choisit son rapport : une ancienne réussite n'est jamais appelée « dernière chasse » lorsque le moteur ne conserve pas la preuve d'une tentative plus récente.

**42 nouvelles répliques** : 24 réponses (quatre rapports × six contacts) et 18 réponses (trois issues du Berceau × six contacts). Les 50 répliques initiales restent inchangées : **92 variantes contextuelles au total**, sans compter les 32 passages de recrutement réécrits séparément. Ce ne sont pas de nouvelles missions.

Le Berceau distingue repli, victoire sans crête et crête rapportée. Seul un retour physique achevé avec présentation explicite au clan autorise ces échanges. L'analyse choisie à l'atelier reste privée, même après rechargement ; les anciens retours sans choix de partage ne deviennent pas publics rétroactivement.

La présence de l'interlocuteur, son affectation, la réserve, le transfert, la pause et l'audience C37 restent respectés. Le lecteur ne crée aucun trophée, soin, événement, marque ou recrutement. Les douze contrats et le schéma de sauvegarde restent inchangés.

## Quatre accords réécrits sans changer leurs règles

- **Brèche** : le gardien veut éprouver le rappel avant la poursuite ; son refus du premier essai sur proie vivante est une exigence de dressage, pas une morale universelle attribuée aux Yautja.
- **Éclisse** : le mécanicien exige de comprendre une commande retrouvée avant son raccordement au navire. Les outils et l'alimentation restent une précaution concrète, pas un rituel inventé.
- **Lance-Fendue** : il demande un point de retour commun, conserve son autonomie et ne gagnera pas les rites individuels du joueur à sa place.
- **Opale** : elle garde sa mémoire et la possibilité de refuser. Ces conditions appartiennent à ce synthétique original, pas à une prétendue loi de toute l'espèce.

Les **32 passages avant/après** sont dans l'onglet Accords. Un test compare tous les autres champs aux définitions antérieures : identités, salles, seuils, options, branches de choix et récompenses sont conservés. La prose ne prétend pas livrer un dressage animé, une réparation jouée ou de nouveaux modèles.

## Vérification exécutée sur ed9ad613

[Run 42589027077, job 129065788633](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42589027077) : toutes les étapes ont réussi. Déclenché par le commit de transport `aedad4cf`, le run vérifie les sources puis publie `ed9ad613` ; le rapport navigateur porte ce dernier checkout explicitement.

- **213 tests réussis, aucun échec ni test ignoré.** Les 29 nouveaux tests sont inclus dans les 213. Les 165 tests locaux forment un sous-ensemble séparé, pas un supplément à additionner.
- Typage complet et lint strict réussis. Relevé courant officiel : **2 208 entrées**, SHA-256 `c0b1c57f1fe584ad7f1c8eea7763a979ce3ab4be4be4124b7aa9b329829e6173`. Les attestations historiques ne sont pas régénérées.
- **169 contrôles navigateur réussis dans huit contextes**, **23 PNG**. Partage de la crête et analyse privée aux formats 1 440 × 1 000, 390 × 844 et 320 × 740 ; repli et victoire sans prélèvement sur desktop. Les six contacts sont exercés pour le retour partagé avec crête.
- Le vrai GameClient joue les déplacements à bord, l'ouverture des conversations, le choix des récits et le rechargement de localStorage. Aucune erreur ni ressource manquante dans le rapport ; ses quinze empreintes de source concordent avec la copie locale livrée.

### Portée des données de test et des captures

Les quatre chasses et les retours du Berceau sont préparés par les reducers de production : campagne adulte, 5 868 marques, aucun compagnon recruté. Ces chasses, le combat de reine, les soins et les recrutements ne sont pas joués dans le navigateur de cette recette. Les tests de modèle couvrent les autres états privés et les états invalides.

Quatre captures ont été ouvertes individuellement : Trace Froide avec crête partagée à 320 px ; Griffe de Fer avec analyse privée à 320 px ; Suture Noire à 390 px ; Griffe de Fer après repli à 1 440 px. Les répliques sélectionnées et leurs indications sont entièrement lisibles. Le panneau est naturellement défilé : le portrait, l'ensemble de la carte et tous les choix ne sont pas nécessairement visibles simultanément. Pas de revendication de revue visuelle des 23 images, de matériel mobile réel, de manette physique ou de certification artistique.

Archive originale Actions **13660553932** : 3 470 559 octets, SHA-256 `07334379e4466a142ced28feeacdcf30d00066b1b43f35c1aa5f2ff128083086`. Rapport de 73 102 octets, SHA-256 `3e391034e3d64ba2e9b8b2bfbe4e57a6224eed6271265107e3f8934f325ca2e2`. Rétention Actions de quatorze jours ; archive également livrée dans la conversation.

Les essais locaux interrompus et l'ancien échec de prose restent distingués : « ancien score » a été remplacé par « ancien récit » sans relâcher le test. Deux essais de régression ont été interrompus par le temps d'exécution de l'outil ; le dernier termine à 165/165. Aucun navigateur local ni build global de production nouveau n'est revendiqué.

## Suivi conservé et enrichi

Le nouveau classeur ajoute Retours, Accords et Suite_Validation aux neuf feuilles initiales. Les 73 chantiers et 118 critères sont conservés, sans remise à zéro des acquis de C37 et sans fausse clôture d'OPS-B05. Les six feuilles de données antérieures conservent leurs valeurs, sauf la note datée de Sources. Les **111 classeurs historiques ont été comparés et sont inchangés** ; le XLSX initial de cette PR est également conservé.

XLSX : **498 931 octets**, SHA-256 `39c2e6488d6b3362a3d575b0ff07afdb9b6bb2dfb38def857c5a2789143a34c4`, blob Git `eccc94e8915f07bdb7b12c4ec5eee77d420a13fd`. Douze feuilles, cinq formules calculées, aucune cellule d'erreur ; CRC vérifiés. Les membres OOXML produits par artifact_tool sont conservés à l'identique ; le conteneur ZIP est normalisé. [Publication et vérification du classeur](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42591564474).

La CI finale conserve les anciens contrôles et ajoute les nouveaux tests et le parcours des récits. Elle reste **en lecture seule**, sans transport distant, auto-commit ou push. Le workflow temporaire de livraison est retiré.

## Restant ouvert

OPS-B04 (escorte physique hangar → soins), B06/B07 (routines et animations), R2-M027 (mentor en visite, intégrité de la crête, nettoyage et audio dédiés), OPS-Q26 et le reste du registre gardent leurs exigences propres. Une discussion ne remplace aucun de ces mécanismes. La mémoire de toutes les tentatives ratées et les relations persistantes ne sont pas ajoutées.

La fidélité vise les références établies de la franchise et les identités du projet ; les paroles, planètes et usages originaux ne deviennent pas des faits canoniques. Aucun nouveau sprite, voix enregistrée, animation ou VFX n'est livré par cette suite.
