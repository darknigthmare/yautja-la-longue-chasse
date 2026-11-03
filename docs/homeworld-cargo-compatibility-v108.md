# Reprise des anciens checkpoints du quai

Le nouvel aménagement peut occuper un point qui était libre en V107. À l’arrivée, V108 recherche un point libre à moins de 96 unités en vérifiant le sol et les obstacles précédents. Cette reprise est annoncée ; elle ne simule aucun trajet.

Si une opération V104–V107 est encore couplée à cette position, son dernier point et son éventuelle charge portée sont déplacés ensemble. L’opération est interrompue pour une reprise volontaire. Les identités, propriétaires, distances parcourues, relevés, résultats et récompenses sont conservés. Un carnet interrompu dont le dernier point est ailleurs garde cet ancrage d’origine, notamment le relevé V104 dans son périmètre propre.

Le checkpoint et les carnets concernés d’origine sont copiés sous une clé de récupération liée au propriétaire. Le moteur attend la relecture exacte de cette copie, puis l’enregistrement cohérent du nouvel état. Un refus de stockage conserve les données et bloque les déplacements jusqu’à la nouvelle tentative.

Les tests de compatibilité utilisent des fixtures contrôlées et valides selon les schémas : quatre positions occupées, les quatre anciens carnets et les porteurs A/C. Ils vérifient l’import du nouvel état et l’absence de crédit de marche ou d’avancement. Ils ne constituent pas des parcours narratifs accomplis. La recette navigateur couvre séparément une arrivée ancienne, les refus de sauvegarde et la reprise physique.
