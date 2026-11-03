# V85 — sources récentes, clans et navires

## Lot préparé le 7 octobre 2026

La base est V83 `9456292f1e60f506b0c982187ca782eefbab2a81`. Les compositions Homeworld V84 reprises sont incluses : contrôle des quais, atelier, dépôt, quatre PNG transparents, meubles indépendants et haltes civiles. Les sauvegardes et les originaux existants restent préservés.

### Sources graphiques réellement récupérées

| Ensemble | PNG importés | Intégration |
| --- | ---: | --- |
| Archives locales clans, population, cavaliers, ménagerie, PHG et Badlands V7 | 1 396 fichiers distincts par SHA, 1 711 entrées de catalogue | Bibliothèque, codex et portraits de clans documentés |
| Vaisseaux du pack du 6 octobre | 31 | Galerie du hangar, identités attribuées seulement lorsque documentées |
| Drive du 7 octobre, PHG et vues de vaisseaux | 54, dont 44 matériaux et 10 vues de navires | Bibliothèque et nouvelles vues du hangar |
| Drive Badlands, six lots V8–V13 | 41 | Bibliothèque, historique, variantes du bestiaire |
| Drive PHG, dossier d'images validées du 7 octobre | 7 | Cinq références de créatures xénomorphes Kenner (Rhino bleu/orange, Snake, Panther, Night Cougar) et deux vues statiques du même Wolf masqué/sans masque ; aucune annonce de sept chasseurs nouveaux |
| Nouveaux meubles Homeworld V84 | 4 | Fournisseurs de placements des intérieurs et rues |

Les 640 variantes déclarées dans `YAUTJA_PNJ_V84_integration.zip` restent **des métadonnées sans PNG**. Le portable V66/V67 contient 126 PNG physiques. Son chiffre producteur de 288 fichiers ne représente pas 288 images présentes. Les versions antérieures sont conservées. Les archives cumulatives Badlands ne sont pas téléchargées à répétition : la base 118 et les 41 ajouts couvrent les 159 visuels documentés.

Les PNG sont conservés sans retouche. Une pose statique ne devient pas une animation complète. Les échantillons PHG ne sont pas des UV officiels certifiés. Les équipements isolés de Dek et Kwei restent des équipements, sans créer de combattants entiers. La bibliothèque permet de consulter leurs sources, groupes, variantes, statuts et dimensions. Les références du bestiaire ne recrutent ni ne débloquent aucune espèce.

Le namespace des nouveaux imports utilise un dossier C dédié pour éviter de remplir le disque D qui porte l'ancien public. Les jonctions locales ne modifient pas les chemins servis par le jeu ou enregistrés dans Git. Les archives, b64 de transfert et corpus privés restent sous `work-local/` ou `.work-local/`, ignorés par Git.

### Classeur et systèmes jouables

L'ancien classeur local V3 contient 39 feuilles et 679 fiches. Il alimente le compositeur de formations, le canyon tactique et la simulation stratégique de Korthas. Ces exercices conservent leurs propres archives. Le canyon traite les ordres, accès et objectifs, sans être présenté comme un moteur RTS de combat complet. Le mandat de campagne et son arrivée réelle sur Korthas restent à intégrer.

La Bible V6 a été récupérée intégralement depuis le Drive : original XLSX de 2 101 543 octets, SHA256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`, 139 feuilles. Son économie, ses identifiants et son expérience diffèrent de V3. Les deux versions ne sont pas fusionnées arbitrairement. Après l'accord de publication de l'utilisateur, les 975 fiches des 33 feuilles de guerre V6 sont la source par défaut du calculateur, du planificateur et du nouvel exercice de reconnaissance. Ce dernier traite les passages, le ravitaillement, la fatigue, le repos et l'expérience d'observation sans annexer un territoire ni modifier la campagne. Les archives d'exercice V3 et V6 restent séparées. L'import alternatif de JSON demeure possible en mémoire, sans upload ; sa provenance déclarée n'est pas une preuve cryptographique.

Le nouvel accès « Guerres des clans » est raccordé au menu principal, au Homeworld et aux raccourcis du pont. « Archives visuelles » ouvre la bibliothèque native. Ouvrir un de ces dossiers n'accorde aucun rang, honneur, matériel, rite, recrutement ou coque de campagne. Les variantes Badlands sont aussi consultables dans le bestiaire existant.

Le hangar expose 41 nouvelles études de navires. Le manifeste consulte le kit réel et les services du vaisseau. L'exercice de transport permet de préparer puis figer un manifeste indépendant, avec voyageurs, blessures, propriété des objets, prêts et dispositions de retour. Les capacités des simulateurs de la Bible ne sont pas attribuées à des coques canoniques par rapprochement arbitraire. L'API de départ de campagne attend encore un contrôleur de contrat, de capacités et de réservations réellement acquis.

### Dialogues et voix

Les sources V6 comprennent 730 scènes, 6 059 répliques et 400 réactions, 1 494 choix, 150 variantes conditionnelles et 210 directions de voix. Les documents complets restent préservés localement. Après l'accord utilisateur, les extractions des 10 feuilles de dialogues et 19 feuilles de navires sont servies dans `public/game/dialogues/v85/` ; l'original XLSX et les autres feuilles privées ne sont pas publiés. Le lecteur des archives du navire charge ces sources par défaut, conserve les cellules et liens, et propose aussi un import local en mémoire sans upload ni exécution de formule ou de script. Une répétition visuelle manuelle présente les répliques une à une, leurs locuteurs, gestes et conditions, avec l'effet de traduction Yautja existant. Précédent, suivant, pause, reprise et fin permettent de parcourir la scène sans lecture automatique ; les choix et variantes restent documentaires. Les requêtes annulées ou anciennes ne remplacent pas une nouvelle source sélectionnée.

Ce lecteur documentaire n'est pas l'intégration de 730 scènes jouables dans la campagne. Les choix du classeur ne produisent pas des récompenses par simple lecture. Aucune voix enregistrée, imitation d'acteur, piste de doublage ou génération TTS n'est livrée : les fiches de voix sont des indications d'interprétation.

## Autorisation et publication

La publication des nouveaux sprites et du corpus extrait avait été retenue après deux refus d'auto-review. L'utilisateur l'a ensuite explicitement autorisée par « Oui et reprend les test si besoin, et continue l'intégration en parallèle ». Les PNG ont été envoyés par lots sur la branche existante ; aucune suppression d'originaux n'a été faite. La livraison finale du code et les preuves de production sont consignées dans le rapport de QA.

Le placeholder de guerre est remplacé par les 975 fiches autorisées. Les extractions publiques de dialogues et navires sont intégrées, sans publier le classeur original ou les transferts temporaires ignorés par Git. L'autorisation ne transforme pas les exercices documentaires en missions acquises de campagne.

## Vérifications et limites

La nouvelle consigne autorise les tests. Une grande passe de régression avant gel a exécuté 3 019 tests : 2 903 réussites et 116 échecs, dont des fixtures incomplètes et des attentes d'anciennes compositions. Ce n'est pas une validation globale finale. Les contrôles ciblés après correction, le lint, TypeScript, le build Next correspondant à Vercel et les observations réelles du navigateur sont décrits séparément dans `docs/qa-v85-integration-and-release.md`. L'ancien test SSR du livrable Vinext ne valide pas le build Next actuel. La tentative de viewport mobile n'a pas changé la largeur du navigateur : aucun parcours mobile n'est certifié.

La collecte est conséquente mais ne certifie pas que chaque fichier de toutes les conversations privées ou de l'ensemble du Drive est récupéré. Les nouveaux sprites ne terminent pas toutes les animations, la capitale, les missions solo ou les campagnes de clan. Les frontières précises figurent dans les notes dédiées aux lots.
