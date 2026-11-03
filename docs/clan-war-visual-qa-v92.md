# Revue visuelle locale du poste S11

`/clan-war-qa-v92` monte uniquement le vrai `ClanWarWorksV6`, avec `DEFAULT_WAR_RULES_V6`, comme dans la Bible V6. Aucun nouveau prop, modèle parallèle, état prérempli, chargement de fixture ou callback de campagne n’est ajouté.

La page exige **le flag serveur privé `YAUTJA_LOCAL_VISUAL_QA_V90=1` et `VERCEL!=1`** à chaque rendu. Sinon elle renvoie `notFound()` ; un paramètre d’URL, cookie, stockage navigateur ou flag public ne l’active pas. Elle est dynamique et déclare `noindex, nofollow`. Le root raccorde séparément cette route au proxy commun des pages QA locales, afin de refuser la requête avant streaming.

## Parcours visuel réel

1. Ouvrir la route sur le serveur local configuré par le root. La bannière annonce un exercice isolé en mémoire ; aucune sauvegarde ou progression réelle n’est lue.
2. Ouvrir **Exporter ou reprendre cet exercice**, puis **Coller un JSON de reprise**.
3. Coller le contenu de `work-local/v92/qa/medical-played-treating.json`, valider et confirmer avec les contrôles natifs de l’atelier. Ce petit carnet privé a été créé par des commandes réelles du moteur et accepté par le vrai parseur ; il n’est pas une sauvegarde historique du joueur.
4. Choisir l’équipe **v6-works-team-1 (U18)**. Le poste S11 du site K01 suit une personne blessée avec un soin à 1/2 tour travaillé. Accomplir un tour de soin doit afficher la stabilisation terminée, garder la personne blessée/indisponible et déduire l’entretien local prévu, sans deuxième dose.
5. Vérifier les boutons en desktop et portrait, les libellés, le stock restant, les messages de refus et la possibilité d’exporter ce vrai résultat. Le carnet `medical-played-stabilised.json` fournit aussi un état terminé pour comparer, toujours par validation/confirmation d’import.

Fermer la page efface uniquement l’exercice en mémoire. Aucun import ne se produit automatiquement et aucun fichier privé n’est embarqué dans cette route. Le panneau existant propose sa propre exportation manuelle, sans stockage permanent implicite.

`tests/local-clan-war-qa-v92.test.mjs` exécute le vrai garde serveur transpillé, vérifie les refus en environnement Vercel et sans flag exact, contrôle l’identité du vrai composant/règles et réalise son rendu React SSR. Ces contrôles ne remplacent pas la revue visuelle ou les clics dans un navigateur, réalisés séparément par le root.
