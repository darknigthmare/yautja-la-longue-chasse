# V108 — Avar’Kesh, seconde réserve jouable

Avar’Kesh est une création originale explicite du projet : huit nouveaux secteurs continus, seize nouveaux combattants humains adultes armés et quatre appareils à réparer puis rejoindre à pied. La sélection est disponible au menu libre et au dossier de campagne. Elle ne remplace pas les sorties Vharuun V1, Balises V2 et traversée V3.

Le catalogue historique propose dix géographies de huit secteurs. Avar’Kesh n’usurpe aucun de leurs noms ni leurs biomes annoncés : il s’agit d’une seconde réalisation originale réutilisant l’art de jungle disponible. Les totaux dédupliqués du jeu passent à **16 secteurs originaux / 80 visés et 32 adultes originaux / 100 visés** ; les variantes V1/V2/V3 d’un même secteur ne s’additionnent pas. Les neuf autres géographies nommées du catalogue historique restent à produire. Ces compteurs ne certifient ni les fiches H001–H100 ni leur art.

## Terrain et objectifs

Le terrain de 12800 unités garde un sol continu à 438 et une extraction à 115. Les huit secteurs ont chacun un agencement de plateformes distinct : Grève des Exilés, Canopée des Guetteurs, Écluses Envahies, Fonderie des Lianes, Ravin des Fougères, Antennes Brisées, Voûte des Racines et Débarcadère des Cendres. Trente plateformes physiques et seize couverts interviennent réellement dans les atterrissages, lignes de vue et projectiles ; leurs raccords ne téléportent pas les acteurs.

Quatre postes hauts se trouvent à 2550/220, 5790/230, 9010/225 et 12480/280. Chaque relevé demande 120 ticks immobiles, exposé, à la bonne position. Un mouvement ou une blessure interrompt le travail ; la pause n’avance rien. Le carnet distingue notes consignées, notes rapportées par retour physique et sortie interrompue. Un retour anticipé conserve seulement les faits réellement obtenus.

L’objectif secondaire demande d’interrompre un décollage déjà amorcé. Il lit l’événement d’interception physique existant, sans inventer un score supplémentaire. Endommager un circuit avant les moteurs ne le remplit pas ; un appareil parti reste parti. Le retour n’est pas conditionné à cet objectif, et le bilan ne le présente pas comme achevé lorsqu’il manque.

## Décisions humaines différentes

Les quatre équipes comptent chacune un mécanicien et trois décisions de travail distinctes. Les caractéristiques de vue, vitesse, portage, délai de tir, transmission et réparation diffèrent aussi entre les seize adultes.

- L’escorte suit à pied un allié portant effectivement un composant, à moins de 520 unités et sans couvert interposé. Elle garde une distance de 75 unités derrière sa progression vers l’appareil ; un porteur lointain ou masqué ne lui sert pas de cible distante.
- La garde de rampe rejoint un poste à 115 unités de l’appareil après le premier lot apporté, pendant qu’un allié peut encore travailler. Elle cesse de tenir son poste au démarrage et doit rejoindre la rampe pour embarquer.
- L’observateur rejoint un bord de couvert déterminé, différent du poste de rampe. Les fougères continuent de bloquer sa vision et ses tirs ; son rôle ne révèle pas la position cachée du chasseur.

Ces décisions sont strictement V4. Une menace réellement observée reprend la priorité du combat. Sans collègue disponible pour la collecte ou la réparation, les gardes et observateurs reprennent le travail ; un survivant isolé ne reste pas bloqué à son poste. Le démarrage libère les postes pour l’embarquement. Si l’appareil est déjà parti, les survivants recherchent le plus proche des appareils encore présents.

Les 16 dépôts contiennent initialement 32 lots. Collecte, portage, corps, récupération locale, appareils et lots neutralisés conservent ce total. Les acteurs marchent vers la ressource, réparent au sol et n’embarquent qu’à portée de leur propre appareil. Les passagers ressortent physiquement à la rampe lors d’une interception. Aucun rang, équipement, honneur ni trophée de campagne n’est fabriqué.

## Sauvegardes et art

`createGameReserveV108(seed)` crée exclusivement la version 4 / `kesh-watch-expedition`, avec `routeV108.siteRecords`. Le validateur exige les seize identités dans leur ordre, quatre appareils, seize dépôts, les coordonnées et bornes correctes, quatre relevés cohérents, les clés autorisées et 32 lots conservés. Les mélanges entre réserves et champs d’autorité inconnus sont refusés. La garde des checkpoints conserve blessures, visites, captures, départs, interceptions et relevés de manière monotone. Imports de campagne, slots manuels, archives intégrales et refus d’écriture utilisent les mêmes validateurs. Les versions 5 et supérieures demeurent protégées comme futures.

Les factories et traces jouées V1/V2/V3 sont comparées à des empreintes SHA prises sur le runtime V107 avant les éditions V108 : trois graines par version, 900 pas par scénario. Ce contrôle ne remplace pas le corpus historique V107.

Les dix images natives existantes, dont les trois atlas humains V7, sont partagées. Les palettes d’atmosphère, pictogrammes, jauges et repères sont des couches de rendu déclarées. Le chasseur reste en pose native tenue. Aucune nouvelle image H001–H100, animation complète, identité canonique 1:1, coopération, récompense de campagne ou publication n’est annoncée par ce lot.

## Contrôles

Les nouveaux tests sont `tests/game-reserve-expedition-v108.test.mjs` et `tests/game-reserve-expedition-persistence-v108.test.mjs`. Ils exercent les trois comportements avec changements physiques de direction, absence de guidage derrière couvert, survie isolée, libération des postes à l’embarquement, conservation des 32 lots, les quatre équipes vivantes jusqu’au départ, les quatre relevés et le retour par déplacement réel, l’interception d’un appareil préparé naturellement, la monotonie et les imports/slots/archives/refus-retry. Le parcours intégral de géométrie utilise explicitement seize adultes déjà neutralisés : il ne certifie pas une victoire de combat jouée.

La recette `scripts/qa-preserve-expedition-v108.mjs` est destinée au même runtime compilé commun que les autres domaines. Elle vérifie les entrées libre/campagne, la protection des versions historiques/futures, le tactile et clavier, les trois comportements sur une simulation vivante, un combat réel limité à un adulte suivi de son prélèvement, et le parcours de géométrie avec fixture déclarée. Elle conserve identité de build et commit, réponses HTML, captures avec SHA / taille, sources avant/après et faits durables. Le résultat navigateur et l’inspection des captures restent **à effectuer sur le build V108 commun** ; aucun rapport V107 n’est présenté comme preuve V108.
