# Reprise de la recherche du dernier contact

Cette branche reprend le périmètre `CW144-INF-001` de la PR [#55](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/55), distinct de l'identifiant homonyme de [#56](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/56). Elle s'appuie sur [#67](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/67), qui réconcilie déjà les deux formats de second garde et conserve les corrections #59.

Après une vraie vision du chasseur, le garde principal garde la dernière case observée pendant deux décisions. Il n'utilise ce souvenir que lorsque le chasseur a disparu ; un leurre sonore actif a priorité. Le second garde suit sa propre patrouille et le leurre, sans recevoir le souvenir privé du premier. Une alerte causée seulement par le second ne crée pas de souvenir pour le premier. Le résultat reste un exercice 2D original et ne constitue ni coordination multi-étages, ni IA certifiée fidèle à un film.

Le champ `guardInvestigation` des archives #55 est conservé, validé puis utilisé ; une archive sans ce champ reste lisible, et une durée, coordonnée ou case impossible est refusée. La règle de choix pour archives ambiguës de #67 reste applicable. Les tests ne constituent pas une preuve de compatibilité avec une sauvegarde historique d'utilisateur non disponible.

Le [classeur complémentaire](Suivi_Contact_Patrouille.xlsx) relie les exigences exactes de #55 et #56 à ce lot et à ses limites. Les documents historiques ne sont ni remplacés ni marqués terminés ; la ligne de coordination des gardes et des étages reste ouverte. Le classeur est produit par `python scripts/build-stealth-contact-tracker.py` et vérifié par `python -m unittest tests/test_stealth_contact_tracker.py` ; le PDF Calc de ses trois feuilles a servi à vérifier sa lisibilité, sans édition du classeur source.

## Vérifications ciblées

- `node --test tests/clan-war-stealth-last-contact.test.mjs` : vraie vision, positions cachées alternatives, priorité du leurre, sérialisation et refus des données incohérentes, garde témoin distinct.
- `node scripts/qa-stealth-last-contact-browser.mjs` : archive **de test** jouée par le moteur original #55 `fa0322800d5c51e16a4dd56ef6d0fc80d8020394` dont chaque blob est contrôlé ; choix de reprise, camouflage et rechargement dans le composant V115 sous Chromium. Ce n'est pas une archive historique d'un joueur.
- Régressions V115–V146 et recette GameClient héritée de #67 ; le workflow dédié inclut les deux scénarios navigateur et les tests du classeur. Une réussite locale ou CI ne prouve pas le rendu artistique, un serveur de production, une manette ou la synchronisation réseau.

Le guide local de développement dirige ce lot vers les références épinglées `game-ai`, `save-systems` et `custom-engines`. La source #55 et les critères du tableur décrivent une adaptation de gameplay ; ils ne fournissent pas de référence visuelle certifiant le 1:1 Predator.
