# V44 — chasseurs fournis dans THE PIT

Le roster de duel contient désormais 195 entrées : 12 combattants de la première édition, 4 extensions existantes, 2 boss historiques ouverts en duel libre et 177 identités/regroupements supplémentaires. Les 410 apparences fournies sont intégrées au combat, pas seulement à la galerie.

## Sélection et combat

- Une case par identité, puis un choix de masque/visage découvert, tenue ou version disponible. Les regroupements incertains gardent leur nom descriptif.
- Recherche, pages de 24 portraits, navigation clavier et manette, variantes par Q/E ou LT/RT, affichage mobile contrôlé à 390 px.
- La variante sélectionnée reste la même pendant les manches, la revanche, les relectures, les snapshots et la remise à zéro de l'entraînement.
- Les deux combattants seuls sont préchargés. Une ancienne banque d'images ne peut pas afficher un autre costume. Un PNG fourni manquant garde le combat en pause à zéro et propose un réessai, sans silhouette de remplacement.
- Les poses natives orientées à gauche et à droite regardent l'adversaire. Les images sources ne sont ni recadrées ni recolorées.
- Retour sur la page du chasseur après combat, permutation des pages corrigée, recherche protégée des touches de pause remappées, réessai des portraits et retour de replay vers un mode compatible.

## Données et limites

Voir `v44-user-hunters-intake.md` et le journal JSON pour les 691 entrées examinées, 214 doublons et 67 exclusions conservées. Les 193 regroupements issus des fichiers comprennent 150 noms/libellés explicitement fournis et 43 regroupements descriptifs ; ils ne sont pas tous certifiés canoniques. Machiko et Theta déjà présentes portent le roster total à 195.

Les nouvelles apparences sont des poses fixes. Les 177 nouvelles entrées utilisent un profil de duel équilibré partagé, déclaré comme adaptation ; leurs armes illustrées ne constituent pas automatiquement des techniques spécifiques. Arcade, Circuit et Descente restent réservés aux parcours écrits. Les animations complètes par costume, les chroniques personnelles et le reste de Homeworld restent à produire. Trois limites de cadrage source sont consignées dans l'import ; aucune certification anatomique ou canonique 1:1 n'est annoncée.

## Vérifications du 23 septembre 2026

- 1 444 tests réussis, zéro échec ou saut ; 142,9 secondes.
- TypeScript et build compilé réussis ; lint zéro erreur et un avertissement existant dans ClanChroniclePanel.
- SHA-256 et dimensions vérifiés pour les 410 PNG publiés dans le dossier public.
- Navigateur compilé : 6 contrôles du roster/variantes et 14 contrôles de non-régression de sélection. Images réellement dessinées, pause/reprise sur panne, clavier, manette simulée, mobile, 136 stages, sauvegardes et parcours imposés vérifiés. Zéro erreur JavaScript ou réponse HTTP d'erreur observée.
- Les commandes de manette sont simulées : aucune certification matérielle. Aucun nouvel exécutable Windows livré dans ce lot.

Les rapports compacts sont `v44-local-validation.json`, `v44-user-roster-compiled-qa.json` et `v44-selection-compiled-qa.json`. La publication effective est enregistrée séparément après vérification de Vercel et du site public.
