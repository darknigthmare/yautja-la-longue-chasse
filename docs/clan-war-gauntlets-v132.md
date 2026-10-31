# V132 — Arsenal de gauntlets Yautja, déblocages et identité du mode Guerre des clans

**Statut :** prototype intégré à la PR #42 (empilée sur #40) ; **pas** une fusion sur main, **pas** une validation artistique 1:1.
**Classeur complet :** [Yautja_Gauntlets_V132_Arsenal_Clans.xlsx](Yautja_Gauntlets_V132_Arsenal_Clans.xlsx) (10 feuilles, 54 candidats, 540 assets, 70 tâches, 47 scénarios QA).
**CSV synchronisé avec le catalogue :** [Yautja_Gauntlets_V132_Catalog.csv](Yautja_Gauntlets_V132_Catalog.csv).
**Source runtime :** `app/game/data/clanWarGauntletCatalogV132.json`.

## 1. Règle de fidélité visuelle

Le **Jungle Hunter 1987** est **obligatoire comme équipement de départ**. Son ordinateur de poignet doit conserver les caractéristiques visibles de l'accessoire : position sur le bras gauche, coque métallique longue et sombre, bordures mécaniques, capot ouvrant, panneau de commande à segments rouges, vis/arrêts/charnières, proportions du bracelet et patine. Références :
- Film original : https://www.20thcenturystudios.com/movies/predator
- NECA Ultimate Jungle Hunter à capot ouvrant : https://store.necaonline.com/products/predator-ultimate-jungle-hunter-7-scale-action-figure
- Analyse iconographique : https://www.avpcentral.com/predator-wrist-gauntlet
- Propstore signale expressément que les gauntlets de sa réplique grandeur nature sont des ajouts de présentation : https://propstoreauction.com/lot-details/index/catalog/496/lot/192367/317-Planet-Hollywood-Collection-Life-Size-Predator-Figure-Replica-from-Original-Stan-Winston-Studio-Molds-with-Light-Up-Details-

**Attention :** le SVG `HunterGauntletArtV132.tsx` n'est **qu'un blockout original** plus proche des formes identifiées que la maquette V131. Les glyphes SVG ne sont pas certifiés une transcription canonique et la projection holographique de la carte de guerre est une **extension gameplay du projet**, pas une scène démontrée identique en 1987. Pour une validation 1:1, il faut une comparaison visuelle humaine des vues face/dessus/côté, une vraie silhouette en pixels ou modèle 3D, et l'animation du capot, avec captures inspectées. La matrice dédiée compte 27 contrôles détaillés.

Trois niveaux de preuve sont conservés dans chaque ligne de catalogue :
- **Gros plan ou concept de fabrication** : la pièce est directement référencée, des ratios restent à mesurer.
- **Équipement attesté** : le personnage a un équipement de poignet documenté mais sa géométrie doit encore être vérifiée.
- **Personnage ou classe identifiable** : ne surtout pas revendiquer un gauntlet individuel 1:1 ; conserver un placeholder à remplacer.

Le design studio Wētā documente le gauntlet de *Badlands* : https://wetaworkshopdesignstudio.artstation.com/projects/rlxRPa. Un concept de Dek n'est pas automatiquement une preuve de géométrie pour Kwei ou Njohrr.

## 2. Inventaire, familles et méthode de déblocage

**54 entrées** dans le registre :
- **Films : 26** (1987, 1990, AvP 2004, AvP-R 2007, Predators 2010, The Predator 2018, Prey 2022, Badlands 2025).
- **Animation : 4** (les trois familles Yautja étudiées dans Killer of Killers et le Grendel King, chaque gauntlet exact restant à documenter).
- **Jeu PHG : 20** (classes et extensions ; une classe jouable n'établit pas l'existence de 20 designs de poignet distincts).
- **Autres jeux : 3** (Concrete Jungle, Aliens vs Predator 2010) et **comics : 1**.

Les codes de déblocage sont individualisés. **Dix modèles sont codés comme potentiellement accessibles** suivant l'état réel du chasseur :
- Jungle Hunter : accessible dès l'entrée, modèle par défaut.
- Au rang **Blooded** : City Hunter, Scar, Captured/Classic et Hunter de PHG.
- Au rang **Elite** : Wolf, Fugitive et Feral.
- Au rang **Elder** : Greyback et Dek.

Les **44 autres candidats** ont des fiches et un identifiant de quête réservé mais **n'ont pas de déclencheur de récompense dans le jeu**. Ils ne sont pas artificiellement acquis. Le lieu conseillé est l'atelier d'armure du Homeworld (réplique de technologie archivée) ou le reliquaire selon le personnage, en reliant de futurs faits de campagne vrais et idempotents. Une victoire dans les exercices libres V85/V115 ne devient pas une récompense de campagne.

Le joueur peut **prévisualiser** un modèle bloqué dans les fiches ; il ne peut **équiper** que les modèles réellement autorisés. Le choix d'équipement persiste localement dans une clé distincte pour `save.createdAt` et **ne modifie pas** `SaveGame`, `WarSimulationV85`, le butin, ni les mondes. C'est une solution réversible avant le futur slot d'inventaire global, qui nécessitera une migration et des tests de sauvegarde supplémentaires.

## 3. Option B : cosmétique + identité tactique légère

La version V132 applique effectivement les **palettes, la forme vectorielle provisoire, les variations de balayage et les informations affichées** à partir du gauntlet équipé. Elle réutilise `ClanWarAtlasV95`, le panneau `ClanWarPanelV85` et `createWarSessionV85` existants, ainsi que les ordres et sélections live.

| Lecture spécialisée | Source de vérité | Impact sur la règle |
| --- | --- | --- |
| Renseignements | nombre d'observations et rapports déjà accessibles | Aucun renseignement caché |
| Itinéraires | nombre de sites du théâtre, mouvements déjà réservés | Aucun transit gratuit |
| Médical | aptes / blessés de la faction du joueur | Aucun soin gratuit |
| Commandement | ordres et tour réel de la session | Aucun créneau gratuit |
| Ravitaillement | ensemble de sites réellement ravitaillés | Aucun stock ajouté |

L'**identité sonore** est décrite dans les profils `GAUNTLET_PALETTES_V132` mais **les fichiers et le raccordement au moteur audio sont encore à produire**. Ne pas annoncer de sons actifs. Les palettes et animations de scan fonctionnent comme des habillages, mais leur fidélité à chaque film reste à vérifier. Les modèles sans image spécifique exploitent temporairement un blockout commun volontairement signalé.

La personnalisation ne peut jamais modifier les calculs de dégâts, de conquête, de soin, de coût, de déplacement ou de spawn : indispensable pour le multijoueur de guerre des clans.

## 4. Périmètre d'intégration et futures étapes

**Code créé/modifié :**
- `app/game/data/clanWarGauntletCatalogV132.json` — références, propriétaires, qualité des preuves, conditions et 54 identités.
- `app/game/systems/clanWarGauntletCatalogV132.ts` — typage, dix thèmes, unlock, validation et préférence per-profil.
- `app/game/ClanWarGauntletLockerV132.tsx` + CSS — armurerie, recherche, filtre, pagination, aperçu, équipement.
- `app/game/HunterGauntletArtV132.tsx` — premier blockout Jungle Hunter/City/Feral/Badlands.
- `app/game/ClanWarGauntletV131.tsx` + CSS — carte live habillée par gauntlet sélectionné.
- `app/game/ClanWarPanelV85.tsx` — rattachement à la partie courante sans modifier les mécaniques.
- `tests/clan-war-gauntlets-v132.test.mjs` + CI V131 — intégrité, rangs, propriétaire, mode classique et contrat d'absence de modifications de combat.
- Le classeur V132 et son export CSV sous `docs/`.

**Travaux encore nécessaires :**
1. Capturer et classer les photos et vues canoniques exactes par modèle ; ne pas utiliser les images de figurines comme si elles étaient des pièces originales du tournage.
2. Produire les sprites PNG ou modèles 3D indépendants, leurs textures de matériaux et une vraie animation de poignet en POV.
3. Connecter les 44 récompenses aux quêtes et trophées réellement en jeu, par récompense unique et vérifiable, puis à l'équipement global.
4. Brancher l'audio original respectant les réglages de son, et étendre la cohérence de la vue aux quatre sous-modes V115 (outer ops, RTS, sabotage, assaut).
5. Tester en navigateur et sur appareils, l'accessibilité clavier/contraste, les performances et les transitions, puis obtenir la validation artistique 1:1.
6. Revoir les droits sur les personnages et designs de franchise avant toute exploitation commerciale.

Voir la matrice QA, les 540 packages d'assets et les critères de validation détaillés dans le classeur.

**Dépendances GitHub :** #29 → #34 → #36 → #37 → #38 → #40 → #42. Cette PR reste en brouillon en attendant validation de la nouvelle vue et vérification ciblée, sans fusion dans main.


## V133 — Suite intégrée (31 octobre 2026)

- **Correction de l'ordinateur Jungle Hunter** : passage de cinq colonnes rouges fictives à **cinq rangées horizontales** inspirées des vues disponibles. Les signes restent une conception vectorielle originale provisoire ; leur forme exacte, leur taille et leur distribution ne sont pas validées film 1:1. Le couvercle est maintenant ouvrable/fermable dans la fiche d'armurerie, avec transition CSS désactivée en mode mouvements réduits.
- **Deux interfaces, un équipement** : `useHunterGauntletV133` remplace les lectures de préférence dupliquées. La clé de stockage reste celle de V132 ; l'équipement est actualisé dans le même onglet via un événement et dans d'autres onglets via `storage`. Un refus d'écriture conserve la sélection en mémoire (et affiche un avertissement) sans écrire la sauvegarde de guerre.
- **Armurerie du vaisseau** : le jeu principal propose un emplacement cosmétique de gauntlet dans `GameClient.tsx` ; ce même choix équipe le projecteur stratégique et colore le module `HunterRigPreview.tsx` dans l'armurerie et dans la personnalisation. Le rig garde **une coque de base commune** et des filtres de matière : ne pas compter ces substitutions comme 54 modèles 1:1.
- **Audio maintenant effectivement branché** : dix courtes signatures *originales et synthétisées* sont jouées par `GameAudio.playGauntletSignalV133()`, via le bus SFX normal respectant le volume et le mute. La signature se déclenche sur une action utilisateur quand le chasseur équipe son gauntlet ou ouvre la vue holographique. Cela ne constitue pas la reproduction des sons des films.
- **Quatre modes de mission V115** : Assaut latéral, Outer Ops, infiltration/sabotage et RTS bénéficient d'une bande holographique d'informations déjà autorisées, lue depuis leur état d'exercice unique. Le moteur, les ordres et les délais ne sont pas modifiés.
- **Tests et traçabilité** : `tests/clan-war-gauntlets-v133.test.mjs` couvre la séparation des propriétaires, les rangs, le lien entre interfaces, les cinq rangées LED, le moteur audio et le parsing TSX. Voir `docs/Yautja_Gauntlets_V133_Arsenal_Clans.xlsx` avec deux feuilles supplémentaires : `10_V133_Suivi` (30 tâches avec état de preuve) et `11_V133_QA` (15 vérifications).
- **État du chantier** : la validation d'image frame-by-frame, le véritable mesh/atlas indépendant par gauntlet, la fidélité morphologique, les animations d'ouverture certifiées, la connexion des 44 défis à des faits de campagne et une revue navigateur sont toujours **à faire**. Le fait qu'une CI soit verte n'est pas une validation visuelle ou end-to-end.

### Sécurité et cohérence des sauvegardes

Le stockage local V133 est strictement une **préférence du navigateur indexée par l'identifiant de la sauvegarde du chasseur**, et ne modifie pas `SaveGame`. Il n'est pas encore intégré aux exports de campagne/partage cloud. Les joueurs qui changent d'appareil doivent actuellement rechoisir leur modèle ; cette limite sera traitée lors d'une migration de sauvegarde complète, avec preuve d'absence de données perdues. Toutes les récompenses par défi encore sans source événementielle restent verrouillées.

### Vérification minimum avant fusion

`npm ci --ignore-scripts`, `node --experimental-strip-types --test tests/clan-war-gauntlet-v131.test.mjs tests/clan-war-gauntlets-v132.test.mjs tests/clan-war-gauntlets-v133.test.mjs`, `npx tsc --noEmit -p tsconfig.clan-war-v131.json`, ESLint des fichiers modifiés, contrôle du classeur ZIP ; puis parcours manuel navigateur et revue des références 1987. Ces contrôles ciblés ne remplacent pas `npm run build:production` ni les tests complets du jeu.
