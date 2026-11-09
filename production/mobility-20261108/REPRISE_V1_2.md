# Mobilité V1.2 — Le sceau du convoyeur

## Intention et fidélité à la bible

La fiche `scout_grav_sled` prévoit une récompense de tutoriel au Homeworld. La V1.1 ne livrait que le prêt et le permis. Cette tranche ajoute la remise personnelle sans transformer le permis en achat automatique et sans donner de propriété aux jeunes non Blooded.

Le rite, les répliques d’atelier et les règles de remise sont des créations de **La Longue Chasse**, pas des faits canoniques de Predator. Les cinq fichiers de bible restent inchangés, ainsi que les cinquante identifiants, descriptions et conditions d’acquisition. Aucun nouveau dessin ou statut de fidélité artistique 1:1 n’est ajouté.

## Parcours livré

1. Au Comptoir des convois, prendre le Grav-Sled de formation. Les gardes physiques des Forges et les conditions de campagne existantes restent actives.
2. Conduire les trois balises dans l’ordre, prendre le colis de 25 kg, le livrer puis revenir immobile au dépôt.
3. Le permis est confirmé, **sans propriété automatique**. Pour un Blooded, la course réussie crée un reçu de remise `available`.
4. Le panneau **Le sceau du convoyeur** indique la coque et la réserve réellement restantes. Confirmer **Recevoir le Grav-Sled du clan** inscrit ce châssis dans la flotte et consomme le reçu (`claimed`).
5. Le Grav-Sled et la moto de clan peuvent alors être sélectionnés séparément, conduits dans l’aire et entretenus. Chaque engin conserve ses propres modules, sa condition, sa réserve et son kilométrage.

La remise est gratuite, parce qu’il s’agit d’une récompense de formation et non d’une nouvelle vente. Elle ne donne ni marques, ni honneur, ni rang, ni compagnon, ni compartiment ou embarquement orbital. La moto reste la seule vente du comptoir à **420 marques**. Les quatre branches à trois niveaux s’appliquent aux deux machines personnelles, sans changer leurs prix ou formules.

## Contrats de sauvegarde et abus évités

Le reçu versionné conserve une copie de la course réussie, liée au propriétaire du registre et à l’identifiant de sortie. L’usure, l’énergie et la distance sont transférées **sans remise à neuf**. Une deuxième formation ne remplace ni le reçu en attente ni le véhicule déjà remis. Une récupération de sécurité, un ancien permis ou un rapport antérieur ne créent pas de reçu.

Une sauvegarde V1 sans `trainingReward` est migrée avec `null`, donc sans cadeau rétroactif. Les états de reçu incohérents, le châssis manquant après remise, la double attribution, le propriétaire étranger, la révision périmée et une version future sont refusés. Possession et reçu passent par le writer de campagne existant ; une panne de stockage ne confirme pas artificiellement la remise. Une sauvegarde locale reste modifiable par son utilisateur : ces contrôles ne sont pas une autorité multijoueur ou une certification antifraude en ligne.

Le prêt d’école garde toujours ses modules de base. La logique et la prédiction de conduite n’empruntent plus les améliorations du Grav-Sled personnel. La flotte reste inchangée lors d’un nouveau prêt. Une dette de récupération doit être réglée avant la remise ; elle ne supprime pas le droit de chasser à pied.

## Vérification et fichiers

- 33 nouveaux tests exécutés localement : remise, refus, migration, reçu, flotte indépendante, contrôleur/prêt, round-trips de sauvegarde et writer en échec.
- Ensemble local exécuté : **192 tests réussis**, dont les six de guidage. Les huit tests de frontière de build présents dans GitHub portent le total CI attendu à **200**, à confirmer par le rapport du run, pas par ce texte.
- TypeScript ciblé réussi localement.
- Recette navigateur existante prolongée de huit assertions : reçu gagné, remise unique, coque exacte, rechargement, deux véhicules, amélioration isolée et nouveau prêt. **29 contrôles attendus** ; leur réussite n’est pas déduite de l’écriture du script. Le rapport CI donne le résultat réellement observé.
- Le classeur comporte **24 feuilles et 780 formules calculées**. `Remise_GravSled_V1_2` documente 24 points et distingue les tests locaux des recettes encore à vérifier. Les 2 428 cellules historiques sont conservées. La synthèse V1.1 reste un reçu historique identifié, pas une fausse mesure de cette livraison.

Les règles, tests, interface et script natif sont présents en fichiers sources normaux. Les preuves d’exécution sont conservées dans `qa/native-v12/` si la publication vérifiée aboutit. Le manifeste de livraison enregistre les empreintes de chaque fichier testé ; les rapports réalisés avant le commit de livraison se réfèrent à ce manifeste, pas à un commit inventé.

## Portée encore ouverte

Toujours deux modèles conduisibles dans l’aire, désormais deux possédables sous conditions, mais un seul achetable. Pas de conduite libre dans toutes les régions, de nouvelle quête des quarante-huit autres modèles, de monture/BOND/écurie, de combat embarqué ou de PNJ monté supplémentaire. Le parcours complet depuis GameClient jusqu’aux Forges et la manette physique restent à qualifier. Les HD 41–50, autres vues, cavaliers, animations et effets dédiés restent ouverts. Aucun merge ni déploiement manuel.
