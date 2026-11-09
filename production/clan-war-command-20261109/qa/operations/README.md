# HUD et postes des opérations de clan

Les fichiers `ClanWarOperationsV115.tsx` et `.module.css` organisent désormais
l'écran autour du terrain actif. Le modèle de mission, les archives isolées V2,
les verrous et les coûts V6 ne changent pas.

- Cinq postes explicites : nouveau mandat, renforts, triage, comptes rendus,
  archives et règles. Les textes complets et les commandes de récupération
  restent accessibles dans leurs panneaux.
- Le mandat se prépare en trois étapes : mode, théâtre, détachement. Revenir en
  arrière ou fermer le panneau conserve la sélection sans réserver de mission.
- La liste des équipes possède son propre défilement ; la validation reste
  visible sur les captures de 1 440, 390 et 320 pixels.
- Le HUD de combat utilise les vraies valeurs AP, bastion, alerte, énergie,
  équipes et tenue. Les terrains d'assaut, d'infiltration et RTS précèdent leurs
  commandes détaillées. Aucun acteur masqué n'est révélé.

## Preuve finale

[Reçu final](attempt-7/final-receipt.json) : **19 contrôles natifs réussis**, huit
PNG originaux ouverts, sources composant/overlay/recette identiques avant et
après le parcours. Cette preuve héberge le vrai composant dans une fixture
esbuild avec les règles W3, le vrai stockage local, IndexedDB et Web Locks ;
elle ne certifie pas l'intégration Next/GameClient complète.

La recette vérifie les quatre panneaux secondaires, le confinement du focus,
Échap et son retour au bouton d'origine, les étapes sans débit, un déploiement
RTS réellement enregistré, sa pause par la commande existante, sa reprise après
rechargement sans second débit, l'affichage 390/320 et le clavier furtif.
L'archive reste strictement identique quand on appuie sur les touches tactiques
dans un tiroir ; refermer ce tiroir permet de reprendre les vrais ordres.

Les [45 régressions existantes](unit-1/report.json) ont été exécutées par leurs
vraies entrées Node 22 : 25 archive, 3 V148, 3 V151, 3 V152 et 11 opérations.
Ces cas ne sont pas de nouveaux tests et ne s'ajoutent pas à la suite globale
rejouée par l'intégrateur. Un premier lancement dans le sandbox ne montrait que
cinq enveloppes de processus ; ce résultat n'est pas compté comme 45 cas.
Le lint ciblé final se termine avec zéro avertissement.

## Tentatives conservées

Les tentatives 1 et 2 ont échoué sur une hypothèse de la recette : le composant
présélectionne deux équipes au chargement. Le coût attendu pour une seule équipe
était donc incorrect. La recette sélectionne maintenant explicitement une
équipe et calcule son entretien depuis les règles réelles. Aucun coût du jeu
n'a été modifié pour satisfaire le test.

La tentative 3 mesurait la position du tiroir pendant son animation d'entrée.
La recette attend désormais la fin des animations natives pour mesurer les
limites. La tentative 4 réussissait 15 contrôles sur un état antérieur du HUD ;
les tentatives 5 et 6 réussissaient 19 contrôles avant les dernières finitions de
liste défilante et de priorité du plan d'infiltration. Seule la tentative 7 est
présentée comme la preuve finale de ces fichiers.

Pour rejouer, utiliser Node 22 et un **nouveau** dossier vide via
`COMMAND_OPERATIONS_OUTPUT` avec
`scripts/qa-clan-war-command-operations-20261109.mjs`. Les verrous des dossiers
existants empêchent de remplacer leurs preuves.

Aucune manette physique, validation artistique humaine AAA, campagne complète,
partie réseau ou publication n'est déduite de ces résultats. Les sources et
preuves historiques de `production/p0p1-20261109` n'ont pas été modifiées.
