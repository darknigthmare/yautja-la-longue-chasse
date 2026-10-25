# Suivi des chantiers V108

Le classeur `YAUTJA_V108_SUIVI.xlsx` ajoute douze feuilles aux 73 feuilles publiées dans V107. Les cellules, formules, tables et parties de feuilles historiques restent conservées. Le suivi garde les 56 lignes source encore ouvertes ; une amélioration partielle ne ferme pas une cible complète.

Les feuilles V108 distinguent les besoins source, les mesures du code courant et les recettes réellement exécutées. Les comptes de Preserve utilisent les identifiants uniques des deux réserves V107/V108 : 16 secteurs et 32 adultes définis. Les versions historiques V1/V2/V3 qui recouvrent Vharuun ne sont pas additionnées. Avar’Kesh est une réserve originale supplémentaire ; les neuf géographies historiques nommées restent à livrer. La cible de 80 secteurs et 100 adultes reste ouverte, ainsi que les fiches graphiques H001–H100.

La recette Preserve sépare le combat réel contre un adulte initialement sain du parcours du terrain. Les huit secteurs, quatre postes et retour sont vérifiés avec une fixture déclarée où les seize adultes sont déjà neutralisés. Ce parcours ne certifie donc ni une victoire complète de combat ni une interception.

Les routes de The Pit restent des exercices alternatifs. La continuité d’un objet, d’une santé ou d’une ressource après un duel ne livre pas les acteurs absents des seize scènes source. Le rejeu volontaire reprend le dernier duel gagné avec son même kit d’entrée : il retire cette victoire et tout progrès ultérieur avant de restaurer les ressources. Il est fermé pendant un duel actif et après la fin de route ; son journal conserve au plus seize rejeux. Il ne fournit aucun repos gratuit en conservant une victoire. Les sauvegardes utilisent un verrou et une comparaison du dernier état durable pour refuser les écritures d’un onglet périmé.

La [recette de continuité Feral et Scar](pit-campaign-continuity-v108.md) distingue le parcours principal, qui obtient sa propre victoire CPU et sa libération de dispositif, des contextes isolés préparant l’inspection. Ceux-ci utilisent une fixture produite par le vrai moteur et annoncée dans le rapport brut. Ses victoires de préparation ne sont pas des victoires gagnées dans le navigateur. L’inspection et ses interruptions se jouent ensuite dans le navigateur, dans les deux sens natifs. Les parcours complets de huit étapes restent couverts par les tests moteur ; aucune route complète dans le navigateur n’est annoncée. La mine de Feral est présente et dessinée ; l’étoile de Scar est constatée lors d’un contact immédiat bloqué après la phase native 26→27, sans instant de vol visible ni dégâts revendiqués.

Les neuf actions et quatorze contraintes de variantes encore ouvertes restent suivies. L’opération Homeworld de l’intendante s’appuie sur ROLE19 ; elle ne réalise pas les répliques ROLE03 relatives à une plaque absente. La [compatibilité des anciens checkpoints du quai](homeworld-cargo-compatibility-v108.md) conserve une copie de récupération du checkpoint et des carnets concernés avant toute réécriture. Le moteur attend la relecture exacte de cette copie puis l’enregistrement cohérent du nouvel état ; un refus bloque le déplacement jusqu’à la nouvelle tentative. Cette reprise annoncée n’ajoute ni marche, ni résultat, ni récompense.

La logistique des six ouvrages conserve un contexte d’exercice distinct des acquisitions de campagne. Les identités et les soins des deux montures sont vérifiés ; leurs sprites peuvent encore se superposer et leur séparation visuelle reste à améliorer. Le [contrôle des reçus et PNG fournis](production-evidence-v108.md) vérifie leur cohérence locale. Ses huit cas de test incluent la régénération exacte des trente-six contrôles publiés sur deux lots distincts. Il ne récupère pas les 21 reçus V6.13 ni les 36 traces/PNG V6.10 absents et ne certifie pas une origine externe.

Les 17 fichiers de tests V107 originaux s’exécutent sans modification dans une capsule de leurs véritables sources au commit `887664d308279fbe168cee72a59155a818512107`. Les fichiers source sont privés et en lecture seule ; les anciens produits, preuves et images sont partagés après vérification de leurs SHA. Aucun import du jeu courant n’est redirigé vers cette capsule. Les tests V108 du code courant vérifient séparément les nouvelles fonctionnalités et leurs compatibilités.

Les régressions de compatibilité ont leurs propres journaux : 133 tests d’entrées et de cycles de vie, 46 tests V104 et neuf contrôles du panneau clan historique. Ce dernier utilise un panneau React isolé et des images de remplacement de 1 pixel. Ces résultats ne sont pas additionnés aux contrôles des quatre recettes de production V108.

Le [rapport commun de production](v108-validation-summary.json) vérifie quatre recettes sur le même commit applicatif `24ea9071b673c080325a39a50afeeab6695e4926` et le build `xymWQOgijMpjLfRYw7ynF` : 175 contrôles réussis et 47 captures inspectées. Pit compte 38 contrôles et 12 captures, Homeworld 56 et 13, Clans 42 et 7, Preserve 39 et 15. Les 75 tests V108 et la compilation locale passent ; les huit tests Excel et capsule ont leur journal distinct. Les cinq lignes de progrès sont validées pour ces portées locales, tandis que les 56 besoins source restent ouverts.

Le gel documentaire final vérifie 1 242 entrées. Son [complément d’inventaire](qa/v108-validation/runtime-inventory-completion.json), consigné après les recettes, ajoute six PNG Wolf déjà présents au commit applicatif et dans le rapport brut Pit. L’inventaire préparatoire était incomplet ; ses copies restent conservées avec la comparaison des images au commit. Aucun octet applicatif, de configuration ou d’image ni identifiant de build n’est modifié. Les rapports exécutés restent intacts et leurs versions complètes sont portables dans les quatre dossiers de preuve.

Commandes avec Node 22 et Python 3 :

```sh
node scripts/check-excel-history-v108.mjs --check --tests
node --experimental-strip-types --test --test-concurrency=1 tests/*-v108.test.mjs
node scripts/build-excel-followup-v108.mjs --check
```

Le générateur vérifie le ZIP/XML, les valeurs, les caches et les formules. Il ne lance ni navigateur ni application Excel native. Les scripts et documents de recette sont des entrées épinglées distinctes des preuves d’exécution. L’état `FROZEN` s’appuie sur les quatre rapports exécutés, leurs captures inspectées et le gel final vérifié ; aucune ancienne capture ou fixture n’est renommée comme nouvelle preuve. Ces recettes locales et la compilation ne certifient pas un déploiement ni les contenus d’un CDN.
