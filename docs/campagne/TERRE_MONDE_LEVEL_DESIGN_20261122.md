# Terre — Lore, monde, level design et modularité

Nov 22, 2026 · @darknigthmare

Quatrième document de la série Terre, après l'[avenant](TERRE_TERRAIN_DE_CHASSE_20261121.md), le [gameplay](TERRE_GAMEPLAY_MISSIONS_20261121.md), l'[inventaire](TERRE_PRODUCTION_COMPLETE_20261121.md) et les [fiches de mission](TERRE_FICHES_MISSIONS_20261122.md). Il approfondit le **lore**, l'**histoire**, le **monde**, le **level design** des 20 sites et la **modularité** de la production (bâtiments, zones, PNJ, météo, missions).

**Règle de lecture.** **[Lore]** = appuyé sur le lore établi. Tout le reste est *(proposé)*. Aucun lieu des films n'est utilisé. Les peuples réels ne sont jamais présentés comme proies ni comme adorateurs des Yautja : les légendes humaines citées sont des récits de chasseurs, de soldats et de marins, sans attache à un peuple précis.

---

## Sommaire

1. La Terre vue par les Yautja
2. Chronologie des chasses terrestres
3. Le Registre : grandes chasses du passé, site par site
4. Le monde humain de 1990 à 2150
5. ARGOS : histoire interne
6. L'OWLF et Weyland-Yutani sur Terre
7. Règles d'écriture des missions
8. Générateur de chasses libres
9. Level design : principes
10. Level design : métriques des secteurs
11. Level design : les 6 secteurs types
12. Level design : plans des 20 sites
13. Modularité : kits de terrain
14. Modularité : kits de bâtiments
15. Modularité : PNJ composables
16. Modularité : météo, saisons, heure
17. Modularité : époques
18. Données à créer

---

## 1. La Terre vue par les Yautja

### 1.1 Ce que dit le lore **[Lore]**
- Les Yautja chassent sur Terre depuis des millénaires. Certains peuples anciens les ont vus, et certains récits humains en gardent la trace.
- Ils préfèrent la chaleur et les lieux de conflit. Ils ne chassent que des proies armées et capables de se défendre.
- Les « Oomans » sont jugés dangereux parce qu'ils sont nombreux, rusés et inventifs.

### 1.2 Ce que pense le clan du joueur *(proposé)*
- **Un terrain d'apprentissage noble.** Pour le clan, la Terre est la meilleure école après la pyramide : la proie y pense, s'organise, se venge.
- **Un terrain à risque.** Les Oomans apprennent. Chaque génération de chasseurs trouve des Oomans mieux armés que la précédente. Les Anciens le disent ainsi : « La Terre ne pardonne pas l'arrogance. »
- **Un terrain sans propriétaire.** Aucun clan ne peut réclamer la Terre. C'est un accord très ancien entre les clans, rappelé dans le Registre.
- **Le mot du clan pour la Terre :** *Ki'ande-Tarr*, « le monde qui répond » *(mot proposé, à valider avec la langue du projet)*.

### 1.3 Les trois lois terrestres du clan *(proposé)*
1. **Ne rien laisser.** Ni arme, ni appareil, ni chasseur mort. Ce que les Oomans trouvent, ils l'étudient.
2. **Ne prendre que ce qui se défend.** Le code général, mais appliqué avec rigueur : sur Terre, les non-combattants sont partout.
3. **Ne jamais chasser deux fois de suite au même endroit sans attendre.** Un site trop chassé « brûle » : les Oomans s'y préparent.

---

## 2. Chronologie des chasses terrestres

| Époque | Ce qui se passe *(proposé, sauf [Lore])* |
| --- | --- |
| Très ancien | Premières chasses connues du Registre. Les Oomans chassent avec des lances ; les chasseurs yautja y voient une proie courageuse **[Lore : présence ancienne des Yautja sur Terre]** |
| Antiquité | Les clans s'accordent : la Terre est un terrain commun. Première loi terrestre « ne rien laisser » après qu'une arme a été perdue et vénérée par des Oomans |
| Moyen Âge | Les Oomans s'arment de métal ; les chasses se multiplient dans les zones de guerre |
| XVIIIᵉ siècle | Greyback chasse sur Terre **[Lore : bio NECA]** ; le Registre note des Oomans armés de poudre |
| XIXᵉ siècle | Les Oomans couvrent la planète ; les chasses deviennent plus difficiles à cacher |
| 1900–1950 | Deux grandes guerres humaines : le Registre les appelle « les saisons rouges », les plus riches en proies |
| 1950–1990 | Les Oomans inventent les satellites, les caméras portatives : la troisième loi terrestre naît |
| 1987–2025 | Période des films **[Lore]** ; le joueur commence à chasser sur Terre autour de cette période ; les après-coups des films passent à la radio |
| 2025–2050 | Les téléphones filment tout ; ARGOS naît des chasses du joueur |
| 2050–2100 | Drones, capteurs, sociétés privées ; Weyland-Yutani grandit |
| 2100–2150 | Villes sous dômes, synthétiques, Terre surveillée ; ARGOS est une institution |

---

## 3. Le Registre : grandes chasses du passé, site par site

Chaque site du Registre a une **chasse ancienne célèbre**. Elle donne au site son histoire, une **marque** à retrouver (fil annexe « Registre des Anciens », T-AN-30) et parfois une arme ancienne à récupérer.

| Site | Chasse ancienne *(proposée)* | Marque à retrouver |
| --- | --- | --- |
| 1 Okavango | **La saison des hippopotames** : un jeune chasseur y apprit qu'une bête sans arme peut tuer un Yautja | dents d'hippopotame gravées sous le baobab |
| 2 Sundarbans | **La marée de Tarak** : un chasseur noyé par la marée, retrouvé par son frère trois saisons plus tard | lame rouillée dans les racines |
| 3 Pantanal | **Le grand feu** : un clan entier vit les Oomans brûler la plaine pour les chasser | crâne noirci dans une termitière |
| 4 Kimberley | **Les peintures** : un chasseur grava ses chasses sur la roche à côté des peintures humaines, par respect | gravure dans l'abri sous roche (T-AN-04) |
| 5 Everglades | **Le marais des pirates** : chasse contre des pirates armés de sabres | sabre ancien dans l'épave d'une barque |
| 6 Carpates | **L'hiver du loup** : un chasseur y passa un hiver entier, contre la règle de la chaleur | crâne de loup gravé dans la grotte |
| 7 Congo | **Les porteurs** : un Ancien refusa de toucher les porteurs d'une expédition et ne chassa que leurs gardes | disque ancien dans le lit de la rivière |
| 8 Bornéo | **La chasse sans sol** : un chasseur traversa la forêt sans toucher terre | marque taillée à la cime d'un arbre géant |
| 9 Nouvelle-Guinée | **Les crêtes** : chasse dans les nuages contre des soldats égarés | plaque d'unité ancienne dans la mine |
| 10 Kamtchatka | **Le chasseur et l'ours** : un Yautja et un ours se disputèrent la même proie | crâne d'ours gravé près des geysers |
| 11 Namib | **Le naufrage** : chasse dans un navire échoué plein de marins armés | trophée ancien dans l'épave (T-AN-11) |
| 12 Tibesti | **Les caravanes** : chasses contre des pillards de caravanes | lance ancienne dans une grotte |
| 13 Gobi | **Les cavaliers** : un chasseur vaincu par un cavalier et épargné par lui | pointe de flèche gardée dans un cairn |
| 14 Alang | **Le cimetière de navires** : chasse récente, la plus moderne du Registre | rien : c'est au joueur d'y laisser la première marque |
| 15 Mustang | **Les grottes peintes** : un chasseur passa un hiver dans les grottes ; les Oomans peignirent sa silhouette | gravures (T-CT-15B) |
| 16 Altiplano | **Le miroir** : un chasseur vit son camouflage se refléter dans le sel et apprit à attendre les nuages | lame plantée dans le salar |
| 17 Brooks Range | **Le soleil qui ne se couche pas** : un chasseur sans sommeil pendant toute une saison | crâne de grizzly dans le lodge (T-AN-17) |
| 18 Iakoutie | **Le grand froid** : un chasseur mort de froid, que son clan ne retrouva jamais | son masque gelé dans le permafrost (récupérable en E4) |
| 19 Norilsk | aucune : site nouveau | — |
| 20 Patagonie | **La dernière chasse de l'Ancien** : l'Ancien du clan y a fait sa propre chasse ultime | sa marque au sommet du champ de glace (T-AN-20) |

**Récompense du fil :** à 20 marques, l'Ancien remet au joueur une **arme ancienne du clan** et ajoute sa propre entrée au Registre.

---

## 4. Le monde humain de 1990 à 2150

Le monde humain change avec la date du joueur. Ces repères fixent l'apparence des sites, l'équipement des humains et les nouvelles à l'écoute. Ils restent volontairement **vagues** sur la politique réelle.

| Période | Monde humain *(proposé)* | Effet en jeu |
| --- | --- | --- |
| 1990–2005 | radios, premières vidéos portatives, conflits régionaux | peu de témoins filmés ; radios analogiques faciles à écouter |
| 2005–2025 | téléphones partout, réseaux sociaux | jauge d'envoi lente (10 s) ; témoins nombreux |
| 2025–2050 | drones civils et militaires, capteurs bon marché | drones sur les sites sensibles ; ARGOS naît |
| 2050–2080 | climat plus chaud, zones abandonnées, sociétés privées puissantes | sites transformés (assèchement, feux, fonte) ; W-Y apparaît |
| 2080–2120 | réseaux instantanés, villes plus fermées | jauge d'envoi instantanée ; caméras partout |
| 2120–2150 | villes sous dômes, synthétiques, surveillance totale | synthétiques ; Norilsk sous dômes ; ARGOS institution |

**Armes humaines par époque** (variantes des archétypes) :
- E1 : fusils de chasse, fusils d'assaut anciens, pistolets.
- E2 : optiques thermiques, fusils modernes, premiers drones.
- E3 : munitions intelligentes, exosquelettes légers, drones armés.
- E4 : armes à énergie (W-Y), armures, synthétiques.

---

## 5. ARGOS : histoire interne

| Année | Événement *(proposé)* |
| --- | --- |
| Création | après le premier passage au niveau 3 de l'Indice ; financée par plusieurs États, sous couverture « anti-braconnage » |
| +2 ans | Echeverría isole le sang vert du joueur ; ARGOS a la preuve, pas encore l'image |
| +5 ans | Mensah prend la tête des équipes de terrain ; premier contact direct |
| +8 ans | « Aiguille » rejoint ARGOS ; première image nette, jamais rendue publique (Varga la garde) |
| +10 ans | ARGOS découvre l'OWLF ; guerre froide entre les deux |
| +15 ans | phase Contre-chasse ; ARGOS a un dossier sur chaque chasse |
| vers 2080 | Varga passe la main à Mira ; ARGOS fait face à W-Y, qui veut racheter ses preuves |
| vers 2120 | ARGOS devient une institution : archives, mémorial de ses morts, dossier « le Patient » |

**Divisions d'ARGOS** :
- **Terrain** (Mensah) : équipes de 6, pisteurs, tireurs.
- **Science** (Echeverría) : labo, analyse, bio-traceurs.
- **Archives** : chaque chasse du joueur est un dossier ; elles alimentent le Dossier du Patient (T-AN-32).
- **Couverture** : effacer les preuves *publiques* (ARGOS veut prouver, mais au bon moment).

---

## 6. L'OWLF et Weyland-Yutani sur Terre

### 6.1 L'OWLF
- **[Lore]** Unité secrète américaine, apparue après les incidents des films ; la bible en fait une organisation héritière qui traque les Yautja à l'époque du jeu.
- **Sur Terre :** elle arrive sur les sites où l'Indice monte ; elle **efface** (corps, images, témoins) et cherche la technologie. Elle évite la lumière ; ARGOS, au contraire, veut la lumière.
- **En jeu :** équipes `owlf-commando` (réutilisées), discrètes, rapides ; l'Indice monte 25 % moins vite quand elles sont là (décision).

### 6.2 Weyland-Yutani
- **[Lore]** Compagnie qui cherche la technologie yautja et les Xénomorphes.
- **Sur Terre (paliers 3 et 4) :** labos sur des sites miniers et industriels, synthétiques, rachat des preuves d'ARGOS. W-Y peut être la cause d'une ruche terrestre.
- **Ton :** poli, froid, commercial. Ses synthétiques ne mentent jamais, mais ne disent jamais tout.

---

## 7. Règles d'écriture des missions

Toute nouvelle mission terrestre suit ces règles :
1. **Une proie digne et une raison humaine.** Chaque proie principale fait quelque chose de violent et d'armé : braconner, trafiquer, opprimer, mercenariat.
2. **Des non-combattants visibles.** Chaque site en montre (pêcheurs, ouvriers, villageois). Ils testent le code.
3. **Un moment fort lié au site.** La mécanique du site (marée, feu, orage, convoi…) doit servir le moment fort.
4. **Une manière de finir avec honneur.** Duel, épargne, don, ou mise à mort en mêlée.
5. **Une trace laissée dans le monde.** Le registre, une nouvelle à l'écoute, un héritier, un Honoré.
6. **Aucun lieu des films, aucune réplique de film.**
7. **Aucun peuple réel en proie.** Les proies sont définies par leur activité armée.

---

## 8. Générateur de chasses libres

Les chasses libres sont assemblées à partir de briques. Le générateur évite les répétitions (même faction ou même modificateur deux fois de suite sur un site).

| Brique | Choix possibles |
| --- | --- |
| Site | sites ouverts au rang du joueur |
| Faction humaine | 1 à 2 parmi celles du site (section 15.3) |
| Proie principale | chef de faction (généré : nom, âge, arme, 2 traits) ou apex du site |
| Heure | aube, jour, crépuscule, nuit (sauf site 17) |
| Météo | tirée dans la table du site (section 16) |
| Modificateur | aucun ; renforts ; journaliste ; OWLF ; ARGOS (Indice ≥ 60) ; W-Y (E3+) ; Bad Blood ; autre chasseur du clan ; ruche (5 %) |
| Objectifs d'honneur | 2 tirés dans la liste du site |

**Traits des chefs générés** (2 par chef) : prudent (garde rapprochée), cruel (exécute ses blessés), chasseur (pose des pièges), fanfaron (vient au duel), lâche (fuit tôt), malin (leurres), pieux (refuse de tirer dans le dos), fêtard (camp bruyant la nuit), vétéran (sait lire le camouflage).

---

## 9. Level design : principes

1. **Lisibilité d'abord.** Le joueur doit lire en 2 secondes où sont le couvert, les hauteurs, l'eau, les humains.
2. **Trois chemins par secteur.** Un chemin **haut** (arbres, falaises, toits), un chemin **milieu** (sol), un chemin **bas** (eau, boue, tunnels, galeries). Chacun a son risque.
3. **Des poches de silence.** Entre deux zones humaines, au moins un passage sans témoin.
4. **Des lignes de vue humaines lisibles.** Les postes de garde regardent dans une direction claire ; les projecteurs balaient en rythme.
5. **Le terrain change.** Chaque site a une mécanique qui transforme le terrain pendant la mission (eau, feu, brouillard, marée, convoi).
6. **Des boucles, pas des couloirs.** Chaque secteur se reconnecte à lui-même : le joueur peut contourner, revenir, prendre à revers.
7. **Un repère visible.** Chaque site a un repère (baobab, épave, grue, volcan, glacier) qui oriente le joueur.
8. **L'arène du boss est une histoire.** Le secteur 5 montre qui est la proie : son camp, ses trophées, sa manière de vivre.

---

## 10. Level design : métriques des secteurs

Les sites sont en **2,5D vue de côté**, comme les chasses de la campagne. Unités : **1 m = 32 px** à l'échelle 1 *(à caler sur `worldScreens.ts`)*.

| Mesure | Valeur proposée |
| --- | --- |
| Largeur d'un secteur | 3 à 6 écrans (120 à 240 m) |
| Hauteur jouable | 2 à 4 niveaux (sol, mi-hauteur, canopée ou toits, sous-sol) |
| Saut du Yautja | 4 m en hauteur, 9 m en longueur |
| Distance entre deux couverts | 6 à 12 m (zones humaines), 15 à 30 m (zones ouvertes : Gobi, salar) |
| Ligne de vue d'un garde | 25 m de jour, 12 m de nuit, 40 m avec optique |
| Rayon d'un projecteur | 15 m |
| Distance d'un poste de garde à une poche de silence | 20 m au moins |
| Nombre d'humains armés par secteur | palier 1 : 3–6 ; palier 2 : 5–9 ; palier 3 : 6–12 ; palier 4 : 10–16 |
| Non-combattants par secteur habité | 2 à 8 (jusqu'à 20 à Alang et Norilsk) |
| Temps de traversée d'un secteur sans combat | 60 à 120 s |
| Arène du boss (S5) | 2 écrans de large, 3 niveaux, 2 sorties au moins |

---

## 11. Level design : les 6 secteurs types

| Secteur | But de design | Contenu type | Pièges à éviter |
| --- | --- | --- | --- |
| **S1 Dépôt** | apprendre le site sans danger | couvert dense, 1 trace, faune, vue sur le repère | aucun humain armé en vue directe |
| **S2 Approche** | montrer la mécanique du site | la mécanique active (marée, brouillard…), 1 ou 2 patrouilles isolées | trop de combat |
| **S3 Territoire humain** | tester le code | camp, non-combattants, radios, caméras, 3 chemins | non-combattants sur le chemin obligatoire |
| **S4 Territoire de l'apex** | danger naturel | apex, pièges humains, traces de la proie principale | apex qui bloque le seul passage |
| **S5 Repaire** | affrontement | arène, objets de la proie, objectif d'honneur visible | arène plate sans hauteur |
| **S6 Extraction** | tension finale | point dégagé pour le vaisseau, couvert autour, une embuscade possible | point invisible ou trop loin |

---

## 12. Level design : plans des 20 sites

Pour chaque site : **forme**, **niveaux** (H = haut, M = milieu, B = bas), **chemin d'or** (le parcours le plus direct), **chemins alternatifs**, **poches de silence**, **points de vue**.

| Site | Forme | Niveaux | Chemin d'or | Alternatives | Poches de silence | Points de vue |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Okavango | sous-zones par chenaux | H : arbres ; M : îlots ; B : chenaux | S1 → S2 → S3 → S5 | par la plaine des lions (S4) quand l'eau monte | roselières de S2 | baobab mort (S5) |
| 2 Sundarbans | sous-zones à marée | H : canopée de palétuviers ; M : berges ; B : chenaux | par les racines à marée basse | par l'eau à marée haute | racines de S1 et S4 | tour de guet forestière (S3) |
| 3 Pantanal | profondeur | H : forêt-galerie ; M : prairie ; B : bras d'eau | prairie (S2) → ferme (S3) | bras d'eau sous le front de feu | forêt-galerie (S1) | château d'eau de la ferme |
| 4 Kimberley | vertical | H : plateau ; M : corniches ; B : gorge et billabong | descente en rappel | par la mangrove côtière | corniches de S2 | sommet de la falaise (S6) |
| 5 Everglades | sous-zones | H : cyprès ; M : îlots ; B : canaux | canal (S4) → motel (S5) | par les îlots boisés | îlot de cyprès (S6) | toit du motel |
| 6 Carpates | metroidvania | H : cimes ; M : sentiers ; B : grottes | gorge → camp → scierie | grottes (S4) qui débouchent sous la scierie | gorge brumeuse | crête (S6) |
| 7 Congo | sous-zones | H : canopée (inaccessible au vaisseau) ; M : sol ; B : rivière | fleuve → camp A → village | par la clairière à éléphants | forêt marécageuse | grand arbre de S4 |
| 8 Bornéo | vertical | H : canopée (chemin d'or) ; M : troncs ; B : sol des machines | canopée de bout en bout | sol (rapide, très exposé) | couronnes des géants | dernier grand arbre |
| 9 Nouvelle-Guinée | profondeur + mine | H : crêtes ; M : forêt ; B : galeries | crête → village → mine | gorge (S4) qui mène à une entrée secondaire de la mine | forêt d'altitude | crête dans les nuages |
| 10 Kamtchatka | sous-zones | H : pentes ; M : berges ; B : rivière | rivière → camp → vallée | champ de geysers (S4) | vapeur des geysers | lac de cratère |
| 11 Namib | profondeur large + épave | H : dunes ; M : plage ; B : cales | dune → plage → épave | lit de rivière sec | brouillard du matin | sommet de la grande dune |
| 12 Tibesti | profondeur + canyons | H : plateaux ; M : route ; B : canyons | canyon → route du convoi | plateau au-dessus de la route | canyons | cratère (S6) |
| 13 Gobi | à découvert | H : falaises ; M : steppe | falaise → poste → camp | ravins secs (rares) | les deux falaises | falaises flamboyantes |
| 14 Alang | vertical | H : grues ; M : ponts des navires ; B : cales | coque → pont → cale | grues | intérieur des coques | sommet d'une grue |
| 15 Mustang | metroidvania | H : grottes hautes ; M : canyon ; B : rivière | canyon → village → grottes | réseau de grottes | grottes vides | col (S1) |
| 16 Altiplano | à découvert + mine | H : volcan ; M : salar ; B : galeries | bord du salar → mine | traversée du salar (sous les nuages) | lagune | flanc du volcan |
| 17 Brooks Range | sous-zones | H : cols ; M : toundra ; B : rivière | rivière → lodge → vallée | col (S4) | saulaies au bord de la rivière | sommet du col |
| 18 Iakoutie | sous-zones + mine | H : mélèzes ; M : taïga ; B : mine | rivière gelée → village → mine | forêt de mélèzes | près des sources de chaleur | tour de la mine |
| 19 Norilsk | cité + tunnels | H : toits sous dôme ; M : rues ; B : tunnels | toits → quartier coupé → tunnels | tunnels de service | conduits de ventilation | cheminée (S6) |
| 20 Patagonie | grande chasse | H : arêtes ; M : glacier ; B : forêt et fjord | selon le contrat | toutes | forêt australe | sommet du champ de glace |

---

## 13. Modularité : kits de terrain

Chaque site est assemblé à partir de **kits** réutilisables. Un kit = un ensemble de pièces qui s'emboîtent sur la grille des secteurs.

| Kit | Pièces | Sites |
| --- | --- | --- |
| **Eaux calmes** | berge basse, berge haute, roseaux, papyrus, gué, eau profonde, îlot, pont de planches | 1, 2, 3, 5 |
| **Marée** | vase, racines exposées, chenal, ponton sur pilotis ; deux états (haute, basse) | 2, 14 |
| **Forêt humide** | grand tronc, liane, canopée praticable, sous-bois, souche, arbre tombé | 3, 7, 8, 9 |
| **Forêt tempérée** | hêtre, sapin, mélèze, rocher moussu, gorge, grotte | 6, 17, 18, 20 |
| **Roche et falaise** | corniche, surplomb, cheminée, abri sous roche, éboulis, rappel | 4, 12, 15 |
| **Sable et sel** | dune, crête de dune, sol de sel, roche plate, lit sec | 11, 12, 13, 16 |
| **Volcan** | basalte, geyser, source chaude, coulée froide, vapeur | 10 |
| **Glace et froid** | neige, glace, crevasse, permafrost, rivière gelée | 18, 20 |
| **Feu** | prairie, front de feu (animé), cendres, zone brûlée | 3, 8 |
| **Mine** | galerie, étai, rail, wagonnet, puits, salle de treuil | 9, 16, 18 |
| **Épave** | coque, pont, cale, passerelle, coursive, trou dans la coque | 11, 14 |
| **Industriel urbain** | toit plat, conduit, cheminée, rue d'usine, tunnel, dôme | 19 |

**Règle d'emboîtement :** chaque pièce a des **bords** typés (sol, eau, paroi, vide) ; deux pièces ne s'emboîtent que si leurs bords correspondent. Les transitions (berge → eau, forêt → prairie) sont des pièces à part.

---

## 14. Modularité : kits de bâtiments

Un bâtiment est fait de **modules** : socle, murs, ouvertures, toit, détails. Chaque kit a une palette de matériaux par époque.

| Kit | Modules | Variantes | Sites |
| --- | --- | --- | --- |
| **Camp** | tente, bâche, feu, table, séchoir, cage, véhicule garé | braconniers, milice, bûcherons, orpailleurs, chasseurs | 1, 2, 3, 6, 7, 10, 18 |
| **Bois léger** | pilotis, plancher, mur de planches, toit de tôle, véranda | cabane, ponton, village sur pilotis, entrepôt | 2, 5 |
| **Ferme et ranch** | maison, grange, silo, château d'eau, clôture | ferme, ranch, lodge | 3, 17 |
| **Industriel léger** | hangar, scierie, atelier, générateur, citerne | scierie, atelier de découpe, poste électrique | 6, 8, 14 |
| **Mine** | entrée, chevalement, baraquement, tour, convoyeur | mine illégale, mine moderne, mine W-Y | 9, 16, 18 |
| **Militaire** | sacs de sable, tour de guet, poste frontière, bunker, clôture | milice, armée, ARGOS | 7, 13, 19 |
| **Pierre** | mur de pierre, maison fortifiée, temple, grotte creusée | village fortifié | 15 |
| **Navire** | coque, pont, passerelle, cale, grue | épave, pétrolier, cargo automatisé | 11, 14 |
| **Ville sous dôme** | dôme, immeuble, usine, tunnel, ventilation | Norilsk E4 | 19 |
| **Labo** | salle blanche, sas, serveurs, cellules | ARGOS, W-Y | 9, 14, 16, 18, 19, base ARGOS |

**Règles :**
- Chaque bâtiment est **lisible** : son rôle se comprend à sa silhouette (tour de guet = danger, cabane = civil).
- Chaque bâtiment d'un camp ennemi a **2 entrées** au moins (dont une par le haut ou par le bas).
- Les intérieurs jouables gardent **un toit amovible** (coupe) et **une sortie de secours**.
- Les matériaux changent avec l'époque : bois et tôle (E1) → préfabriqué (E2) → modules métalliques (E3) → composites et verre (E4).

---

## 15. Modularité : PNJ composables

### 15.1 Composition d'un humain
Un humain générique est assemblé à partir de couches :

| Couche | Exemples |
| --- | --- |
| Corps | 6 silhouettes (gabarits, âges, genres) |
| Tête | 12 visages, 8 coiffures, couvre-chefs |
| Tenue | par archétype et par époque (section 7 de l'inventaire) |
| Équipement | gilet, sac, radio, lampe, jumelles, optique |
| Arme | selon l'archétype et l'époque ; **aucune** pour les non-combattants |
| Signe de faction | brassard, foulard, logo, couleur |

**Règle de lecture du code :** un non-combattant n'a jamais d'arme visible ni de gilet tactique ; un humain armé a toujours une arme visible dans sa silhouette.

### 15.2 Composition d'un comportement
| Couche | Exemples |
| --- | --- |
| Archétype | `poacher-rifle`, `private-guard`… |
| Routine | patrouille, poste fixe, travail, repos, sommeil |
| Trait | prudent, nerveux, vétéran, paresseux, curieux |
| Moral | bas, moyen, haut |
| Rôle d'escouade | chef, éclaireur, appui, radio |

### 15.3 Factions par site
| Site | Factions |
| --- | --- |
| 1 | syndicat d'ivoire ; gardes-chasse (E3) |
| 2 | trafiquants de peaux ; pêcheurs (civils) |
| 3 | incendiaires ; ouvriers agricoles (civils) |
| 4 | trafiquants côtiers ; sécurité portuaire (E4) |
| 5 | contrebandiers ; chasseurs de python ; gang des marais (E4) |
| 6 | garde des bûcherons ; bûcherons (civils) ; gardes forestiers (E3) |
| 7 | milice A ; milice B ; porteurs (civils) |
| 8 | sécurité d'exploitation ; ouvriers (civils) |
| 9 | mercenaires ; mineurs (civils) ; ARGOS (E3) |
| 10 | braconniers |
| 11 | contrebandiers de diamants |
| 12 | escorte de convoi ; orpailleurs ; passagers (civils) |
| 13 | patrouille frontalière ; trafiquants |
| 14 | hommes de Volkan ; gardes privés ; ouvriers (civils) ; W-Y (E4) |
| 15 | pilleurs ; villageois (civils) ; archéologue (civile) |
| 16 | sécurité de la mine ; mineurs (civils) ; W-Y (E3) |
| 17 | chasseurs, guides |
| 18 | orpailleurs, chasseurs de fourrure |
| 19 | garnison, sécurité industrielle, ARGOS, W-Y ; habitants (civils) |
| 20 | selon le contrat |

---

## 16. Modularité : météo, saisons, heure

### 16.1 États de météo
| État | Effet sur le joueur | Effet sur les humains | Effet sur la faune |
| --- | --- | --- | --- |
| Clair | aucun | vue normale | normal |
| Chaleur | joueur plus fort (+ 10 % dégâts) | humains plus lents, moins vigilants | faune à l'ombre |
| Pluie | camouflage visible | vue – 30 %, ouïe – 30 % | abritée |
| Orage | camouflage visible ; éclairs révèlent | vue nulle 2 s après un éclair | agitée |
| Brouillard | camouflage plus efficace ; portée des armes à distance – 50 % | vue – 60 % | calme |
| Tempête de sable | thermique brouillé | vue quasi nulle | abritée |
| Neige | traces visibles | traces suivies | — |
| Blizzard | chaleur corporelle qui baisse | vue quasi nulle | abritée |
| Fumée (feu) | thermique saturé | toux, panique | fuite |

### 16.2 Tables de météo par site (poids)
| Site | Clair | Chaleur | Pluie | Orage | Brouillard | Sable | Neige/Blizzard | Fumée |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Okavango | 40 | 40 | 10 | 10 | — | — | — | — |
| 2 Sundarbans | 30 | 30 | 20 | 20 | — | — | — | — |
| 3 Pantanal | 30 | 30 | 10 | — | — | — | — | 30 |
| 4 Kimberley | 20 | 40 | — | 40 | — | — | — | — |
| 5 Everglades | 30 | 30 | 10 | 30 | — | — | — | — |
| 6 Carpates | 40 | 10 | 20 | — | 30 | — | — | — |
| 7 Congo | 30 | 20 | 50 | — | — | — | — | — |
| 8 Bornéo | 30 | 20 | 20 | — | — | — | — | 30 |
| 9 Nouvelle-Guinée | 20 | — | 60 | — | 20 | — | — | — |
| 10 Kamtchatka | 50 | — | 20 | — | 30 | — | — | — |
| 11 Namib | 30 | 40 | — | — | 30 | — | — | — |
| 12 Tibesti | 40 | 40 | — | — | — | 20 | — | — |
| 13 Gobi | 50 | 30 | — | — | — | 20 | — | — |
| 14 Alang | 40 | 40 | 20 | — | — | — | — | — |
| 15 Mustang | 60 | — | — | — | 20 | — | 20 | — |
| 16 Altiplano | 70 | — | — | — | — | — | 30 (grêle) | — |
| 17 Brooks Range | 50 | — | 30 | — | 20 | — | — | — |
| 18 Iakoutie | 50 (été) | — | 20 | — | — | — | 30 (hiver) | — |
| 19 Norilsk | 40 | — | — | — | 20 | — | 40 | — |
| 20 Patagonie | 40 | — | 20 | — | 10 | — | 30 | — |

La météo peut **changer en cours de mission** (une fois au plus) ; le changement est annoncé 60 s avant par le biomask (nuages, vent).

### 16.3 Heure
| Moment | Effet |
| --- | --- |
| Aube | faune active, humains fatigués, brouillard probable |
| Jour | vue maximale, chaleur |
| Crépuscule | faune active, relèves des gardes |
| Nuit | humains aux lampes ; thermique très net ; projecteurs |

### 16.4 Saisons
La saison de chasse de chaque site (avenant, section 13) donne la chaleur. **Hors saison :** honneur – 20 %, moins d'humains, météo plus froide.

---

## 17. Modularité : époques

Chaque site est produit en **état de base** (E1–E2) et reçoit des **calques d'époque** au lieu d'être refait :

| Calque d'époque | Ce qu'il change |
| --- | --- |
| Terrain | eau plus basse ou plus haute, zones brûlées, glace fondue |
| Bâtiments | matériaux du kit, bâtiments ajoutés ou ruinés |
| Props | véhicules et appareils de l'époque |
| Humains | tenues et armes de l'époque |
| Surveillance | caméras, drones, capteurs selon l'époque |
| Son | radios analogiques ou numériques, drones, machines |

Ainsi, un site existe en un seul niveau de base, et l'époque est **une couche de données**.

---

## 18. Données à créer

| Fichier proposé | Contenu |
| --- | --- |
| `earthRegistryLore.ts` | chasses anciennes des 20 sites, marques à retrouver |
| `earthEras.ts` | 6 périodes humaines, effets en jeu, armes par époque |
| `earthTerrainKits.ts` | 12 kits de terrain, pièces, bords typés |
| `earthBuildingKits.ts` | 10 kits de bâtiments, modules, matériaux par époque |
| `earthNpcComposer.ts` | couches d'apparence et de comportement, factions par site |
| `earthWeather.ts` | 9 états, tables de poids par site, changements en cours de mission |
| `earthFreeHuntGenerator.ts` | briques, traits de chefs, règles anti-répétition |
| `earthLevelMetrics.ts` | métriques de design (contrôles automatiques dans l'éditeur) |
