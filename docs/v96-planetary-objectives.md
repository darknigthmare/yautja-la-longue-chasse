# Domination des trente théâtres V96

L’équilibrage V96 des exercices libres utilise les 24 personnes de départ, sans créer de recrues. Sur chacune des trente planètes, Korthas comprise, la domination demande le contrôle des 36 territoires, des installations intactes, une liaison de ravitaillement pour chaque territoire et au moins une garnison apte dans chacune des six régions. Ces conditions doivent tenir pendant deux fins de tour consécutives, avec l’entretien acquitté.

Un site sans garnison ne produit aucun revenu : la couverture régionale de l’objectif ne change pas les conditions de production. Les blessures, décès, déplacements et captures conservent leurs règles.

Il s’agit d’une adaptation d’équilibrage de l’exercice, qui rend sa fin atteignable avec les effectifs existants. La fiche importée CON-O01 reste inchangée : sa proposition de conception V3 exige une garnison dans chacun des 36 sites et indique que les valeurs initiales sont à équilibrer. Cette proposition reste consultable dans le dossier source ; elle ne décrit pas le critère appliqué par l’exercice V96.

Les anciennes archives de Korthas gardent leur clé, leur format et leurs personnes. Leur absence d’identifiant de planète continue de désigner Korthas ; aucune réécriture n’est nécessaire lors de leur lecture. Le nouveau critère est évalué à la fin du prochain tour joué.

Les tests `tests/clan-war-planets-engine-v96.test.mjs` vérifient la victoire sur chacune des trente planètes avec les seules 24 personnes d’origine, le chargement puis l’achèvement d’une ancienne archive de Korthas, et les ruptures de contrôle, d’installation, de ravitaillement, de couverture régionale et d’entretien.
