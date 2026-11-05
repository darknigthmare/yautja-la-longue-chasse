# Xeno Prime — Le Berceau enfoui

Complément de la [bible de campagne](../README.md), intégré le **5 novembre 2026** à partir du pack d’illustrations V2.1. Ce document détaille un secteur de Xeno Prime pour **Yautja : La Longue Chasse**. Il conserve les missions et les autres annexes de la bible.

## 1. Place dans la campagne et statut

| Référence existante | Raccord du Berceau enfoui |
| --- | --- |
| `PLAN08`, Xeno Prime / `XP-Z12`, Arène de la reine active | Le Berceau développe localement ce secteur final, accessible depuis XP-Z11 ; aucune nouvelle planète ni renumérotation globale. |
| `R2-M025`, Préparer Xeno Prime | Reconnaissance depuis la base d’approche, risques acides, contenants et itinéraire d’extraction ; préparation du futur accès au Berceau via XP-Z11. |
| `R2-M026`, La première reine / `L-07` | Traversée du secteur, combat contre la Matriarche enracinée, récupération physique de la crête et extraction. |
| `R2-M027`, Ce que la reine a changé | Retour au vaisseau personnel, soins, inspection du trophée ou des relevés d’échec et débrief. |
| `L-05` et `L-06` | Quatza-Rij solitaire et rites du clan conservés comme autres conditions d’Élite. Le combat contre cette reine ne les remplace pas. |

Xeno Prime est **un arc écrit après les huit chasses de R2-M024**, actuellement décrit comme « Texte seul ». Il n’est ni une neuvième chasse déjà jouable, ni un remplacement de Mycora-V/Cœur-Mère. Les douze tableaux ci-dessous sont des subdivisions de niveau ; ils n’ajoutent pas douze missions au compte historique de 68 fiches.

L’accès à l’expédition suit la préparation Blooded et les rites prévus par la campagne révisée. Exiger déjà le rang Élite pour cette première reine créerait un verrou circulaire. Le vaisseau personnel, acquis à Blooded, suffit ; le Clan Ship et le Warp ne sont pas des prérequis.

La victoire, l’extraction de la crête et le retour sont distincts. `queen.firstDefeated` ne doit pas suffire à accorder `rank.Elite` : la preuve rapportée, L-05 et L-06 restent nécessaires. Les noms de drapeaux repris ici sont des **contrats documentaires de la bible**, pas la preuve que ces écritures existent déjà dans le moteur.

### Ressources et documents

| Document | Rôle |
| --- | --- |
| [ASSETS.md](ASSETS.md) | Inventaire des 85 sprites et six fonds, poses du boss, archives et limites de production. |
| [DONNEES_ASSETS.json](DONNEES_ASSETS.json) | Données vérifiables des fichiers réellement produits, dimensions, alpha et empreintes. |
| [REPRISE.md](REPRISE.md) · [REPRISE_ASSETS.json](REPRISE_ASSETS.json) | Les 23 sprites manquants, prompts, références et dépendances de production. |
| [SCENES_ILLUSTREES.json](SCENES_ILLUSTREES.json) | Douze compositions, 312 placements et variantes illustrées avant/après. |
| [COMPOSITION_SOUFFLE.json](COMPOSITION_SOUFFLE.json) | Placement de la tête 096 et du jet 103 dans l’illustration d’attaque. |
| [INTEGRATION_ET_QA.md](INTEGRATION_ET_QA.md) | Raccords de progression, interactions, sauvegardes, caméra, compagnons et critères de recette ouverts. |
| [VERIFICATION.md](VERIFICATION.md) | Sources consultées et contrôles documentaires réalisés pour cet ajout. |

Les binaires restent dans les archives sources accessibles depuis ASSETS.md, comme pour le complément Warp. Cette PR ajoute leur catalogue et les règles d’intégration ; elle ne les importe pas dans `public/`.

## 2. Direction du secteur

Le parcours passe d’une forêt fongique humide à une ruche enfouie. Les racines, poches et filaments rencontrés en surface appartiennent au même réseau de tissus que les ancrages du bassin final. Les tentacules apparaissent progressivement comme des obstacles, puis comme des attaques coordonnées par la reine.

La palette commune est **chitine noire, cuivre humide, cyan discret et ambre**. Le liquide acide est jaune-vert. Basalte et résine structurent les chemins ; calices, membranes et nerfs assurent la continuité visuelle. Les silhouettes utiles au déplacement restent lisibles devant le fond.

Les références demandées — flore de Felucia, entité planétaire de Starship Troopers et reine d’Alien Resurrection — sont des **inspirations visuelles pour une création originale du projet**. Elles ne font entrer ni Felucia ni une espèce de Starship Troopers dans la continuité Yautja. Elles ne certifient pas une reproduction canonique 1:1 de la reine d’un film.

La **Matriarche enracinée** est la reine du Berceau. Elle reste distincte de la Matriarche Sandmaw, des Matriarches politiques Yautja, de la Reine Mère de l’étape Adjudicator et de la planète vivante révélée dans l’arc Black God. Son réseau local suggère un organisme territorial ; il ne résout ni ne dévoile ces arcs ultérieurs.

## 3. Identités et échelle du niveau

Les tableaux portent les identifiants locaux **`XENO-BE-T01` à `XENO-BE-T12`**. Les numéros 01–12 du pack sont conservés comme identifiants d’origine. **Décision de raccord de cette annexe : les douze tableaux développent le secteur global `XP-Z12`, Arène de la reine active, depuis une entrée reliée à `XP-Z11`.** Il s’agit d’un approfondissement local de ce secteur, pas d’un remplacement de toute la planète par les douze compositions.

Le classeur V6 conserve ses zones globales `XP-Z01` à `XP-Z12`. **`XP-Z09`, Tête de reine géante au sol, reste un vestige inerte et contournable qui ne valide jamais la première reine** (`Xeno Prime!A14:L14`). **`XENO-BE-T09` est la pouponnière locale**, sans identité commune avec XP-Z09. La reine active de `XP-Z12` (`Xeno Prime!A17:L17`) est développée ici comme Matriarche enracinée, vivante jusqu’au combat local T12. Les numéros ne servent jamais de table de correspondance implicite.

Les références de sprites utilisent l’espace `XENO-BE-001` à `XENO-BE-108`, avec conservation du numéro et du nom de fichier du pack. Les fonds utilisent `XENO-BE-BG01` à `XENO-BE-BG06`. Ainsi, un sprite Xeno 097 absent ne se confond pas avec un ID 097 du Warp ou d’un autre lot.

L’entrée locale T01 est le rebord fongique du grand bassin enfoui, atteint depuis l’antichambre XP-Z11. Les calices et la canopée des premiers tableaux poussent dans cette dépression ouverte et ses failles ; la descente mène aux tissus internes du même bassin. Ce raccord conserve la progression depuis l’antichambre : T01 ne ramène pas au point d’atterrissage global XP-Z01 et ne recommence pas la traversée de la planète.

La plupart des compositions mesurent **3 200 × 1 440 px** ; T04 mesure **2 000 × 2 560 px**, T07 **2 100 × 2 560 px**. Ce sont des toiles de composition. Elles ne définissent pas encore les dimensions des collisions, les mètres du monde ou la taille de la fenêtre de jeu.

## 4. Traversée des douze tableaux

Les usages, dangers et objectifs ci-dessous constituent la conception à intégrer. Les états réellement dessinés sont distingués des variantes absentes dans les données d’assets.

| Tableau | Lieu et fonction | Lecture, interaction ou menace | État illustré / limite |
| --- | --- | --- | --- |
| T01 | **La Lisière des exuvies** : arrivée et première balise | Lire les résines, traces et coques ; repérer la route de retour avant de s’engager. | La balise et les coques restent en place. L’exuvie suspendue 028 manque encore. |
| T02 | **La Forêt des calices noirs** : progression sous la voûte fongique | Approcher les filaments sans confondre décor et zone de détection ; observer les œufs. | Œuf fermé/ouvert disponible. Les filaments en alerte 084 existent, leur état calme 031 manque. |
| T03 | **Le Lit de la rivière morte** : première traversée bloquée | Comprendre la préparation d’un coup de tentacule, puis passer pendant son retrait ; repérer la remontée de T07. | Tentacule affaissé en pont et appendice sectionné disponibles. |
| T04 | **Les Troncs étranglés** : montée verticale | Enchaîner prises racinaires et branches ; reconnaître le constricteur lié à son ancrage. | État sectionné disponible ; collision des prises et caméra verticale à réaliser. |
| T05 | **La Canopée des membranes** : jonction de la forêt et de la ruche | Lire les appuis du pont suspendu, les poches et les conduits ; choisir le détour par T06. | Pont affaissé, poches contractées et conduit éteint disponibles. Le bouchon 078 reste intact tant que 079 manque. |
| T06 | **Le Perchoir abandonné** : halte et raccourci | Inspecter le poste Yautja ; rétablir la passerelle vers T02. | Passerelle 050→077 illustrée, tablier raccordé au perchoir et chasseur posé sur la surface. Ce rendu ne prouve pas la collision. |
| T07 | **La Faille qui respire** : descente et deuxième balise | Franchir les évents sur un rythme lisible ; découvrir une masse sous la croûte, sans révéler la tête entière. | Évent fermé disponible ; souffle de vapeur 068 manquant. |
| T08 | **Les Galeries sous la peau** : réseau nourricier | Suivre les conduits ; observer le cocon et les attaches ; choisir la dérivation de T09 ou le passage vers T10. | Cocon suspendu 027 et conduit éteint disponibles ; les nids 056/057 ne sont pas encore dessinés. |
| T09 | **La Pouponnière de dérivation** : détour facultatif | Drainer le réservoir pour réduire une nuisance locale et obtenir une fenêtre de traversée. Le trajet principal reste possible sans ce détour. | Réservoir vidé, œufs ouverts et coques vides disponibles. Les vannes 030/036 manquent. **Aucune tête entière de reine ici ; le vestige global XP-Z09 reste ailleurs.** |
| T10 | **Le Nœud des racines** : convergence des ancrages | Reconnaître les attaches motrices déjà rencontrées ; libérer un accès et préparer le dernier passage. | Constricteur sectionné et tentacule affaissé disponibles. Le bouchon reste intact faute de variante brisée. |
| T11 | **La Lèvre silencieuse** : dernière balise, pause et lecture du bassin | Contraste sonore, observation de la sortie et préparation de l’arène ; aucune apparition anticipée de la tête complète. | Vue avant/après identique : aucune transformation locale n’est fabriquée pour gonfler le contenu. |
| T12 | **Le Bassin de la Matriarche** : révélation et boss | Tête géante au sol, couronne entière, ancrages et tentacules ; corridor de combat à gauche et corniche basse. | Sept poses de tête disponibles, état après victoire et composition de souffle. Agonie 097 et bulbe rompu 098 absents. |

### Parcours et raccords

**Parcours principal :** T01 → T02 → T03 → T04 → T05 → T07 → T08 → T10 → T11 → T12.

**Détours :** T05 ↔ T06 ; T08 ↔ T09 ↔ T10. **Raccourcis à ouvrir :** T06 ↔ T02, T07 ↔ T03, T10 ↔ T07. Les deux sens doivent être praticables après ouverture. Les liens du catalogue d’illustrations ne constituent pas une preuve de passages fonctionnels dans le jeu.

Les balises de T01, T07 et T11 sont trois repères physiques. Leur emploi comme reprise dépend du budget de points de contrôle de la difficulté choisie ; elles ne créent pas trois reprises gratuites. Les difficultés `young-blood`, `hunter`, `elite`, `elder` ne sont pas les rangs narratifs du joueur.

L’extraction reprend les passages préparés par M025 et les raccourcis réellement ouverts. La victoire ne retire ni le sol, ni les plateformes, ni la végétation. Un pont organique nécessaire au retour doit conserver un appui praticable ou disposer d’un autre trajet accessible : le relâchement des tentacules ne doit pas enfermer le joueur.

Le raccord global reste **XP-Z11 → XP-Z12 / T01 → … → T12**, puis retour vers XP-Z11 ou extraction de secours reliée au bassin. Le classeur exige pour XP-Z12 **trois hauteurs praticables, deux refuges et des sorties annoncées** (`Xeno Prime!E17:I17`). Ces contraintes restent à réaliser dans l’arène de T12. La composition actuelle montre un corridor et une corniche basse ; elle ne démontre pas à elle seule les trois hauteurs ni les deux refuges. Leur placement et l’accès à l’extraction doivent être résolus avec la géométrie jouable, sans déplacer la révélation complète du boss avant T12.

## 5. La Matriarche enracinée

### Silhouette et révélation

La tête est **immense, vivante, posée et enracinée au sol**, avec une couronne ajourée complète. Son corps n’est pas une reine bipède marchant dans l’arène. Les attaques se font par la gueule, le souffle et les tentacules rattachés aux tissus du bassin. L’image 064 annonce une masse enfouie ; seule T12 révèle la tête entière de cette reine active dans le Berceau. Le vestige mort de XP-Z09 conserve son existence hors du secteur local.

Pour ce secteur, les anciens besoins génériques « reine : marche/charge » de M026 sont précisés en **morsure, recul de la tête, souffle, balayage, perforation et capture par appendices**. La fiche historique reste conservée ; cette annexe définit la forme spécifique demandée pour le Berceau, sans supprimer les besoins d’autres reines mobiles du jeu.

### Combat prévu en trois étapes

| Étape | Objectif et fenêtre | Réaction attendue | État de production |
| --- | --- | --- | --- |
| 1 — Ancrages moteurs | Identifier puis neutraliser deux ancrages pendant les fenêtres de retrait des tentacules. | Moins de secteurs couverts par les balayages ; appendices concernés sectionnés ou affaissés. | Poses et états fixes disponibles ; détection des coups, chronologie et règles à intégrer. |
| 2 — Membranes respiratoires | Exposer puis ouvrir deux membranes sans rester dans l’axe du souffle. | Préparation de souffle plus lisible ; accès au nœud nerveux selon le cycle. | Membrane royale 046 et déchirée 093 disponibles ; animation et compte des deux cibles à créer. |
| 3 — Bulbe nerveux | Exploiter une fenêtre de vulnérabilité du bulbe et confirmer la défaite de la reine. | Tête inerte, appendices relâchés, puis accès physique à la crête. | Bulbe 063 et tête morte 062 disponibles ; 097/098 manquent. L’illustration retire actuellement le bulbe après victoire. |

Les seuils de PV, durées, dégâts, coûts et résistances restent des paramètres d’équilibrage à définir. Les deux ancrages et deux membranes sont des objectifs de combat proposés ; ils ne signifient pas quatre nouveaux sprites déjà produits.

### Attaques et télégraphes

| Action | Lecture avant danger | Poses / effets utilisables | Travail restant |
| --- | --- | --- | --- |
| Balayage bas | Appendice armé, tension du tissu et départ sonore localisé | 089, 038, 043 | Cycle continu, trajectoire, temps d’esquive et retour. |
| Perforation du sol | Point d’émergence annoncé avant l’impact | 039, 040, 090 | Marque au sol, poussière 070 et onde 071 ; aucune collision invisible. |
| Capture | Anse ouverte qui se referme, laissant un trajet de sortie | 041, 091 | Saisie, libération, limites avec compagnons et interruption. |
| Fouet diagonal | Armement en hauteur puis retrait visible | 045, 092 | Ordre de profondeur, espace sûr et raccords des segments. |
| Morsure | Gueule ouverte et avancée limitée à son ancrage | 059, 094, 095 | Portée, recul et contact ; aucune translation arbitraire du berceau. |
| Souffle acide | Préparation lisible, puis jet lié à la bouche | 060, 096, 103 ; flaque 065 et globule 066 | Animation et collisions du jet ; éclaboussures 104, condensation séparée 105 et suintement 108 manquants. |

La version illustrée dirige la gueule et le jet vers la gauche. Le jet 103 doit suivre l’ancre de bouche de la pose active, y compris après changement d’échelle ou miroir complet de la scène. Son pivot ne doit pas être recalé à l’écran indépendamment de la tête. [COMPOSITION_SOUFFLE.json](COMPOSITION_SOUFFLE.json) conserve la démonstration exacte : elle ne fournit pas des ancres universelles pour toutes les poses.

Le boss réagit aux événements de sa zone et aux signaux de ses tissus. Une mise en scène de réseau nerveux n’autorise pas une connaissance permanente de la position d’un joueur masqué. Perception, perte de cible et recherche doivent être conçues avec les systèmes de chasse existants.

### Fin et trophée

L’image 100 représente un **trophée de couronne sur socle**. Sa présence après victoire dans l’illustration est un symbole de récompense, pas une acquisition ou un socle qui apparaît magiquement dans le bassin. En jeu, concevoir l’extraction de la crête, son transport et son exposition au vaisseau. Le fragment 054 peut servir de référence matérielle ; il ne constitue pas une deuxième reine vaincue.

Une défaite sans crête permet de conserver les observations prévues par M026, sans trophée ni promotion. Une crête détruite ou trop endommagée reste soumise au débrief de M027. Une sauvegarde/reprise ne doit jamais dupliquer la preuve ou compter plusieurs nettoyages de ruche pour le même événement.

## 6. Cohérence avec les autres systèmes

- **Compagnons :** les règles [ALL-01 à ALL-10](../COMPAGNONS_ET_ALLIES_PREMIUM.md) restent applicables. Aucune créature du décor ne devient un compagnon. Recrutement, affectation, aptitude et places réelles précèdent le déploiement. La reine n’impose pas d’effacer le soutien permis par la campagne ; le rite Quatza-Rij solitaire demeure, lui, solitaire.
- **Vaisseaux :** M025 prépare l’approche et l’extraction avec la coque détenue. Le secteur n’accorde pas de Clan Ship, d’occupants ou de quartiers personnels. Un allié déployé n’est pas dupliqué dans le vaisseau.
- **Mobilité :** appliquer le [contrat véhicules et destriers](../mobilite/README.md). Définir les zones de stationnement et l’accès à pied avant T04/T07 ; aucune monture ne se téléporte à travers une membrane, une échelle ou une arène incompatible. La visibilité de l’arrivée et le camouflage de coque gardent leurs propres règles.
- **Warp :** cette expédition est physique sur PLAN08. Elle n’est pas une époque terrestre ni une Chronique de film. Aucun portail, avatar, transfert d’inventaire ou rang supplémentaire n’est attribué par la seule victoire.
- **Queen Hunt :** cette première preuve peut alimenter la progression ultérieure selon la politique de comptage définie pour ce mode. Ne pas ajouter implicitement une ruche supplémentaire à chaque rechargement, sortie d’arène ou exposition du trophée.
- **Codex et audio :** découvrir les lieux et la Matriarche au fil du parcours. Le catalogue de production contient les spoilers, le codex joueur ne doit pas tous les afficher à l’arrivée. Réutiliser les intentions MUS-41 pour l’approche, MUS-42 pour le combat et MUS-07 pour la présentation de la crête ; aucun fichier audio de ces morceaux n’est livré dans ce pack.

Les 85 sprites sont des illustrations fixes et poses clés, et les six fonds des images opaques. Les animations, collisions, comportements, transitions, sauvegardes, SFX et qualification en jeu suivent le [plan d’intégration](INTEGRATION_ET_QA.md). Leur état ne passe pas à « terminé » par l’ajout de cette annexe.
