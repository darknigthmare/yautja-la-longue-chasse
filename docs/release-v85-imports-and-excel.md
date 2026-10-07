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
| Drive PHG, dossier de portraits validés du 7 octobre | 7 | Rhino bleu/orange, Snake, Panther, Night Cougar et Wolf masqué/sans masque ; portraits statiques consultables |
| Nouveaux meubles Homeworld V84 | 4 | Fournisseurs de placements des intérieurs et rues |

Les 640 variantes déclarées dans `YAUTJA_PNJ_V84_integration.zip` restent **des métadonnées sans PNG**. Le portable V66/V67 contient 126 PNG physiques. Son chiffre producteur de 288 fichiers ne représente pas 288 images présentes. Les versions antérieures sont conservées. Les archives cumulatives Badlands ne sont pas téléchargées à répétition : la base 118 et les 41 ajouts couvrent les 159 visuels documentés.

Les PNG sont conservés sans retouche. Une pose statique ne devient pas une animation complète. Les échantillons PHG ne sont pas des UV officiels certifiés. Les équipements isolés de Dek et Kwei restent des équipements, sans créer de combattants entiers. La bibliothèque permet de consulter leurs sources, groupes, variantes, statuts et dimensions. Les références du bestiaire ne recrutent ni ne débloquent aucune espèce.

Le namespace des nouveaux imports utilise un dossier C dédié pour éviter de remplir le disque D qui porte l'ancien public. Les jonctions locales ne modifient pas les chemins servis par le jeu ou enregistrés dans Git. Les archives, b64 de transfert et corpus privés restent sous `work-local/` ou `.work-local/`, ignorés par Git.

### Classeur et systèmes jouables

L'ancien classeur local V3 contient 39 feuilles et 679 fiches. Il alimente le compositeur de formations, le canyon tactique et la simulation stratégique de Korthas. Ces exercices conservent leurs propres archives. Le canyon traite les ordres, accès et objectifs, sans être présenté comme un moteur RTS de combat complet. Le mandat de campagne et son arrivée réelle sur Korthas restent à intégrer.

La Bible V6 a été récupérée intégralement depuis le Drive : original XLSX de 2 101 543 octets, SHA256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`, 139 feuilles. Son économie, ses identifiants et son expérience diffèrent de V3. Les deux versions ne sont pas fusionnées arbitrairement. La V6 décrit 975 fiches de guerre, 30 types d'équipes, 36 territoires et 70 passages. Son calculateur et son planificateur de routes sont distincts de V3. Dans « Guerre des clans → Bible V6 », un sélecteur charge les règles privées depuis un JSON local, uniquement en mémoire : aucun upload, stockage permanent ou effet de campagne. Le contexte des règles importées reste isolé du contexte publié par défaut. La provenance déclarée est distinguée d'une preuve cryptographique du JSON chargé.

Le nouvel accès « Guerres des clans » est raccordé au menu principal, au Homeworld et aux raccourcis du pont. « Archives visuelles » ouvre la bibliothèque native. Ouvrir un de ces dossiers n'accorde aucun rang, honneur, matériel, rite, recrutement ou coque de campagne. Les variantes Badlands sont aussi consultables dans le bestiaire existant.

Le hangar expose 41 nouvelles études de navires. Le manifeste consulte le kit réel et les services du vaisseau. L'exercice de transport permet de préparer puis figer un manifeste indépendant, avec voyageurs, blessures, propriété des objets, prêts et dispositions de retour. Les capacités des simulateurs de la Bible ne sont pas attribuées à des coques canoniques par rapprochement arbitraire. L'API de départ de campagne attend encore un contrôleur de contrat, de capacités et de réservations réellement acquis.

### Dialogues et voix

Les sources V6 comprennent 730 scènes, 6 059 répliques et 400 réactions, 1 494 choix, 150 variantes conditionnelles et 210 directions de voix. Les documents privés complets sont préservés localement. Le lecteur dans les archives du navire conserve les cellules et les liens entre scènes, répliques, options et variantes. Il propose un import local en mémoire, sans upload et sans exécuter de formule ou de script. Une répétition visuelle manuelle présente les répliques une à une, leurs locuteurs, gestes et conditions, avec l'effet de traduction Yautja existant. Précédent, suivant, pause, reprise et fin permettent de parcourir la scène sans lecture automatique ; les choix et variantes restent documentaires.

Ce lecteur documentaire n'est pas l'intégration de 730 scènes jouables dans la campagne. Les choix du classeur ne produisent pas des récompenses par simple lecture. Aucune voix enregistrée, imitation d'acteur, piste de doublage ou génération TTS n'est livrée : les fiches de voix sont des indications d'interprétation.

## Publication retenue

Deux refus d'auto-review empêchent la publication externe du nouveau lot sans une autorisation humaine explicite : publication des nouveaux sprites sur GitHub/Vercel, et publication du corpus intégral de la Bible privée. Les demandes correspondantes ont été présentées à l'utilisateur. Aucun contournement ni transfert GitHub du nouveau payload n'a eu lieu après le refus.

En attendant, les commits sont locaux, les imports et lecteurs sont préparés, et le corpus V6 n'est pas copié dans les fichiers publiés. Le JSON runtime de guerre V6 reste un placeholder tant que la diffusion n'est pas autorisée. La lecture locale des sources privées reste possible sans les publier. Cette note n'affirme ni push du lot V85 ni déploiement Vercel READY.

## Consigne sans vérification

Aucun test, lint, typecheck, audit, build local de validation, contrôle visuel navigateur, parcours mobile ou vérification publique V85 n'a été lancé. Les lectures de sources, copies d'originaux, SHA et déduplications sont des opérations d'import et de provenance. Le build nécessaire à une éventuelle publication Vercel n'est pas désactivé.

La collecte est conséquente mais ne certifie pas que chaque fichier de toutes les conversations privées ou de l'ensemble du Drive est récupéré. Les nouveaux sprites ne terminent pas toutes les animations, la capitale, les missions solo ou les campagnes de clan. Les frontières précises figurent dans les notes dédiées aux lots.
