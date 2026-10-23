# Suivi V107

Le [classeur V107](YAUTJA_V107_SUIVI.xlsx) ajoute 13 feuilles aux 60 feuilles V106 : 73 feuilles au total. Les parties des feuilles, valeurs, formules et tables historiques restent byte-exactes. Seules les métadonnées d’assemblage et un suffixe de styles sont étendus. Les produits V100/V104/V105/V106 restent immuables et sont reproduits depuis leurs contextes historiques.

Le [master de validation](v107-validation-summary.json) réunit quatre recettes locales de production sur le runtime `d148ebc21004b87e3c6ce435d74e1c120856afba`, build `lKBwtp6LAjSerAzSZQEOM` : 255 contrôles et 48 captures inspectées, sans erreur navigateur. The Pit compte 114 contrôles, Homeworld 67, Clans 43 et Preserve 31. Les commandes réellement exécutées, réponses HTML identifiées, empreintes avant/après et pièces portables sont épinglées dans le master. Le brut Pit est archivé sans perte en gzip ; SHA et tailles encodés et décodés sont vérifiés avant le parsing et les contrôles de portée.

Les liaisons source Feral/Scar passent de 40 à **43 sur 52** : mine Feral S4, étoile Scar S2 et FATALITE_2 Scar dans son contexte hostile qualifié par deux contacts réels. Neuf actions restent ouvertes. CLEMENCE reste partielle : le retrait d’un dispositif inerte et la récupération d’une balise préexistante ne constituent pas un désarmement offensif. Les deux personnages ne sont pas déclarés complets.

Les 77 lignes ouvertes V106 restent conservées individuellement. Le suivi courant en garde **56 ouvertes** : 18 cibles PNG ont été réconciliées avec la production antérieure V6.14 de PR15 et trois liaisons d’action ont été validées. Les deux références V79 existantes restent partielles, les quatre autres dossiers restent à établir, les 16 scènes source et les 14 contraintes de variantes restent ouvertes.

Les six ouvrages Clans disposent d’exercices physiques indépendants vérifiés ; aucune acquisition d’ouvrage ou de navire en campagne n’en est déduite. L’étude A du Homeworld reste une comparaison locale après dépôt B, sans lignée ni récompense ajoutée ; les lignes d’ouverture, d’échec, de reprise et les gestes PNJ restent ouverts. Les nouvelles preuves citent le véritable classeur V6 au SHA exact, sans réécrire les anciens constats historiques.

Preserve V3 démarre ordinairement avec **8 secteurs sur 80 et 16 adultes originaux sur 100**. Le parcours complet des quatre relevés et du retour utilise une fixture explicite où les 16 adultes sont déjà neutralisés ; il ne certifie pas une victoire de combat jouée. Restent 72 secteurs et 84 combattants visés. Les images H001–H100 ne sont pas intégrées.

Les créations artistiques V107 sont séparées : zéro nouveau BODY d’animation natif, 18 poses alternatives statiques et un sprite d’étoile indépendant adapté. Ces poses réemploient 18 identités ; elles n’en créent aucune. Leur preuve d’inspection native est distincte des quatre recettes de jeu et ne revendique pas un parcours de galerie joué. Les 18 Enforcers V6.14 et 18 Sucklings V6.15 appartiennent à PR15. Les huit adultes originaux supplémentaires de Preserve relèvent du parcours de jeu, sans nouveau BODY natif.

Commandes de reproduction et de contrôle :

```sh
node scripts/build-excel-followup-v107.mjs
node scripts/build-excel-followup-v107.mjs --check
node scripts/check-excel-history-v107.mjs --check --release all
node --test tests/*-v107.test.mjs
```

Le contexte historique V106 utilise la capsule fixe `92e7c824` ; la surcouche PR15 conserve séparément les assertions strictes V6.14/V6.15 du commit `d99604e1`. Les lecteurs n’ont besoin ni de Git ni du réseau. Le contrôle du classeur vérifie ZIP/XML, caches et SHA ; il n’exécute pas Excel natif et reste distinct des recettes navigateur.
