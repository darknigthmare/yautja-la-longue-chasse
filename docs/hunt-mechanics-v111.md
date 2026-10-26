# V111 · Dépeçage, trophées et canopée

Le Flaying Tool devient un outil permanent acquis à l’armurerie pour 120 marques du clan. L’achat associe débit et inventaire dans une écriture confirmée ; un double clic relit la sauvegarde courante. Les anciennes sauvegardes ne reçoivent aucun outil gratuitement.

Près d’une proie réellement vaincue, « Examiner la proie vaincue » permet de dépecer en 3,2 secondes. Le geste exige l’outil, un appui et un accès dégagé ; dégâts, départ, perte d’appui ou autre action volontaire l’interrompent. Le geste accepté retire le camouflage. Une proie préparée conserve son état et ses témoins à la reprise. La mise en scène ne crée aucune peau, viande, récompense ou montée de rang. La suspension des corps reste à produire.

Les trophées secondaires apparaissent à la position du corps réel et suivent sa chute sur les plateformes. Le prélèvement vérifie à son démarrage, pendant les gestes et à sa conclusion l’identité de la proie, l’appui du chasseur, la portée et les obstacles solides. L’Apex tombe également sur la géométrie réelle ; son corps et ses glyphes utilisent sa hauteur réelle.

Une direction accompagnée du saut déclenche désormais le bond depuis un arbre, une liane, une corde ou une chaîne. L’élan est conservé pendant 0,24 seconde ; Haut permet de rattraper le prochain support, même en maintenant la direction. Une prise exige au moins huit points d’endurance. L’épuisement interdit de reprendre un support avant une réception sur le sol ou une plateforme. Les lianes restent des supports de grimpe ; leur balancement physique figure dans le backlog.

## Classeur de conception

[YAUTJA_V111_MECANIQUES_CHASSE.xlsx](YAUTJA_V111_MECANIQUES_CHASSE.xlsx) contient huit onglets : Sources, Depecage, Trophees, Locomotion, Parametres, Transitions, Validation et Backlog. Les règles existantes, les changements de cette PR et les extensions proposées ont des statuts distincts. Les scénarios du classeur sont un plan de validation, sans résultat PASS présumé.

La source lisible est [hunt-mechanics-v111.json](hunt-mechanics-v111.json). Le classeur est déterministe et se régénère avec :

```sh
node scripts/build-hunt-mechanics-workbook.mjs
node scripts/build-hunt-mechanics-workbook.mjs --check
python3 scripts/verify-hunt-mechanics-workbook-v111.py
```

Les paramètres numériques constituent l’équilibrage original du jeu et doivent être éprouvés en partie. La discussion ChatGPT évoquée n’a pas pu être consultée : les outils de lecture sont restés sans réponse. Les fichiers du dépôt et la demande présente constituent les sources utilisées.

## Vérifications

Le workflow existant exécute TypeScript, les régressions natives du déplacement, de la récolte, des rites et de l’achat, puis la compilation et les contrôles de classeur. L’environnement local de ce chat n’étant pas disponible, les résultats exécutés sont ceux de GitHub Actions ; ils doivent être lus sur le commit exact de la PR.

Les classeurs et preuves historiques restent inchangés. Le contrôle V110 restaure dans un répertoire temporaire les préimages du commit `dff1f6734284891b5a24238f890070616a8325cc`, vérifie les empreintes gelées, puis rejoue les assertions et la régénération d’origine. Ce contrôle porte sur V110 ; les tests V111 portent sur les nouveaux comportements.
