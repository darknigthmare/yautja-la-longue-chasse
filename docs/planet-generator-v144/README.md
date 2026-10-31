# V144 — Aléatoire global, par section et par paramètre du générateur planétaire

Développement direct dans la **PR #39**, sans nouvelle PR ni modification de `main`. Réutilise le véritable moteur de recettes V103/V115. Aucune silhouette fictive n'est introduite ; 120 profils d'îles/continents/régions et 32 textures fondamentales V115 sont déjà reliés au générateur.

## Ce qui existait avant

La version V103 possédait déjà un bouton « Mélanger les réglages » et un bouton « Au hasard » à côté de chaque paramètre V103, y compris la graine. **Ces contrôles ne proposaient pas de tirage par section et n'agissaient pas sur les six paramètres avancés V115.** Les formes V115 possédaient un tirage isolé limité aux formes sans verrou ; les matières et le rayon physique n'avaient pas de tirage propre.

## V144 : boutons réels et verrous

- **Tout aléatoire** en haut et en bas de l'éditeur : tire tous les champs V103 non verrouillés, ainsi que les six champs V115 **lorsque l'extension V115 est activée**. En mode V103, les choix avancés non actifs ne sont ni effacés ni touchés.
- Chaque vraie section possède son bouton **« Aléatoire : cette section »** : *Format et géographie*, *Terres et régions*, *Mers et milieux*, *Atmosphère*. Aucun changement en dehors de la section demandée et des champs non verrouillés.
- Section V115 : bouton total, puis trois tirages ciblés — **Taille**, **Formes** (trois profils), **Textures** (terres et liquides). Chacun des six champs V115 possède maintenant son bouton **Au hasard** et un verrou **Conserver**.
- Le verrou « Conserver » continue de protéger seulement des tirages aléatoires ou presets. L'utilisateur reste libre de modifier volontairement un champ verrouillé.
- Les 18 à 96 territoires / 3 à 12 régions sont choisis **conjointement** lorsque leur section est tirée ; une région conserve au moins trois territoires. Le tirage global conserve la conformité de l'encodeur V103/V115 et les verrous d'une ou deux dimensions.
- Chaque tirage produit un nouveau brouillon, pas une nouvelle planète. **« Générer l'aperçu » demeure l'acte explicite** qui produit le nouveau code et la nouvelle géographie. Les fronts/sauvegardes historiques ne sont jamais remplacés.
- Les tirages sont déterministes à graine d'entropie fixée (fonctions pures testables) ; l'interface crée l'entropie par `crypto.getRandomValues` si disponible. Le moteur cherche une valeur différente pour éviter les boutons qui semblent inactifs.
- Les champs tirés et les verrous conservés sont annoncés à l'utilisateur. Aucun tirage ne change une mission de guerre ou les ressources en arrière-plan.

## Tests

`tests/planet-random-generator-v144.test.mjs` couvre les quatre sections, chacun des 27 champs (21 V103 + six V115), les six tailles, 120 profils de forme et 32 variantes de matière V115, les verrous partiels et totaux, les sections avancées, l'identité de monde et les codes V115, la validation des combinaisons et la stabilité déterministe.

`scripts/qa-planet-random-v144.mjs` teste le véritable éditeur Chromium : global V103 puis V115, tirages ciblés, invariants de verrou, isolation entre sections, géographie valide, aperçu inchangé avant génération, création finale d'un nouveau monde et disposition mobile. Rapports/captures dans les artefacts GitHub Actions.

Les six groupes de couleurs/matières V115 choisis restent des créations procédurales du projet : ils ne sont pas des fichiers UV officiels ni des copies certifiées « fidélité 1:1 » d'un film.
