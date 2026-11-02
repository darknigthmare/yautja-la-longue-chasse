# Perception des patrouilles — complément V152

Base : PR #78, commit `29b5dd20d206d2ddc82aeef4cbfe546561d68d7a`. Lorsqu'une cible passait en diagonale à courte distance, le premier garde pouvait la considérer encore visible pour la recherche, alors que la détection ne couvre que les lignes et colonnes à portée. La recherche du dernier contact ne démarrait alors pas correctement.

La perte de vue et la détection utilisent désormais les mêmes règles de ligne de vue, portée, camouflage et couvert. Le leurre conserve sa priorité ; la mémoire reste propre au premier garde. Les tests reproduisent le défaut sur le terrain du jeu, avec et sans second garde, et vérifient également camouflage, couvert et cible encore visible. Les deux cas diagonaux échouaient sur la base non corrigée.

`Suivi_Perception_Patrouilles.xlsx` est un complément séparé, généré par `scripts/build-stealth-perception-tracker.py` ; il référence les lignes `CW152-INF-004`, `CW152-INF-005` et `QA152-INF-05` du classeur V152 de #78 et les conserve comme partielles. Aucun classeur existant n'est réécrit. Pour vérifier :

```sh
node --experimental-strip-types --test tests/clan-war-stealth-perception.test.mjs tests/clan-war-stealth-last-contact.test.mjs tests/clan-war-stealth-reconciliation.test.mjs
python -m unittest tests/test_stealth_perception_tracker.py
npx tsc --noEmit -p tsconfig.clan-war-v152.json
npx eslint app/game/systems/clanWarOperationsV115.ts
```

Ces vérifications moteur n'établissent ni fidélité visuelle 1:1 ni coordination complète des gardes, fonctionnement serveur ou compatibilité avec une sauvegarde historique authentique. Les archives générées pour les tests précédents ne remplacent pas cette dernière. La validation complète dans le navigateur de production reste à réaliser.
