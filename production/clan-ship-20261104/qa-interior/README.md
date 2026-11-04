# Recette finale de l’intérieur physique

Source qualifiée : `22fad968311d252310fe2fde281f71564a401a64`. [Run CI 41818690041](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41818690041), job `126535991676`, artefact `13316725372`. Arbre source : `3e51bbc023720057deb28696bd16bbaa6c8b6d82`.

Le [rapport final](run-41818690041/report.json) contient **22/22 scénarios réussis**, zéro asset demandé manquant et zéro exception JavaScript. Le checkout correspond à la source et son arbre de travail est propre. La même CI a réussi TypeScript, ESLint strict et les **201 tests** ciblés.

Le navigateur est Chromium `153.0.8010.12` en mode avec fenêtre. La perte native de focus est mesurée `true → false → true` ; `document.hidden` reste `false`. Le scénario valide la perte de focus, pas un passage observé à un document caché. Le pointage tactile 320 px rejoint exactement `(905.02, 675)` après la mise à jour de caméra.

Les **onze captures** couvrent l’approche, les sept salles, la reprise des archives et deux cadrages complémentaires du hangar mobile à 320 px. La page comporte une zone à défilement interne : `04-hangar-mobile-320.png` et `05-hangar-mobile-controls-320.png` montrent deux positions de défilement, pas une image de toute cette zone déroulée. Le second cadrage expose les commandes tactiles et « Rejoindre la passerelle ». Le libellé de coque est ancré au viewport et la capture attend la disparition naturelle du toast.

Les onze captures ont reçu une revue technique satisfaisante de root et du relecteur indépendant : aucun défaut visuel bloquant reproduit et toutes les réserves précédentes levées. Le détail est suivi dans `production-state.json.current.reviewScreenshots`. L’approbation artistique humaine reste à examiner. L’ouverture et le retour des six services ne qualifient pas tous leurs coûts, récompenses et effets métier.

La baseline `../qa/` reste intacte. Seule la preuve finale de l’intérieur est copiée ici ; le run intermédiaire `41817555957` avait déjà validé le parcours avant les corrections de cadrage, mais ses PNG ne sont pas dupliqués dans cette livraison.

Les empreintes des fichiers copiés et la provenance de l’artefact sont dans [provenance.json](run-41818690041/provenance.json). SHA-256 du ZIP téléchargé : `6741e49318cfa591c45b35e58fcf45b85d411829858e987044a9e172bfa7fc76`. Toute révision runtime suivante exige sa propre preuve.
