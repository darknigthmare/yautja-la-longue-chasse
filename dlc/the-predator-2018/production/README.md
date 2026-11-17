# Compléments de production — The Predator (2018)

Les originaux v0.5 et leurs rapports historiques restent à leur place, inchangés. Ce dossier contient les nouveaux contrôles et les nouveaux éléments artistiques, avec leur propre provenance.

## État technique vérifié le 17 novembre 2026

146 contrôles Node passent. Le premier passage navigateur charge 52 scènes mais ne réussit que 13 interactions sur 14 : l’attente fixe de 6,4 secondes est trop courte pour la transition en rendu headless. Une copie du banc de test attend désormais la transition réelle, avec limite de 25 secondes, sans téléportation ni modification du jeu. Le second passage réussit 52/52 chargements, 14/14 interactions et ne relève aucune erreur runtime. Voir `qa-20261117/receipt.json` et `../tools/run_recovery_qa.py`.

Ce contrôle ciblé n’est ni un parcours complet des deux campagnes ni une homologation de fidélité visuelle. Le dépôt de sources n’active pas une intégration HuntCanvas.

## Production artistique

Premier lot prioritaire : deux sprites individuels de base, Fugitive et Upgrade, en pied et orientés vers la droite. Leur présence ne doit être annoncée qu’après enregistrement des PNG et de leurs empreintes dans un manifeste. Une pose de base n’est pas une animation. Aucun dessin n’est approuvé 1:1 par défaut.

Les humains, Predator Dogs, autres états et animations restent listés dans `missing-assets.json`. Les lacunes de récupération des anciennes archives sont distinctes du travail artistique restant.
