# Suivi Excel V105

V105 ajoute dix feuilles actives au classeur V104 épinglé, soit **49 feuilles**. Les 39 feuilles historiques, leurs valeurs, formules, caches, tableaux et parties ZIP conservent leurs octets. Seules les quatre métadonnées d’assemblage sont étendues, avec les styles nouveaux ajoutés à la suite des styles existants. Le SHA-256 imposé de V104 est `ce78bac96ae57cbee732bc868acecd46b0dc57e5ade49f669fb15c8b12ea03aa`.

Le classeur distingue les **52 études BODY et 104 directions natives préexistantes** des raccords de jeu. Le collecteur contrôle les 52 admissions, les PNG avec leur SHA-256, leurs directions, les rectangles et pivots conservés, les phases et leurs durées. Il compile les exports réels et exécute une fois chaque nouvelle commande sur le moteur V13. Cette mesure du raccord n’exécute pas la suite de tests ni le navigateur et ne crée aucun PASS de livraison.

Le périmètre V105 contient 7 nouveaux gestes de combat : `6M` et `EQUIP` pour Feral et Scar, `S3` de Feral, `S1` et `S4` de Scar. Les 18 normales V104 restent présentes. La commande source et l’entrée moteur adaptée figurent dans deux colonnes séparées : les boutons dédiés `equipment`, `contact` et `counter` ne prouvent pas une reconnaissance des mouvements directionnels du classeur. `EQUIP` est un geste vulnérable à actif nul, sans nouvel inventaire persistant. `S4` de Scar intercepte seulement un contact frontal ; son animation n’implique ni réflexion des projectiles ni protection contre les projections ou les coups dans le dos. Dix présentations sans partenaire disposent d’un registre natif séparé. Au total, **35/52 actions source ont un raccord ciblé**, sans déclarer deux personnages complets.

Les **17 actions restantes** figurent dans `ManquantsV105` : quatre projections avec mannequin peint, cinq spéciaux à entités, deux supers et six fatalités/clémences avec partenaire peint. Les techniques historiques de carreaux de Feral et de plasma de Scar restent distinctes des contrats source V105. L’inventaire ajoute aussi **16 étapes de campagne** et **14 contraintes de variantes**, avec leurs cellules et textes exacts. Une réutilisation possible d’un BODY ne clôt aucune de ces exigences. Les quantités de dessins des étapes ne sont pas inventées lorsque les cellules n’en donnent pas.

Homeworld suit l’option A du cartographe, distincte de l’option B historique : montée réelle au viaduc existant, comparaison de deux objets connus, retour et sauvegarde. Cette adaptation ne crée aucune crête révélée ou récompense. Le lot Clans suit une route logistique de dépôts voisins avec porteurs et stocks réels ; les **six ouvrages historiques restent ouverts**. La Preserve demeure à **4/80 secteurs et 8/100 combattants** et les trente planètes historiques restent distinctes des vingt-sept formats V103.

Les feuilles nouvelles sont `SyntheseV105`, `ChantiersV105`, `ActionsV105`, `ClipsV105`, `HomeworldV105`, `ClansV105`, `ManquantsV105`, `SourcesV105`, `ValidationsV105` et `JournalV105`. `SourcesV105` répertorie les empreintes de toutes les entrées réellement lues, y compris les modules transitivement importés et chaque PNG natif. `ActionsV105` sépare dessin, animation, commande, mécanique et présentation ; les colonnes des atlas et clips exposent les raccords V105 sans réécrire les admissions V100.

Le registre éditable est [v105-workstreams-source.json](v105-workstreams-source.json). Les trois chantiers démarrent `EN_COURS`. Un statut `VALIDE_CIBLE` exige un gel explicite, une portée imposée, des déclarations PASS pour tests et navigateur, et des rapports portables dont les octets correspondent aux SHA déclarés. Une preuve située seulement dans un fichier de test est refusée. Les preuves des validations PASS sont également épinglées. La présence d’un module ou d’un rapport n’est jamais une promotion automatique.

Le gel de production [v105-runtime-freeze.json](v105-runtime-freeze.json) est lui-même épinglé par SHA dans le registre final. Chaque entrée `app/` ou `public/` collectée doit correspondre à ce gel, y compris les hôtes, UI, CSS, sauvegardes, replays et entraînement explicitement listés même lorsque le bundle de collecte ne les importe pas. Les tests de preuves de production vérifient en complément l’ensemble du gel et les preuves portables des trois domaines. Le gel et le résumé global ne dépendent pas du SHA du classeur V105, ce qui évite un cycle de génération.

Les trois périmètres sont finalement `VALIDE_CIBLE` sur le runtime `d0d66d39a8a90c6d039b4b27672dd29d27b78517` et le build de production commun `Pq220rJsmklF7dV4DeXEz`. Le [résumé global](v105-validation-summary.json) relie les preuves : Pit 288 contrôles et 37 captures inspectées, Homeworld 52 et 9, Clans 33 et 5. Chaque rapport et le gel sont épinglés par SHA dans le registre. Les 17 actions source sans liaison, campagnes, variantes, exigences d’inventaire et six ouvrages restent ouverts ; ces validations ne clôturent pas les kits ou le jeu entier.

Commandes avec Node 22 installé par l’environnement :

```sh
export PATH="/workspace/.cloud-tools/node22/node_modules/node/bin:$PATH"
node scripts/build-excel-followup-v105.mjs
node scripts/build-excel-followup-v105.mjs --check
node --test tests/excel-followup-v105.test.mjs
```

`--output-dir /tmp/revue-v105` produit une copie de revue sans écrire dans `docs`. `--check` recalcule les trois produits et refuse toute différence sans les modifier : `v105-workstreams.json`, `YAUTJA_V105_SUIVI.xlsx`, `v105-excel-followup-qa.json`. Les générateurs V100/V104 ne sont jamais exécutés pour construire V105. L’aide générique `scripts/lib/excel_followup_append.py` réutilise uniquement les fonctions pures de présentation XML du writer V100 ; le profil V105 impose la base, les 39 feuilles et les dix noms nouveaux.

Les dix tests couvrent la falsification des portées, preuves et SHA, le refus d’un runtime différent du gel de production, les cellules et textes source, la séparation entre études et raccords, les partenaires non admis, l’absence d’actif EQUIP, la conservation des 39 feuilles et 52 parties historiques identiques, les formules source conservées comme texte, les caches de synthèse vérifiés indépendamment, la reproductibilité et le refus sans mutation d’un produit périmé. Ces contrôles ZIP/XML n’ouvrent pas Excel natif et n’exécutent pas son moteur de calcul.
