# Suivi des chantiers V108

Le classeur `YAUTJA_V108_SUIVI.xlsx` ajoute douze feuilles aux 73 feuilles publiées dans V107. Les cellules, formules, tables et parties de feuilles historiques restent conservées. Le suivi garde les 56 lignes source encore ouvertes ; une amélioration partielle ne ferme pas une cible complète.

Les feuilles V108 distinguent les besoins source, les mesures du code courant et les recettes réellement exécutées. Les comptes de Preserve utilisent les identifiants uniques des deux réserves V107/V108 : 16 secteurs et 32 adultes définis. Les versions historiques V1/V2/V3 qui recouvrent Vharuun ne sont pas additionnées. Avar’Kesh est une réserve originale supplémentaire ; les neuf géographies historiques nommées restent à livrer. La cible de 80 secteurs et 100 adultes reste ouverte, ainsi que les fiches graphiques H001–H100.

Les routes de The Pit restent des exercices alternatifs. La continuité d’un objet, d’une santé ou d’une ressource après un duel ne livre pas les acteurs absents des seize scènes source. Le rejeu volontaire reprend le dernier duel gagné avec son même kit d’entrée : il retire cette victoire et tout progrès ultérieur avant de restaurer les ressources. Il est fermé pendant un duel actif et après la fin de route ; son journal conserve au plus seize rejeux. Il ne fournit aucun repos gratuit en conservant une victoire. Les sauvegardes utilisent un verrou et une comparaison du dernier état durable pour refuser les écritures d’un onglet périmé.

Les neuf actions et quatorze contraintes de variantes encore ouvertes restent suivies. L’opération Homeworld de l’intendante s’appuie sur ROLE19 ; elle ne réalise pas les répliques ROLE03 relatives à une plaque absente. La [compatibilité des anciens checkpoints du quai](homeworld-cargo-compatibility-v108.md) conserve une copie de récupération du checkpoint et des carnets concernés avant toute réécriture. Le moteur attend la relecture exacte de cette copie puis l’enregistrement cohérent du nouvel état ; un refus bloque le déplacement jusqu’à la nouvelle tentative. Cette reprise annoncée n’ajoute ni marche, ni résultat, ni récompense.

La logistique des six ouvrages conserve un contexte d’exercice distinct des acquisitions de campagne. Le [contrôle des reçus et PNG fournis](production-evidence-v108.md) vérifie leur cohérence locale. Ses huit cas de test incluent la régénération exacte des trente-six contrôles publiés sur deux lots distincts. Il ne récupère pas les 21 reçus V6.13 ni les 36 traces/PNG V6.10 absents et ne certifie pas une origine externe.

Les 17 fichiers de tests V107 originaux s’exécutent sans modification dans une capsule de leurs véritables sources au commit `887664d308279fbe168cee72a59155a818512107`. Les fichiers source sont privés et en lecture seule ; les anciens produits, preuves et images sont partagés après vérification de leurs SHA. Aucun import du jeu courant n’est redirigé vers cette capsule. Les tests V108 du code courant vérifient séparément les nouvelles fonctionnalités et leurs compatibilités.

Commandes avec Node 22 et Python 3 :

```sh
node scripts/check-excel-history-v108.mjs --check --tests
node --experimental-strip-types --test --test-concurrency=1 tests/*-v108.test.mjs
node scripts/build-excel-followup-v108.mjs --check
```

Le générateur vérifie le ZIP/XML, les valeurs, les caches et les formules. Il ne lance ni navigateur ni application Excel native. Un état de production reste « À valider » jusqu’au gel des sources et à la publication des quatre recettes exécutées sur le même build.
