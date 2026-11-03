# Berserker / Mr. Black masqué — admission native V94

Le lot contient **dix tentatives OpenAI, neuf PNG originaux conservés et un échec de génération explicite**. Huit pages peuvent alimenter quatre clips **partiels, uniquement vers la droite** pour l’apparence `berserker-avec-casque-ba1f7a7b1e`. Les 33 dessins distincts sont sélectionnés par rectangles réellement séparés ; les autres cellules des mêmes PNG restent hors des définitions runtime. Aucun cycle détaillé complet, vue gauche, nouvel idle ou dizzy n’est annoncé.

| Famille | Dessins droite admis | Pages | Durée native | Limite |
| --- | ---: | --- | ---: | --- |
| Intro | 8 | 002, 003 | 72 ticks / 1 200 ms | Moins de 12 dessins ; posture d’arrivée puis garde |
| Victoire de manche | 5 | 004, 005 | 120 ticks / 2 000 ms | Gestuelle courte de domination, sans trophée inventé |
| Défaite de manche | 10 | 006, 007 | 120 ticks / 2 000 ms | Non létale ; deux poses initiales debout de 007 exclues du raccord |
| Taunt | 10 | 009, 010 | 90 ticks / 1 500 ms | Défi gestuel cosmétique ; aucune mécanique de stun ajoutée |
| Idle | 0 | 001 archivée | — | Aucune cellule entière suffisamment séparée |
| Attente de fatalité / dizzy | 0 | 008 sans PNG | — | La génération a échoué ; erreur originale conservée |

Toutes les familles admises sont non bouclées. Après leur durée, le consommateur peut tenir le dernier dessin. Le reduced motion tient également leur dernière pose ; cette tenue n’est pas comptée comme une animation supplémentaire. La défaite de manche ne représente ni une mort ni une fatalité.

## Apparence et sources

La référence utilisateur locale est `public/game/sprites/v44/user-hunters/ba1f7a7b1e6b20360c7506f17a73dd9ca35caa38599b91dac8eb09fa8f494dfc.png`, SHA-256 `ba1f7a7b1e6b20360c7506f17a73dd9ca35caa38599b91dac8eb09fa8f494dfc`. Le contrôle visuel porte sur sa morphologie massive, son masque sombre à mandibule claire, ses dreadlocks, ses armures et son canon asymétrique. Les cellules gauche ne sont pas admises : la continuité de l’équipement et de sa latéralité n’est pas suffisamment fiable. Aucun miroir logiciel n’est utilisé pour les remplacer.

La [page officielle du film Predators](https://www.20thcenturystudios.com/movies/predators) sert au contexte de l’œuvre. Le [catalogue officiel NECA Berserker](https://necaonline.com/2019/02/alien-predator-classics-5-5-action-figures-berserker-neomorph-assortment/) a fourni un extrait de recherche primaire ; la page complète a retourné 403. Ces sources ne prouvent pas les gestes précis générés. Les mouvements sont des adaptations pour le jeu, pas des animations canoniques certifiées 1:1. Aucun salut d’Elder, objet de trophée, personnage auxiliaire ou arme supplémentaire n’a été inventé pour ce lot.

## Géométrie et échelle

Les neuf fichiers produits sont réellement des PNG RGBA de **1 254 × 1 254 pixels**, même lorsque le prompt demandait une autre taille. Les mesures utilisent leur alpha natif, un seuil de bruit de 2 et des gouttières transparentes observées. Un mauvais découpage théorique n’est jamais corrigé par retouche ou export de cellule. Les archives et les copies publiques gardent les mêmes octets ; seuls les rectangles et pivots metadata changent.

Le générateur n’a pas conservé une stature identique entre pages. `pageBodyHeightPx` fournit donc **une seule référence debout fixe par page**, appliquée uniformément à toutes ses poses :

| Page | Stature source | Témoin debout (rangée, colonne à partir de 0) |
| --- | ---: | --- |
| 002 | 370 px | 0, 1 |
| 003 | 384 px | 0, 0 |
| 004 | 414 px | 1, 0 |
| 005 | 404 px | 0, 0 |
| 006 | 437 px | 0, 0 |
| 007 | 443 px | 0, 0 — témoin exclu de la timeline |
| 009 | 396 px | 0, 0 |
| 010 | 385 px | 2, 1 |

Une pose à genoux de 007 n’occupe que 304 pixels de haut mais conserve la référence debout de 443 pixels. Elle ne grandit pas artificiellement jusqu’à la taille d’un corps debout. Les pivots des pieds sont mesurés sur les pixels source ; le consommateur réel ajoute son ajustement de contact au sol. Les références par page réduisent les sauts d’échelle sans garantir la continuité des proportions générées, de la pose, des dreadlocks ou des articulations.

## Preuves et intégration

`art-source/v94/pit/berserker/prompts.json` conserve les dix prompts, leurs références et résultats. `manifest.json`, `intake.json`, `partial-native-geometry.json`, les neuf originaux et `008-generation-error.txt` rendent visibles chaque admission, refus et échec. `original-byte-proof.log` conserve la comparaison des neuf originaux avec les sorties builtin.

`app/game/data/pitLifecycleBerserkerV94.json` contient uniquement les quatre définitions exactes autorisées. Le raccord au registre global est réservé au lot d’intégration du parent ; ce catalogue seul ne constitue pas une preuve de publication. Le test `tests/pit-berserker-lifecycle-v94.test.mjs` décode les vrais PNG, vérifie les SHA, alpha, cellules distinctes et exclusions, puis charge les pages avec le vrai loader et exerce chaque frame par les cues intro, résultat de manche/match et taunt. Il vérifie l’échelle par page, le contact au sol, l’absence de miroir ou modification de simulation, les tenues terminales et le refus d’un autre masque ou facing. Ce contrôle déterministe ne remplace pas une revue humaine de toutes les transitions en production.
