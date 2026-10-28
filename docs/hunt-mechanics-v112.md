# V112 — chaîne de chasse et canopée

Cette livraison reprend les douze extensions FUT-01 à FUT-12 du classeur de chasse V111. Elle complète les gestes de terrain, l'emport et la conservation, les traversées de canopée, les options d'accessibilité et les réactions locales à une carcasse. Le suivi Homeworld de la PR22 conserve son périmètre et ses classeurs.

Le [classeur V112](./YAUTJA_V112_MECANIQUES_CHASSE.xlsx) contient **19 onglets et 362 lignes**. Sa source éditable est [hunt-mechanics-v112.json](./hunt-mechanics-v112.json). Chaque exigence FUT conserve son identifiant ; règles, paramètres, transitions, recettes de qualification et preuves sont séparés. `IMPLEMENTE_A_VALIDER` signifie présence de code ; `VALIDE_AUTOMATISE` n'est attribué qu'après une exécution consignée. La présence d'une recette n'est pas une preuve de réussite.

## Mécaniques et commandes

Les arbres conservent le bond direction+saut V111. Sur une liane, une corde ou une chaîne, une direction seule enclenche le pendule ; direction pompe, Haut/Bas change la longueur et Saut lâche avec la vitesse tangentielle. L'angle, la longueur, l'énergie, la collision et l'endurance sont bornés. Une prise perdue ou obstruée ne peut retenir le chasseur. L'épuisement impose une vraie réception avant une nouvelle prise.

Les routes de canopée sont optionnelles et géométriques : jusqu'à trois séquences selon l'espace libre, six branches de repos par séquence et des entrées/sorties reliées au terrain. Elles sont réappliquées au monde final après les transformations d'exploration. Une vérification de géométrie ne suffit pas à qualifier un parcours ; la recette native doit toucher réellement les repos.

Le corps réel peut être préparé, porté puis suspendu sur un socket authoré compatible. Masse, capacité, portée et volume libre sont contrôlés pendant le geste. Rendu, point de prélèvement et témoins suivent le même acteur ; la disparition du support libère ce même corps dans la collision.

Le catalogue de 39 espèces détaille chaque partie, sa masse, son volume, sa durée et sa fragilité dans le classeur. Les prises anatomiques dépendent de l'espèce et d'un stock fini. Préparation et prélèvement sont des gestes distincts. L'interface présente masse, durée, prérequis et intégrité avant confirmation. Cette intégrité découle des dommages de la chasse et de l'analyse, sans nouveau tirage aléatoire à la reprise. Une interruption ou un emport plein laisse la partie sur la proie.

L'armure scout autorise 24 kg et 18 volumes, hunter 36/24, berserker 52/30. À pleine charge, vitesse ×0,68, saut ×0,84, coût de grimpe ×1,6 et bruit ×1,8. Les stocks et leur capacité sont recomptés depuis les objets réels. Les remises de campagne suivent une extraction réussie et les identités monotones de rencontre empêchent les répétitions.

Une opération achevée use l'outil de 5 points ; démarrage et interruption ne paient pas ce coût. Un outil à zéro reste utilisable avec une durée augmentée, et l'affûtage au poste est gratuit. L'atelier conserve l'identité et la qualité de la pièce dans les étapes suivantes :

| Étape | Marques | Gestes manuels |
| --- | ---: | ---: |
| Nettoyer | 2 | 3 |
| Traiter | 4 | 4 |
| Sécher | 3 | 5 |
| Monter | 5 | 3 |

Le travail ne progresse pas hors jeu. Jusqu'à 16 travaux sont actifs en parallèle. Le dépôt détaillé accepte 256 prises ; l'action explicite « Ranger en réserve » conserve possession, compte et qualité moyenne des pièces montées tout en libérant un emplacement. Coût, inventaire et progression doivent être enregistrés avant le message de réussite.

Les options de chasse ajoutent fenêtres normale, large et sans limite, confirmation par pression, maintien ou bascule, grands glyphes, prise et visée en bascule, remappage de manette par permutation et guide contextuel. Aucun coefficient de score supplémentaire n'est ajouté ; les dangers et le temps de chasse continuent, ce qui peut affecter le score chronométré et la qualité Apex. Le guide distingue corps, trophée et extraction, et reprend les commandes affectées.

La découverte d'un corps est locale. Vue, odeur animale, radio et investigation ont des identités distinctes. La radio ne propage qu'un saut à des alliés dans sa portée et avec un nombre de destinataires borné. Les herbivores, charognards et gardiens ont des comportements propres. La peur décroît près du corps réel et n'invente pas la position du chasseur.

Les valeurs de ce système sont des choix de gameplay du fan game ; elles ne sont pas présentées comme des données canoniques de la franchise. La discussion ChatGPT historique n'a pas été lue.

## Génération et vérification

```sh
node scripts/build-hunt-mechanics-workbook-v112.mjs
node scripts/build-hunt-mechanics-workbook-v112.mjs --check
python3 scripts/verify-hunt-mechanics-workbook-v112.py
node --experimental-strip-types --test --test-concurrency=1 tests/*-v112.test.mjs
node scripts/qa-hunt-mechanics-browser-v112.mjs
```

Le générateur Excel ne dépend d'aucune bibliothèque externe. Les dates ZIP, l'ordre des membres, les styles, les liens et les cellules inline sont déterministes. Le vérificateur Python utilise uniquement ZIP/XML de la bibliothèque standard ; il contrôle CRC, noms, relations, cellules, filtres, en-têtes gelés et statut explicite des scénarios. Aucun moteur Excel ni recalcul natif n'est exécuté.

Les ressources visuelles sont liées aux gestes qui les utilisent. L'atlas SVG des prises anatomiques et les glyphes vectoriels de l'atelier sont originaux et consommés par les interfaces. Les signaux de découverte utilisent texte et formes en plus de la couleur. Une icône ne constitue pas une animation corporelle complète.

## Qualification et limites

La suite native utilise les fonctions de production de HuntCanvas dans un bundle en mémoire : mort, rites, physique, checkpoint et remise de mission. La matrice de locomotion couvre les huit missions, trois armures et trois sources normalisées d'entrée ; les ennemis sont retirés pour isoler la traversée. Elle ne représente pas une campagne de combat jouée de bout en bout.

Le navigateur monte les vrais composants React d'accessibilité, d'atelier et de rites. La mort et les gestes corporels utilisent le vrai handler de menu extrait de HuntCanvas ; le pendule utilise le vrai polling manette, les bindings, la physique et le renderer. Les positions initiales sont des états de fixture explicitement préparés. L'atelier utilise une confirmation localStorage native dans le parent de fixture ; les tests transactionnels du GameClient vérifient séparément la durabilité du produit.

Le script écrit `outputs/qa-hunt-v112/report.json` et des PNG réduits. Les captures sont jointes au workflow et exposées dans ses logs sous les balises `V112_CAPTURE_BEGIN` pour inspection. Le renderer de canopée de ce test utilise ses images de repli natives ; ces captures ne qualifient pas la banque d'illustrations complète. Le tactile et la manette sont émulés : aucun téléphone, contrôleur physique, performance sur matériel cible ou partie interactive complète n'est annoncé comme qualifié.

Les comptes exacts de contrôles, le commit et les liens de runs sont consignés après exécution dans la PR et la feuille Preuves. Toute limite matérielle reste `NON_QUALIFIE`.

## Historique inchangé

```sh
node scripts/check-excel-history-v112.mjs --check --tests
node scripts/check-homeworld-history-v112.mjs --check --tests
```

Les anciens classeurs et preuves restent inchangés. Les wrappers construisent une copie privée de sources ; seuls les fichiers dont la version courante diffère du freeze sont restaurés depuis le commit Git épinglé, après vérification du SHA256 publié. Les assets, captures et classeurs sont des entrées partagées en lecture et restent soumis à leurs empreintes. Les sources de l'application ne sont jamais redirigées vers cet historique.

Le contrôle V110 vérifie ses 1 386 entrées gelées. Le contrôle Homeworld V111 vérifie ses 1 433 entrées, conserve les identités Git des illustrations historiques et régénère son classeur original. Les régressions V111 continuent de s'exécuter sur le runtime actuel : une réussite historique ne remplace pas cette vérification.
