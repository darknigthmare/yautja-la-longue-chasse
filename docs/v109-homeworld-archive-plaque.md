# Poste d’archives K-17 — V109

La scène ROLE03 peut désormais être jouée avec une plaque nommée, une empreinte distincte et un fragment candidat réellement dessinés. L’archiviste doit être rejoint au quai oriental ; le choix ne transporte aucun objet. Le joueur reçoit son accord, observe chaque pièce sur place, copie son lieu de découverte, la porte à pied puis la dépose sur sa propre surface. Une seule pièce peut être portée à la fois.

Le dialogue provient de la scène `D6-W-PNJ-ROLE-03`, ligne383 de `Scenes_dialogue_V6`, des choix788/789 et des répliques3183–3190 de `Repliques_V6`. Le module référence le corpus V6 existant et ses empreintes, sans réécrire la capsule V106. Les phrases d’ouverture, d’échec3185, de reprise3186 et de succès ne sont conservées qu’après leurs transitions physiques et leurs échanges au poste. L’historique affiche le dernier échange confirmé ; sa relecture ne rejoue aucune voix.

L’approche A exige le transport des deux pièces initiales, l’observation du bord manquant, leur comparaison sans pression, puis un retour à pied pour rapporter l’écart. Une interruption précède un nouvel échange au poste. Le joueur peut ensuite relever et transporter le fragment candidat sur une troisième surface. Ce fragment reste indépendant : aucune réparation du bord, attribution de l’empreinte ou lignée n’est validée. L’approche B conserve seulement les deux pièces initiales séparées ; elle n’invente ni échec, ni reprise, ni examen du fragment.

Les trois objets sont des créations locales originales admises dans `homeworldArchivePlaqueArtV109.json`. L’atlas transparent1254×1254 est conservé intact ; chaque objet utilise exclusivement son rectangle source natif, y compris dans les aperçus SVG explicitement découpés. Le nom K-17 est une désignation opérationnelle originale. Le fragment est un candidat, même si ses motifs invitent à une comparaison. La réception ImageGen et l’inspection du PNG se trouvent dans `suivi-production/v109-homeworld-plaque/receipt.json`. Le corps de l’archiviste réutilise les dessins existants ; aucun nouveau geste de parole ou de manipulation du PNJ n’est certifié.

Le registre optionnel `homeworld.archivePlaqueV109` conserve propriétaire, révision, source, art, accord, lieux, observations, objets, transport et phrases confirmées. Les écritures sont atomiques. Un refus de stockage gèle la marche avant toute nouvelle action ; « Réessayer » réenregistre l’état confirmé sans rejouer le choix ou la manipulation refusés. Le chargement refuse versions futures, propriétaires différents, double transport, placements impossibles, phrases anticipées et checkpoint incompatible avec une étude en marche ou une charge portée. Les opérations cartographiques, anciennes archives et cargaisons restent exclusives.

Pause, perte de focus et changement d’activité interrompent l’étude en conservant les positions. Une pièce portée peut être posée au sol si le dallage réel le permet. La reprise ordinaire exige le dernier point confirmé ; un repère temporaire précis est fourni à l’Atlas. La première reprise dialoguée après l’échec se fait au poste, sans charge, même si l’interruption a eu lieu ailleurs. Ce retour interrompu ne crédite aucune distance d’étude et ne déplace aucune pièce.

Le nouveau poste et ses surfaces occupent un dallage public contrôlé par le moteur existant, sans solidifier des objets plats. Les scènes, pupitres et conteneurs V106/V107 restent distincts. Les lots cargo V108 gardent leurs véritables collisions pendant la marche K-17. L’Atlas V109 partage ces collisions et invalide un trajet si un lot ou un objet destination change de place ; voir `v109-homeworld-dynamic-atlas.md`.

Vérification ciblée avec Node22 :

```sh
node --test tests/homeworld-archive-plaque-v109.test.mjs tests/homeworld-input-runtime.test.mjs
node --test tests/homeworld-dynamic-navigation-v109.test.mjs tests/homeworld-wayfinding-ui-v98.test.mjs
```

`scripts/qa-homeworld-plaque-v109.mjs` joue les deux approches dans l’application et un troisième parcours avec l’Atlas et un vrai lot porté puis posé. Seuls les checkpoints initiaux vides sont préparés ; accords, observations, lieux copiés, transports, comparaisons, interruptions et rapports sont joués dans l’interface. Le mode `development` sert au rodage et ne prouve aucun build de production. Le mode `compiled-app` exige `YAUTJA_QA_BUILD_ID` et `YAUTJA_QA_RUNTIME_COMMIT`, contrôle les sources avant/après et produit son résultat brut avec les empreintes des captures.

Cette livraison n’accorde aucune récompense d’inventaire, de profil ou de trophée. Les classeurs, gels et preuves V108/V107 ne sont pas réécrits.
