# Complément de reprise sur le runtime final

Ce complément apporte **7 contrôles PASS**, sans rejouer les 18 gestes entiers. Le parcours complet antérieur (20 contrôles + 3 contrôles distincts de réouverture du cabinet) reste daté sur le build `kS-6-0gmSFRZVosfYvnq6`, avec ses fichiers et son reçu inchangés.

La présente recette utilise le vrai Next/GameClient `http://127.0.0.1:3153`, build `nItYejsE7HSH4L0ykJM5K`. Elle reprend le checkpoint **effectivement gagné** `native-attempt-2/07-face-before-reload.json`, lié au reçu antérieur par SHA-256. Cette restauration initiale est déclarée dans le pilote ; aucune progression n’est forgée, et aucune téléportation, invocation du writer ou `setScreen` n’a lieu durant le parcours.

Dans un contexte isolé, le pilote restaure les sauvegardes gagnées, choisit Continuer, interagit avec le service physique du Mausolée et ouvre l’atelier depuis le registre réel. Il retrouve exactement le modèle, son poste, sa pose et le journal à **8/18, révision 9, Face déjà observée**. Les clics natifs Profil, Revers puis Confirmer font réellement écrire **9/18, révision 12**, trois événements supplémentaires. Un vrai rechargement puis le même accès physique retrouvent exactement cet état et proposent le geste 10. Le retour ferme l’atelier puis le registre et retrouve le poste physique du Mausolée.

Les trois sources de leçon et les octets du callback `commitTrophyTutorialCheckpoint` sont strictement identiques au parcours complet précédent. Les modifications externes explicitement acceptées pour ce build sont l’autosauvegarde MOB, la présence du chat Opérations et le focus Incident. Les six sources surveillées, le BID et le manifeste sont identiques avant/après cette recette. Les 64 réponses JavaScript Next (32 fichiers uniques) correspondent octet par octet aux fichiers compilés ; les deux documents portent le BID attendu. Aucune source applicative ou ancienne preuve n’a été éditée pendant cette recette.

Le profil complet, les vrais trophées et les missions restent égaux avant/après le geste et la reprise. Ce complément ne refait pas les comparaisons de flotte du parcours complet, ni le scénario de quota ; ces preuves antérieures restent consultables et correctement datées. Les 4 PNG ont été ouverts pour inspection technique. Les captures verticales du tutoriel montrent une partie de son contenu défilant ; elles ne qualifient aucune nouvelle largeur mobile.

L’accès Young Blood provient d’un scénario legacy déclaré par la recette antérieure : il ne prouve pas la nurserie ou un rite actuel. Aucune nouvelle qualification de manette physique, de contenu artistique humain, d’objet effectivement chassé ou de l’ensemble des P0/P1 n’est ajoutée.

`report.browser-run.json` est la sortie brute inchangée. `report.json` ajoute seulement les liens et comptes de synthèse. `recipe-used.mjs` archive le pilote exact exécuté et doit rester identique à `run.mjs`. `final-receipt.json` épingle les nouvelles preuves, les six sources surveillées, le checkpoint réellement gagné et son reçu d’origine. Vérification sans navigateur ni mutation :

```sh
python3 production/clan-war-command-20261109/qa/trophy-tutorial/final-resume-1/verify.py
```
