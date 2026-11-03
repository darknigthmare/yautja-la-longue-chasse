# Chasseurs connus — premier lot de dix familles V33

La demande de septembre vise tous les chasseurs connus et dix plaquettes par chasseur. Le roster local ne contient pas exactement cent individus : il conserve 215 designs issus des fiches individuelles, 49 lignes supplémentaires de variantes, archetypes ou recherche, et trois variantes humaines deja demandees (Machiko clan, Machiko Ryushi, Theta). Ces nombres ne certifient pas un total canonique de personnages uniques.

Le manifeste `art-source/v33/known-hunters/production-manifest.json` garde chaque identifiant sans fusion hasardeuse. Il est reconstruit par `node scripts/build-hunter-production-v33.mjs`, verifie par `--check`, et indexe les preuves artistiques et le registre des clips runtime. Une cible, une image generee et un clip accepte sont trois etats differents.

## Dix familles initiales

1. Neutre et respiration.
2. Marche avant.
3. Recul marche.
4. Accroupissement et remontee.
5. Saut et reception.
6. Garde et raccords.
7. Impact et recuperation courte.
8. Frappe legere.
9. Frappe moyenne.
10. Frappe lourde.

Ce premier lot ne constitue **pas un moveset complet**. La discussion retrouvee « Concevoir le DLC » distingue 36 familles corporelles, les normaux debout/bas/aeriens, cinq speciaux, deux supers, projections synchronisees, victimes, armes, projectiles, effets et variantes d'interruption. Son supplement de finishers comprend huit sequences signatures par fiche historique. Les pieces jointes mentionnees dans les messages n'ont pas ete recuperees ; leur contenu integral n'est pas invente.

Les quatre poses initiales par orientation des nouvelles planches sont un echantillonnage a revoir. Il faut ajouter les poses manquantes lorsqu'une transition ou une action le demande, et conserver un fichier supplementaire plutot que comprimer artificiellement toute une animation dans une seule image. Aucun chasseur n'est declare complet dans ce manifeste.

## Fidelite et revue

Chaque production utilise sa presentation de reference identifiee, garde son espece, ses proportions, son equipement et son orientation. Les humains ne recoivent pas une anatomie Yautja. Les profils droite/gauche sont dessines ; le moteur ne transforme pas un miroir en seconde production.

Les romans et identites sans reference visuelle restent des interpretations explicites. Les homonymes et variantes de jeux ne partagent pas automatiquement leurs images. Les mains, attaches des armes, nombre de lames, contacts des pieds, articulations, contours et transitions sont inspectes. Un fond magenta est une cle couleur declaree ; un damier peint est un echec, pas une transparence.

Le lot Berserker et ses corrections ont leur preuve separee dans `art-source/v33/pit/berserker/`. Les deux identites V5 et V23 du projet different : la production V33 conserve V23 de maniere homogene et ne revendique pas une reproduction filmique 1:1. Les images rejetees restent archivees et ne deviennent pas des clips parce que leur fichier existe.
