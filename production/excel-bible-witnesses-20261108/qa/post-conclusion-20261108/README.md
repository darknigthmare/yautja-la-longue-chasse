# C37-07 — reprise après clôture, 8 novembre 2026

Ce complément étend la recette
[`qa-clan-trophy-hearing-browser-20261108.mjs`](../../../../scripts/qa-clan-trophy-hearing-browser-20261108.mjs).
La recette précédente rechargeait après les trois observations, avant le verdict.
Le nouveau segment reprend la sauvegarde réellement clôturée par le navigateur,
après son unique gain de 35 marques. Il ne prépare aucun acquittement dans la
fixture et ne modifie ni les sources du jeu, ni les ressources, ni les workflows.

## Contrat de la recette

Dans chacun des formats 1440 × 1000, 390 × 844 et 320 × 740, la recette doit :

1. Recharger le vrai `GameClient` après clôture et retrouver le dossier `completed`.
   Les journaux `clanShipTrophyHearing` et `clanShipIncidents` ainsi que le solde
   doivent être identiques à ceux de la clôture. Le reste de la sauvegarde n'est
   pas figé : la navigation peut légitimement modifier sa position et sa date.
2. Fermer puis rouvrir le dossier avec ses commandes réelles. L'acquittement doit
   être absent, y compris des interactions de scène, et aucun gain supplémentaire
   ne doit apparaître. Aucun bouton supprimé n'est recréé pour ce contrôle.
3. Constater, dans la galerie elle-même, la plaque `paired-roles` résolue et
   l'absence des témoins d'audience et de leur projection.
4. Marcher par la navigation existante jusqu'à l'entraînement puis aux archives.
   Balafre de Cendre et Trace Froide doivent être rendus à leurs postes historiques,
   chacun sous son identité graphique native, sans changement des deux journaux
   ou du solde après ces trajets.

## Captures des postes

Les ancres `[data-clan-crew]` mesurent volontairement zéro sur zéro. Le contrôle
porte donc sur le vrai PNG du personnage et son libellé. L'image doit être décodée,
son identité unique et sa source native conservée. Le dossier est fermé ; le toast
applicatif doit disparaître naturellement avant la capture.

Seul le viewport de la scène est amené dans la page par défilement. La caméra du
jeu, les acteurs et les styles ne sont pas modifiés. Les rectangles du sprite et
du libellé doivent être intégralement contenus dans le monde et le viewport du
jeu, lui-même contenu dans la fenêtre. La capture du viewport conserve la scène
entière ; les mêmes mesures doivent être présentes après la capture. Le reçu
conserve ces rectangles, les dimensions natives et le chemin de chaque PNG.

La recette ajoute cinq contrôles par format aux neuf contrôles antérieurs et
deux captures de postes par format aux six captures initiales. L'empreinte du
script de recette est également enregistrée parmi les sources du rapport.
Ces sorties attendues ne constituent pas un résultat d'exécution.

## Qualification et limites

Une qualification native exige le rapport de la nouvelle exécution CI, son commit
exact et l'inspection effective des images produites. Les rectangles et le décodage
prouvent le cadrage technique ; ils ne prouvent pas l'absence d'occultation ni une
validation artistique. Une erreur de chargement, d'état ou de cadrage fait échouer
la recette, sans délai arbitraire, substitution d'image ou assouplissement.

Ce segment vérifie la reprise et la relecture sans nouveau gain, pas un second
acquittement navigateur : l'action ne doit justement plus être proposée. Le refus
d'une commande répétée reste couvert par les tests de domaine existants.

La fixture conserve ses prérequis de campagne synthétiques déclarés. Elle utilise
les postes historiques, pas les quartiers de résidents réaffectés. Les contextes
gardent le mouvement réduit, la souris ou le tactile émulé ; ce complément ne
qualifie ni l'autoplay, ni une manette physique, ni une campagne intégrale.

Le classeur initial et les reçus antérieurs restent inchangés. Ils ne reçoivent
aucun résultat rétroactif. Ce complément ne clôture pas globalement OPS-B03 ou
OPS-Q26 et ne reprend pas les chantiers parallèles OPS-B04 ou R2-M027.
