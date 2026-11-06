# Quinze directions planétaires et leur place dans la campagne

[Contrat de raccord](README.md) · [Catalogue des 246 images sources](ASSETS.md) ·
[Concordance vérifiée au dépôt](RACCORD_EXISTANT.md).

Chaque direction possède **six PNG livrés** : un chasseur visiteur, un paysage
et une illustration de matière en V2 ; un élément naturel, un passage et un
objet utilitaire en V3. Les 90 fichiers sont référencés dans V37. Une vue de
chasseur ne prouve pas une population Yautja indigène ; un paysage ne constitue
pas à lui seul une planète visitable ou une nouvelle mission.

## Concordance des noms et des identifiants

Le relevé s'appuie sur `galaxyRegistry.ts`, `data.ts`, le catalogue V37, la bible
et l'Atlas planètes du classeur V6, au commit indiqué dans
[RACCORD_EXISTANT.json](RACCORD_EXISTANT.json). Les cinq noms de chasses ci-dessous
ont une correspondance explicite ; six autres mondes ont déjà une entrée
galactique `surveyed` sans mission ; trois restent des directions artistiques
sans corps galactique dans ce registre ; Xeno Prime conserve son arc écrit.

| Nom du pack | Biome demandé / direction retenue | Référence existante | État et décision de raccord |
| --- | --- | --- | --- |
| Mycora-Nox | Forêt crépusculaire, mycéliums lumineux | `planet-mycora-nox`, `surveyed` | Corps répertorié, sans mission ; ne pas fusionner avec Mycora-V ou son Cœur-Mère |
| Serekh-9 | Désert vitrifié | `planet-serekh-9` ; `desert-sandmaw` ; R2-M024.5 | Chasse existante ; les six images sont un complément artistique à raccorder à ses secteurs |
| Ferrum-6 | Désert aride ferrique | `planet-ferrum-6`, `surveyed` | Corps répertorié, sans mission ; sa famille technique `volcano` ne change pas la direction locale en désert ferrique |
| Nivalis-C | Toundra saline | `planet-nivalis-c`, `surveyed` | Corps répertorié, sans mission ; distinct de Nivalis-K et du théâtre RTS nommé Nivalis |
| Nivalis-K | Glace, fjord et crevasse | `planet-nivalis-k` ; `ice-cryostalker` ; R2-M024.2 | Chasse existante ; conserver Cryostalker, mine, refuges et objectifs déjà écrits |
| Kaail-Prime | Savane à arbres géants | `planet-kaail-prime`, `surveyed` | Corps répertorié, sans mission ; la famille technique `jungle` ne remplace pas la savane du brief |
| Eryndor-V | Forêt tempérée et karst calcaire | Catalogue artistique V37 | Direction graphique ; aucun corps ou contrat identifié dans le registre galactique audité |
| Oseris-IV | Forêt tropicale | `planet-oseris-iv` ; `jungle-vey` ; R2-M024.1 | Chasse existante ; raccord aux routes, ruines et camp de Vey ; préserver le chantier de niveau déjà prévu |
| Sequoia-IX | Conifères géants | Catalogue artistique V37 | Direction graphique ; scierie et câbles du paysage restent à contextualiser avant mission |
| Umbra-Terminus | Forêt de frontière jour/nuit | `planet-umbra-terminus`, `surveyed` | Corps répertorié, sans mission ; conserver la bande habitable mobile et les contrastes thermiques de son registre |
| Khar-Sul | Montagnes et karst d'altitude | Catalogue artistique V37 | Direction graphique ; refuge et observatoire ne sont pas des zones jouables attestées |
| Cinder-12 | Forteresse et sanctuaire volcaniques | `planet-cinder-12` ; `volcano-bad-blood` ; R2-M024.3 | Chasse existante ; la forteresse du visuel doit être située par rapport au sanctuaire, sans effacer le Paria ni importer la communauté LAVA du Homeworld |
| Pelagos-M | Océan, arches et installation littorale | `planet-pelagos-m` ; `ocean-leviathan` ; R2-M024.6 | Chasse existante ; raccorder la station, les profondeurs et les accès de la mission |
| Xeno Prime | Résine de ruche et ruines assimilées | `PLAN08` ; R2-M025 à M027 ; XP-Z11 → XP-Z12 | Arc écrit et complément Berceau enfoui ; ces six visuels généraux ne réalisent pas son niveau ou ses boss |
| Vardos-III | Mégacité cyberpunk habitée | `planet-vardos-iii`, `surveyed` | Corps répertorié, sans mission ; contexte urbain et époque à préciser ; ne pas renommer Dharos/PLAN09 |

Le jeu conserve aussi **Naraka-Delta**, **Mycora-V** et **Acheron-Sigma**, qui
complètent les huit chasses de R2-M024. Leur absence de ce pack de quinze
directions ne les retire pas de la campagne. Le compagnon **Serekh** reste
un individu distinct de la planète **Serekh-9**.

Les 24 entrées `PLAN01` à `PLAN24` de l'Atlas V6 gardent leurs noms et leurs
identifiants. Dans ce rapprochement exact, **seul Xeno Prime correspond à PLAN08**.
Ne pas déduire que Kharuun/PLAN02 est Serekh-9 parce que les deux ont un désert,
ou que Dharos/PLAN09 est Vardos-III parce que les deux ont une cité. La table
complète des 24 entrées et la preuve du classeur sont conservées dans le
[registre de concordance](RACCORD_EXISTANT.json).

## Direction visuelle et usages préparés

Cette table conserve les intentions de production. Les mécanismes proposés
nécessitent encore un raccord à la scène, des états et des tests. Les noms
« Forest Europe » et « Forest US » de la demande initiale désignent ici des
familles végétales de référence, pas des pays déplacés dans la géographie du jeu.

| Monde | Paysage, palette et lecture | Trois éléments V3 livrés | Usage à construire |
| --- | --- | --- | --- |
| Mycora-Nox | Arbre creux monumental, ravin d'eau noire, racines ; bleu profond, violet retenu, ambre et points cyan | Souche aux mycéliums lumineux ; Pont de racines tressées ; Collecteur de spores | Fixer les deux appuis du pont, délimiter le ravin, donner un état et une conséquence au prélèvement ; ne pas reprendre le boss de Mycora-V |
| Serekh-9 | Dunes ocres, crêtes de verre noir, chemins de basalte et four enfoui | Éperons de verre désertique ; Arche de caravane vitrifiée ; Résonateur éolien des dunes | Relier les repères aux pistes et aux galeries de la Sandmaw ; définir bruit, abri et danger du verre sans changer les objectifs de chasse |
| Ferrum-6 | Canyon rouge rouille, carrière à câbles, bassin salin et entrée de mine | Concrétion de fer et de sel ; Rampe de la carrière ; Broyeur de minerai compact | Définir une implantation industrielle et son histoire, les fixations de rampe et les états du broyeur avant d'ajouter une activité d'extraction |
| Nivalis-C | Moraines, mousses carmin, dégel salin, graviers surélevés et refuge de relevé | Buisson de mousse carmin ; Ponceau de moraine ; Station météo de la toundra | Séparer sol praticable et dégel ; définir les informations météo utiles et les effets des brumes du registre |
| Nivalis-K | Crevasse bleue, fjord gelé, piliers rocheux et abri aux lampes ambrées | Bloc de glace stratifié ; Passerelle de crevasse ; Carotteuse polaire | Adapter les appuis à la banquise et aux accès de mine ; les ruptures et états de forage ne sont pas contenus dans l'image |
| Kaail-Prime | Herbes dorées, arbres parasols, gué migratoire et plateau rocheux | Arbre parasol de savane ; Belvédère des migrations ; Borne des pistes migratoires | Donner une lecture des troupeaux et des itinéraires saisonniers, sans transformer la borne en voyage rapide automatique |
| Eryndor-V | Hêtraie ancienne, ruines calcaires, ruisseau en doline et pont de pierre | Fougères des dolines ; Entrée de crypte calcaire ; Cloche de veille forestière | Raccorder la crypte à un intérieur et établir l'auteur de la ruine ; séparer information sonore et alerte réellement simulée |
| Oseris-IV | Forêt tropicale dense, contreforts, rivière, corniches et cascade devant une grotte | Broméliacée géante ; Palier de la canopée ; Treuil de lianes | Fixer le palier à un arbre, prévoir les pièces mobiles du treuil et une transition réelle vers la grotte ; suivre les routes du chantier existant |
| Sequoia-IX | Conifères géants, ravin rouge, scierie abandonnée, câbles et tronc géant tombé | Vieille souche à polypores ; Monte-charge de la scierie ; Tendeur des câbles forestiers | Établir qui a construit la scierie, l'alimentation, les niveaux desservis et les états de plateforme avant toute navigation |
| Umbra-Terminus | Troncs cuivrés, horizon chaud, corniche brûlée et cavités froides | Arbuste à feuilles de cuivre ; Abri à volets thermiques ; Héliostat de frontière | Définir les transitions de chaleur et d'ombre, la commande des volets et le rôle du repère ; aucun cycle jour/nuit simulé n'est créé par le fond |
| Khar-Sul | Vallée stratifiée, voies accrochées à la falaise, grotte, refuge et observatoire | Rocher à lichens d'altitude ; Ancrage du sentier suspendu ; Avertisseur de vent des cimes | Définir portance, dégagements, abris et signaux du vent ; raccorder le sentier à une géométrie et à un retour praticables |
| Cinder-12 | Terrasses refroidies, tours pointues, forges et ponts soutenus au-dessus de la lave | Cheminée de basalte refroidi ; Pont aux écrans thermiques ; Creuset de transport fermé | Conserver des routes sèches, définir écran actif/inactif et charge ; ne pas conférer une immunité thermique au joueur |
| Pelagos-M | Arches calcaires, vagues turquoise, corniches sèches, station sur piliers et laboratoire immergé | Corail des arches océaniques ; Sas de plongée littoral ; Échantillonneur abyssal | Prévoir porte ouverte/fermée, sas et transitions de milieu compatibles avec la mission ; une image d'installation immergée ne donne pas la nage |
| Xeno Prime | Forêt pétrifiée, tours assimilées, résine noire côtelée et chambre profonde | Évent de résine côtelée ; Arche de couloir assimilée ; Enregistreur pris dans la résine | Choisir une zone du PLAN08 existant ; préserver lisibilité des balises, passages et réactions du Berceau ; le prélèvement n'est pas une preuve de reine |
| Vardos-III | Port-canal, quais, rues, métro aérien, tours occupées et conduites ; graphite, acier humide, ambre et cyan utilitaire | Arbre des jardins suspendus ; Accès technique du métro aérien ; Consigne de livraison blindée | Définir habitants, propriétaires et époque ; créer accès techniques, ouvertures et patrouilles avant contrat ; maintenir les règles sur les non-combattants |

## Raccord aux régions du monde natal

**Mise à jour du 6 novembre 2026.** La [bible courante](../BIBLE_DE_CAMPAGNE.md)
définit une capitale centrale, dix régions selon le climat et des liaisons en anneau.
Elle précise les accès initiaux liés au clan et les trois promenades encadrées
Youngling communes (Marches de Cendre, Désert de Verre, Jungle des Piliers).
Ces décisions courantes gouvernent le futur raccord ; la génération V5 ne change
aucun accès dans le code. Les Slums sont les quartiers bas de la capitale et des cités.

Le tableau suivant conserve **les six familles et seuils du cahier du 5 novembre**
pour la traçabilité graphique. Il ne remplace pas la carte ou les accès révisés
et ne prouve pas leur implémentation.

| Famille du cahier du 5 novembre | Ancien seuil proposé | Liaison écrite alors | Rapport au pack |
| --- | --- | --- | --- |
| Désert | Unblooded | Porte sud, à pied | Peuple des Citernes ; distinct de Serekh-9 et Ferrum-6 |
| Slums | Unblooded | Rues basses, à pied | Cour des Forges Basses ; ne pas fusionner l'enclave thermale homonyme |
| Jungle humide | Unblooded | Pont de lianes | Terrasses de pierre compatibles avec cette région ; le territoire du Quatza-Rij garde son rôle L-02 |
| Lave | Young Blood | Pont de basalte | Forges de la Caldeira ; distinctes du sanctuaire de Cinder-12 |
| Glacier | Young Blood | Skiff des hauts plateaux | Région conservée ; aucun pack de tribu glacier n'est livré par V2/V4/V5 |
| Marais | Young Blood | Skiff fluvial | Région et sanctuaire de la Réserve conservés ; aucun changement implicite en Refuge des Veilleurs |

Ces six familles ne sont ni les six origines O1–O6 ni six planètes de chasse.
Les anciens libellés « Glacier Moon » et « Swamp Moon » sont réconciliés par
la décision du 5 novembre : des régions de Yautja Prime. Une reprise ne doit
pas recréer deux lunes à partir de ces seuls anciens noms.

## Xeno Prime et les autres annexes

Les images de ruche sont des compléments généraux à **PLAN08**. Le
[Berceau enfoui](../xeno-prime/README.md) développe **XP-Z12 depuis XP-Z11**,
avec ses douze tableaux locaux ; **XP-Z09 conserve sa tête de reine morte**.
Conserver R2-M025, R2-M026 / L-07 et R2-M027, l'accès Blooded, les rites et
Quatza-Rij solitaire dans le rite de référence, puis le prélèvement et le retour
de la preuve, en appliquant les exceptions de coop expressément décidées dans
la bible courante. Un chasseur visiteur en armure de quarantaine reste un Yautja ;
aucune hybridation, nouvelle espèce ou immunité à la résine n'est accordée.

Les six fichiers Xeno V2/V3 restent distincts des 91 ressources du pack du
Berceau et de ses compositions. Le statut courant des poses, têtes et états
de boss propres à ce chantier est suivi dans [son annexe](../xeno-prime/README.md). Les
modules de [mobilité](../mobilite/README.md) et de
[compagnons](../COMPAGNONS_ET_ALLIES_PREMIUM.md) restent soumis aux passages,
aux affectations et à la présence réelle dans la mission.

## Définition d'un monde prêt à jouer

Pour les cinq chasses existantes, rattacher chaque ressource retenue à un secteur
et à un usage sans réécrire les objectifs acquis. Pour les six corps `surveyed`,
réutiliser l'identifiant galactique existant ; prévoir d'abord le contrat, les
points d'entrée et l'extraction. Pour les trois directions seulement artistiques,
une décision de campagne devra établir position, époque, identité, accès et
mission avant toute création de corps dans le registre. Xeno suit son annexe.

Dans chaque cas, vérifier surfaces praticables, supports, limites de caméra,
profondeur, masque d'occlusion, colliders, interactions, dangers, sons, états,
persistance et sortie. Une scène complète ne fournit pas ses calques de
parallaxe ; une matière n'est pas encore un ensemble PBR ; un passage fermé
dessiné ne fournit pas ses animations d'ouverture. L'état actuel demeure celui
du [catalogue et de la reprise](REPRISE.md), jusqu'aux preuves de chaque usage.
