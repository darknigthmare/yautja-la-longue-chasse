# Berceau enfoui — Contrat d’intégration et recette

Ce document complète le [secteur et son boss](README.md). Les critères ci-dessous sont **ouverts** : leur écriture n’est pas un test exécuté du jeu. La portée de cette PR reste documentaire.

## 1. Source de vérité et raccord de la carte

Conserver PLAN08 et les missions R2-M025/M026/M027 de la bible ; conserver les IDs locaux `XENO-BE-Txx` et les IDs d’assets d’origine. Les douze scènes développent **XP-Z12**, avec une entrée raccordée à **XP-Z11**. Elles ne remplacent pas les douze zones `XP-Zxx` du classeur. Le vestige inerte **XP-Z09** reste distinct de la pouponnière locale **XENO-BE-T09** et ne valide jamais la chasse. La fiche de concordance de [VERIFICATION.md](VERIFICATION.md) indique les cellules inspectées.

| Source actuelle inspectée | Utilité pour le futur raccord | Limite |
| --- | --- | --- |
| `app/game/data.ts` | Huit missions de chasse, règles de difficulté, équipements et trophées existants. | Aucune mission jouable du Berceau n’est ajoutée par la documentation. |
| `app/game/worldScreens.ts` | Découpage actuel en écrans et transitions par chasse. | Les images 3200×1440 et les deux panneaux verticaux ne sont pas des `WorldScreen` prêts à charger. |
| `app/game/systems/worldBlueprints.ts` | Routes, obstacles, grimpes et dangers. | Une racine visible n’est pas encore un point de prise ; une transparence n’est pas une collision. |
| `app/game/ecologyV8.ts` | Écologie propre aux mondes actuels. | Mycora-V, Cœur-Mère et l’Hyphe reine ne deviennent pas la Matriarche de PLAN08. |
| `app/game/systems/activeHuntSave.ts` et `app/game/save.ts` | Propriétaire de la chasse active, stockage et reprise. | Définir un contrat compatible et sa migration avant tout branchement de l’arc. |
| `docs/campagne/BIBLE_DE_CAMPAGNE.md` | Missions, rangs, crête, débrief et musiques proposées. | Les drapeaux documentés ne prouvent pas une implémentation runtime. |

L’export principal demeure historique et conservé. Pour ce secteur, cette annexe précise la forme de la reine ancrée et sa révélation en T12. Elle ne modifie ni le Quatza-Rij ni la reine de la pyramide Blooded, et n’affirme aucune identité commune avec la Reine Mère.

## 2. Géométrie, matières et états

- Importer les sprites séparément, avec leur alpha natif et leur nom d’origine. Pour les contours visuels, `content_bbox_px` utilise le seuil 16/255 ; une carte de collision dédiée reste nécessaire.
- Définir les pivots, attaches et proportions par famille. La taille de toile variable des poses ne doit pas faire bondir une tête ou changer la portée d’un tentacule entre deux états.
- Les appendices doivent être reliés à des ancrages identifiables. Ne pas relier une portion de tentacule à une autre par simple proximité si l’ordre des segments ou les attaches sont incompatibles.
- Caler les pieds du chasseur et les tabliers sur les surfaces praticables, puis tester le trajet réel. Le Perchoir du pack propose les appuis et le raccord visuels ; ses pixels ne démontrent pas la navigation.
- Conserver les contraintes V6 de XP-Z12 : trois hauteurs praticables, deux refuges, sorties annoncées et extraction de secours reliée au bassin. La corniche basse du PNG T12 ne suffit pas à les valider ; compléter la géométrie jouable et la composition si nécessaire, sans compter une zone de décor comme refuge fonctionnel.
- Préserver la profondeur fond/décor/jeu/premier plan/effets, les ajours et les silhouettes utiles. Le premier plan peut masquer une portion du corps, mais jamais cacher une attaque sans télégraphe équivalent.
- Utiliser les états réellement disponibles : 050→077, 008→081, 009→082, 029→083, 032→085, 033→086, 046→093, 025→026 et 087→088. Les changements de taille ou de forme demandent une collision réévaluée.
- La variante 079, les passages 034/035 et les vannes 030/036 sont désormais produits. Les illustrations V2.1 conservent leur géométrie historique, notamment les bouchons 078 intacts ; le raccord des nouvelles variantes et de leurs collisions reste à réaliser.
- 056/057 sont désormais deux capsules de décor fermées produites comme PNG fixes. Ils ne fournissent ni sprites de défenseurs animés, ni spawns ennemis. Les défenseurs V7 mentionnés par M026 gardent leurs identités propres et exigent une vérification d’import distincte.
- L’état après victoire conserve les routes. Les appendices 041/045 deviennent le pont inerte 043 dans la composition finale ; ils ne restent pas dressés après mort. Le bulbe disparaît dans le rendu historique V2.1 ; le sprite rompu 098 est maintenant disponible et reste à placer. Ce rendu n’est pas une règle de destruction validée.

## 3. États de progression à concevoir

Les noms ci-dessous expriment des responsabilités. Les trois drapeaux `queen.*` proviennent de la bible ; le classeur V6 utilise aussi le jalon agrégé **`firstQueenResolved`**, avec les issues `non_resolu`, `reussi`, `echoue`, `replie`. Ce sont des **contrats de conception existants à raccorder**, non des écritures runtime déjà constatées. Définir une correspondance unique avec le propriétaire de sauvegarde effectif, sans créer un second registre ou une seconde récompense pour le même événement.

| État / preuve | Déclencheur prévu | Invariants |
| --- | --- | --- |
| `queen.firstExpeditionPrepared` | M025 résolue avec préparation et itinéraire d’extraction. | Aucun déblocage de rang ni troupe recrutée automatiquement. |
| Découverte et raccourcis du Berceau | Observation ou interaction physique réussie, propre au tableau. | Ne pas ouvrir tous les passages à l’affichage d’une carte ; retours utilisables dans les deux sens. |
| Réservoir de T09 drainé | Détour et interaction locale terminés. | Le détour reste facultatif ; il ne valide ni reine ni rang. |
| État d’un essai de boss | Ancrages, membranes, fenêtre nerveuse, santé, effets actifs et équipe. | Définir ce qui est réinitialisé à la défaite et ce qui persiste ; aucun boss mort avec attaques actives après reprise. |
| `queen.firstDefeated` | Mort effective du boss validée une seule fois. | Ni crête acquise, ni extraction, ni promotion implicite. |
| Preuve de crête | Prélèvement, transport et retour réellement confirmés. | Même identité de preuve jusqu’à son exposition ; absence/détérioration représentée. |
| `queen.debriefResolved` | Retour à bord et choix de M027 résolus. | Conserver les relevés d’échec ; aucune copie du trophée ou récompense lors d’un second appel. |
| `firstQueenResolved` (jalon V6) | Issue de l’expédition consolidée à partir des preuves précédentes. | Échec/repli restent distincts d’une réussite. Le vestige XP-Z09 ne renseigne jamais une victoire. Éviter un crédit séparé de celui de la mission. |
| Conditions d’Élite | Preuve recevable + L-05 + L-06 + validation prévue par la campagne. | L’entrée dans PLAN08 ne demande pas déjà Élite. Un niveau de difficulté nommé `elite` n’est pas ce rang. |

Les balises 01/07/11 servent de repères et de candidates à la reprise. Le budget de difficulté existant demeure : **2 points de contrôle en `young-blood`, 1 en `hunter`, 0 en `elite` et `elder`**. Le futur raccord doit choisir explicitement quelles balises consomment ce budget, au lieu de donner trois reprises dans toutes les difficultés.

Le choix entre pause, rechargement, défaite, repli et sortie doit être explicite. Les futures écritures devront respecter le propriétaire de sauvegarde existant, les refus d’écriture et les protections contre une vue périmée ; aucun stockage réel n’est modifié dans cette PR.

## 4. Compagnons, déplacements et extraction

La présence d’un allié suppose recrutement, affectation au navire, aptitude et déploiement. Un poste de chasse vide ne recrute pas automatiquement son ancien occupant. Un nid de ruche ne constitue pas un animal apprivoisé.

Avant un changement vertical ou une membrane, vérifier la place et la trajectoire de chaque membre. Prévoir maintien de position, retour ou route alternative pour un compagnon incapable de franchir le passage. Conserver un état de blessure ou d’abandon jusqu’au rapatriement prévu ; ni téléportation cachée, ni doublon à bord. Le nombre et les rôles des partenaires doivent venir du système actif, sans équipe imposée par le décor.

Les montures et véhicules suivent le contrat de mobilité. Définir des zones de stationnement accessibles depuis l’arrivée ; laisser une solution à pied si leurs dimensions, leur comportement ou leurs attaches interdisent T04/T07. Les balises ne déplacent pas automatiquement une coque ou un destrier dans la ruche.

La crête et les membres valides doivent atteindre une extraction réelle. Le PNG du socle 100 ne vaut pas placement final au vaisseau. Aucune mission d’arrivée, d’extraction ou de camouflage d’une autre PR n’est déclarée fusionnée par référence à son design.

## 5. Animation, VFX, son et caméra

Le socle V2.2 réunit huit poses de la tête : **059, 060, 061, 062, 094, 095, 096 et 097**. Le bulbe rompu **098** est un organe séparé également produit. Les 42 raccords V2.3 sont maintenant disponibles : [inventaire et contrôles](RACCORDS_V23.md), [ordres de poses](SEQUENCES_RACCORDS.json). A001–A008, A010 et A037–A042 portent le total à 23 états de tête ; A009/A029 restent des états du bulbe séparé. Caler les pivots, attaches et échelles, puis produire les cycles fluides à partir de ces poses ; aucune animation en jeu n’est déjà validée.

Les priorités armement/impact/retrait, préparation/souffle/retour, exposition du bulbe, mort et prélèvement disposent de nouvelles poses clés A001–A042. A021/A022 sont des calques simultanés ; les durées et trajectoires restent à concevoir. Les écarts de ligne de base et de cadrage sont consignés dans RACCORDS_V23.md. Les effets 065/066/103 et les nouveaux PNG 067–072, 102 et 104–108 sont disponibles. Leur émission, durée, animation et raccord en scène restent à réaliser ; [REPRISE.md](REPRISE.md) conserve le suivi des images complétées.

Attacher l’effet et son son à l’événement qui le produit : origine de bouche, point de contact au sol, membrane ou attache rompue. La pause fige la même horloge ; une reprise ne rejoue pas tous les impacts. Le marqueur de danger doit rester lisible avec effets réduits, contraste faible et écran étroit.

MUS-41, MUS-42 et MUS-07 sont des intentions musicales de la bible. Prévoir les sons de tension, souffle, impact, membrane, acidité et chute séparément. Aucun SFX ou morceau nouveau n’a été trouvé dans ce pack d’images ; aucune validation d’écoute n’est revendiquée.

T04 et T07 nécessitent une caméra verticale avec anticipation des prises. T12 doit révéler la tête entière au moment prévu tout en conservant la lecture de la zone d’esquive. Les paramètres exacts de caméra, zoom et limites seront choisis dans le vrai moteur, puis testés au clavier, au tactile et à la manette.

## 6. Recette à exécuter lors de l’implémentation

Tous les contrôles **XBE-Q01 à XBE-Q28** ci-dessous sont **à réaliser**. Les contrôles documentaires du pack sont consignés séparément dans VERIFICATION.md.

| ID | Situation et résultat attendu |
| --- | --- |
| XBE-Q01 | PLAN08/M025–M027 et les zones globales restent conservés ; les 12 tableaux développent XP-Z12 depuis XP-Z11, sans renommer une des huit chasses ni assimiler T09 au vestige XP-Z09. |
| XBE-Q02 | L’accès Blooded et les préparatifs évitent le verrou circulaire « Élite pour tuer sa première reine ». |
| XBE-Q03 | L-05 et L-06 absents : reine vaincue et crête rapportée ne donnent pas à eux seuls le rang Élite. |
| XBE-Q04 | Défaite ou sortie sans crête : observations autorisées conservées, aucun trophée ni promotion. |
| XBE-Q05 | Aller principal T01→T12 réalisable avec le matériel minimal autorisé ; aucun passage ne dépend d’un sprite absent. |
| XBE-Q06 | Retour T12→XP-Z11 ou extraction de secours possible après relâchement des tentacules et affaissement des tissus ; sorties annoncées et reliées au trajet physique. |
| XBE-Q07 | Raccourcis T06↔T02, T07↔T03 et T10↔T07 fonctionnent dans les deux sens après leur ouverture réelle. |
| XBE-Q08 | Ignorer T06 et T09 laisse l’expédition et le boss terminables. |
| XBE-Q09 | Trois balises physiques respectent les budgets de reprise 2/1/0/0 selon la difficulté. |
| XBE-Q10 | Dans le Berceau, la tête entière de la reine active n’est visible qu’en T12 ; T09 demeure une pouponnière et T07 une suggestion enfouie. Le vestige global XP-Z09 reste inerte et sans validation de reine. |
| XBE-Q11 | Tabliers, racines et chasseur gardent des appuis réels ; aucune plateforme ou porte flottante n’empêche une interaction. T12 offre les trois hauteurs et deux refuges prévus pour XP-Z12. |
| XBE-Q12 | T04/T07 : caméra, prises et sortie restent lisibles dans les deux directions et après redimensionnement. |
| XBE-Q13 | Chaque tentacule reste relié à son ancrage pendant armement, contact, retrait et section. |
| XBE-Q14 | Deux ancrages et deux membranes changent l’état du boss une seule fois ; les fenêtres sont encore accessibles. |
| XBE-Q15 | Jet acide : origine et direction suivent la gueule active après échelle/miroir ; aucun effet fixé à l’écran. |
| XBE-Q16 | Danger, dégâts et télégraphes coïncident pour balayage, perforation, capture, morsure et souffle. |
| XBE-Q17 | Pause, reprise, ralenti et baisse d’effets conservent les horloges et n’ajoutent pas d’impacts. |
| XBE-Q18 | Changement de pose : couronne complète, pivot stable, ajours propres et aucune variation de taille involontaire. |
| XBE-Q19 | Mort : attaques désactivées, tête inerte, végétation maintenue et route de retour praticable. |
| XBE-Q20 | Aucun 056/057 n’est compté comme ennemi animé ; leurs futures capsules n’engendrent pas de recrutement. |
| XBE-Q21 | Compagnons non recrutés/non affectés inapparents ; déployés non dupliqués à bord, obstacles et blessures respectés. |
| XBE-Q22 | Monture ou véhicule incompatible reste dans un stationnement atteignable ; aucun transport automatique dans l’arène. |
| XBE-Q23 | Sauvegarder/recharger chaque phase donne un état cohérent de boss, raccourcis, réservoir, équipe et crête. |
| XBE-Q24 | Échec d’écriture, double confirmation et vue périmée ne dupliquent ni trophée, rang, récompense ni nettoyage de ruche. |
| XBE-Q25 | Repli avec allié manquant ou blessé suit les règles d’extraction ; l’issue et les relevés sont conservés. |
| XBE-Q26 | Aucun Warp, avatar de film, rang, vaisseau, habitat personnel ou monde-ruche final n’est débloqué par association de nom. |
| XBE-Q27 | Son localisé, contraste, options d’effets, clavier/tactile/manette et écran étroit conservent la compréhension du combat. |
| XBE-Q28 | Mesure dans la scène finale réelle : absence de ressource manquante, temps de trame, mémoire et lisibilité à la charge prévue. |

Une génération d’image, un canal alpha, un inventaire sans doublon ou une construction réussie ne remplacent pas ces recettes. `humanArtValidation` reste **false** tant que la revue artistique humaine prévue par le projet n’a pas eu lieu.
