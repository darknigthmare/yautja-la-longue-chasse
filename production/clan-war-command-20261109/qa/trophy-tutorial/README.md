# BUILD5-09 — tutoriel physique des trophées

Nouvelle implémentation des dix-huit gestes TR-M01..03 sur le modèle
pédagogique permis par la bible. Le parcours traverse sept postes, avec
collisions, marche continue, six transports du même objet, réglages et refus
distincts. Trois observations du geste 9 sont sauvegardables séparément.
L'état ne donne ni trophée de chasse, ni rang, ni devise ou vaisseau.

Le [raccordement](WIRING.md) appartient au propriétaire du `GameClient` et de
`SaveGame`. La nouvelle scène n'écrit aucun stockage. Son callback confirme
chaque checkpoint via le writer existant ; un refus conserve l'étape précédente.

## Preuves effectivement obtenues

- [24 tests de domaine](domain.tap) : trajets aller/retour et collisions,
  contraintes des gestes, six transports non instantanés, refus des faits
  inventés, objets uniques, reprise après découverte/face seule/plaque, journal
  invalide/futur et CAS sans répétition.
- [Vérification source finale](source-checks-final.json) : TypeScript ciblé avec
  les réglages du projet et ESLint strict, sans erreur ni avertissement.
- [Fixture native finale](native-fixture/attempt-2/report.json) : 18 contrôles
  réussis dans Chromium154, avec le véritable composant et son véritable modèle.
  Les dix-huit gestes et vingt-et-un événements sont déclenchés par les commandes
  natives. Trois rechargements, refus d'écriture puis reprise, sorties/remontage,
  cadrage et largeurs390/320 sont vérifiés ; aucune erreur navigateur/requête.
- [Neuf captures originales ouvertes](native-fixture/attempt-2/screenshot-inspection.json),
  dont le cadrage et la consigne de reprise corrigés après inspection de la
  première tentative. Cette première preuve reste datée et non réécrite.
- [Critères exacts](source-criterion.json) : 26 lignes source du classeur V6,
  dont les trois missions, les dix-huit réactions et les trois reprises.

La fixture possède un writer contrôlé, identifié comme tel ; elle n'est pas un
parcours du vrai `GameClient`/Next et ne clôture pas seule BUILD5-09. La recette
sur la sauvegarde principale et l'accès physique Homeworld restent à produire
après raccordement. Aucun test de manette physique ni jugement artistique
humain n'est revendiqué. Les trophées originaux chassés, le ledger global
BUILD5-02 et les chaînes avancées BUILD5-11 restent distincts de ce modèle.

Le premier appel ad hoc de TypeScript ne reprenait pas les réglages du projet
et a échoué sur des imports transitifs existants. Le contrôle final applique
les options `strict`, résolution bundler, imports TypeScript et types Next ;
seul celui-ci est retenu comme preuve de compilation ciblée.

## Reproduction

Depuis la racine, avec Node22 :

```bash
node --experimental-strip-types tests/trophy-tutorial-v6.test.mjs
TROPHY_TUTORIAL_ATTEMPT=native-fixture/attempt-new node production/clan-war-command-20261109/qa/trophy-tutorial/run-native-fixture.mjs
```

Un nouveau dossier est requis pour la recette afin de préserver les preuves
existantes. Aucun artefact précédent n'est réécrit par le pilote navigateur.
