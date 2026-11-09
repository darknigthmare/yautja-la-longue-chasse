# DLC Predator: Badlands — PR #121

## État réel

La **v0.1 d'origine est entièrement récupérée dans le paquet local** : 43 fichiers, 18 SVG et 7 PNG, avec ses 42 empreintes SHA-256 vérifiées. Les 35 fichiers textuels/SVG précédemment importés restent inchangés dans GitHub.

La **v0.2 est reconstruite**, pas retrouvée : ses sources, son lanceur modulaire, ses tests et son outil de construction sont ajoutés à cette PR. Elle contient 69 scènes (25 Weyland-Yutani / 44 Dek), dont 23 raccords de gameplay explicitement non canoniques. Voir `v0.2.0/README.md`.

**L'import de tous les fichiers dans GitHub reste incomplet.** Les 7 PNG historiques, les 6 nouvelles captures, l'archive ZIP originale et les deux HTML standalone construits sont dans le paquet complet de la conversation, mais ne sont pas committés. Tous les sprites sources récupérés (18 SVG) sont bien dans la PR. Aucun workflow de transfert, partage public supplémentaire ou contournement du blocage précédent n'a été ajouté.

## Construire et vérifier la v0.2 depuis les sources de la PR

```sh
python3 dlc/predator-badlands/tools/build_v02.py
node --test dlc/predator-badlands/v0.2.0/tests/test_core.mjs
```

Ouvrir ensuite `v0.2.0/JOUER_PREDATOR_BADLANDS_STANDALONE.html`. Les données v0.1 et les 18 SVG sont intégrés au tout-en-un. Le lanceur modulaire demande un serveur statique pour le chargement des SVG.

Pour restaurer à l'identique les fichiers v0.1 manquants à partir du ZIP original local :

```sh
python3 dlc/predator-badlands/tools/restore_v01.py --archive /chemin/ALIENS_TANTALUS_DLC_PREDATOR_BADLANDS_v0.1.0.zip
```

Cet outil ne contacte aucun service, ne pousse rien sur GitHub et refuse les collisions de contenu avant d'écrire. Il ne modifie pas les documents racine ni la v0.2.

## Preuves et limites

198 assertions v0.1, 88 tests moteur v0.2 et 86 contrôles Chromium réussis. Les tests navigateur sont des rendus en mémoire et la reprise utilise un adaptateur Storage de test ; aucune validation disque sur une origine HTTP réelle n'est revendiquée. Les résultats et inventaires distinguent explicitement ce qui est local de ce qui est dans GitHub.

Les SVG sont des placeholders historiques. Aucune fidélité visuelle 1:1 ou conformité intégrale au film n'est certifiée. Le DLC reste autonome ; ni menu ni sauvegarde du jeu principal ne sont modifiés. Ne pas lancer les installateurs/désinstallateurs Tantalus archivés sur Yautja.

L'ancien paquet de récupération v0.1 reste disponible dans le Drive du propriétaire, selon ses permissions inchangées : https://drive.google.com/file/d/1hAjCv4l_32d0GGzIDjBTkRUGiwlUs0_i/view . Le nouveau paquet complet v0.2 est joint à la conversation.
