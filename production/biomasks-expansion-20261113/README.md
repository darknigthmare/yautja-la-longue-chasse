# Expansion des masques : références, études fidèles et rendu PHG

Ce lot distingue la référence **R**, la version **A** et son adaptation **B**.
Pour les neuf entrées du port communautaire PAYDAY2, A conserve exactement les
octets de la capture RGB sur fond noir, dreads compris. Les fichiers DDS natifs,
la localisation des noms et le README d’attribution sont également conservés.
La capture n’est ni un sprite détouré ni une preuve des pixels originaux de PHG.

Modern Predator, Abyss, Cyclone, Vapor, Fray, Remnant et Detox sont sept noms
supplémentaires du corpus secondaire. City Hunter of97 et Kawaii Phoenix sont
deux variantes communautaires. Leur présence ne prouve pas neuf géométries PHG
canoniques distinctes. Le corpus cite IllFonic, SEGA/Rebellion, Cold Iron Studios,
KillerKrayola et Matthelzor ; l’origine précise de chaque masque reste à qualifier.

Pour une photographie officielle qualifiée, R garde les octets photographiques
natifs. A peut être une nouvelle étude ImageGen isolant le masque visible ; B est
alors une seconde génération, issue de A et des photographies. Les reçus et
compteurs distinguent ces générations des copies de références. Kwei conserve
la qualification du prototype NECA « Not Final Product ». Ahab suit précisément
l’édition NECA SDCC2014, sans la confondre avec Ultimate2017 ou tout le canon comics.

Les B sont des PNG ImageGen natifs avec une véritable transparence. Ils conservent
la vue, les formes et la palette attestées ; une référence grise reste grise.
Les dreads, la peau, la bouche du porteur, le fond et les éléments de figurine
restent exclus du masque. Les surfaces cachées, le dos et les détails illisibles
ne sont pas établis par une seule vue. La lumière et les matières visent une
lecture cohérente à360 et96px, sans certifier une correspondance franchise1:1.

Le lot est extensible par son index de sources. Il ne ferme automatiquement
aucun des46 noms canoniques encore ouverts, aucun P0 et aucune exigence bible.
La sélection comprend20 paires :9 A copiés,11 A ImageGen et20 B ImageGen,
soit31 nouvelles images natives, avec24 références officielles R conservées
(22 photographies et2 concepts). Les deux coques GoldenAngel constituent deux
études distinctes d’un même personnage. Nightstorm reste une vue partielle du
masque rigide ; membranes et défenses biologiques restent exclues.
Viper Series12 est une création originale NECA ; cette édition n’est pas
présentée comme un hommage Kenner ni comme la classe Scout PHG.

Ces20 comparaisons disponibles comprennent19 paires sans écart majeur observé
et **Vapor provisoire à reprendre**. Son B2 présente une réserve majeure de
largeur d’environ+11% sur le proxy visuel de A ; il est refusé pour une version
fidèle. Ce PNG reste conservé et affiché comme provisoire parmi les31 images.
La disponibilité des octets et les contrôles techniques ne ferment pas cette
réserve artistique. Aucun statut canonique,humain ou runtime n’est accordé.
Le suivi relie toutefois les nouvelles références et études d’édition à Ahab
et Kwei : « référence trouvée » et « candidate d’édition produite » constituent
une progression distincte de la validation canonique et de la clôture.
Canon, validation artistique humaine, runtime et animation restent ouverts.
Les cinq lots antérieurs, leurs114 PNG ImageGen natifs et leurs125 XLSX sont
protégés par empreinte ; les fichiers historiques ne sont jamais réécrits.

## Reconstruction et revue

Depuis la racine, Python3 et Pillow12.3.0 :

~~~sh
python3 production/biomasks-expansion-20261113/tools/build-mask-expansion.py --write --require-complete
python3 production/biomasks-expansion-20261113/tools/verify-mask-expansion.py --check --require-complete
python3 production/biomasks-expansion-20261113/tools/ci-mask-expansion-inputs.py --check
~~~

Le builder copie seulement les références autorisées et produit le manifeste,
la galerie et le classeur. Il ne crée ni ne modifie les PNG générés. Pillow lit
les pixels, dimensions et alpha sans exporter d’image. Les originaux privés sont
comparés lorsqu’ils existent ; la vérification portable fonctionne sans eux.

La galerie `/game/biomasks-expansion-20261113/review.html` propose un cadrage CSS
du masque visible et la référence A complète. Ce changement d’affichage ne
recadre aucun fichier. Les cadres proposés des petites références et les bornes
alpha des PNG permettent de comparer les volumes sans agrandir leurs preuves.
Le tiroir garde les photographies R, les SHA, les attributions et les limites.

Le classeur `suivi/Yautja_Expansion_Masques_20261113.xlsx` distingue paires,
références, variantes,46 noms encore ouverts et sources historiques protégées.
La CI sélectionne uniquement les fichiers explicitement épinglés, sans accès
aux origines privées, au CDN NECA ni aux assets sans rapport ; plafond768Mio.
Les cinq lots historiques protégés représentent déjà474073337octets ; leurs
sources,les31 nouveaux PNG natifs et les références officielles dépassent
ensemble le plafond512Mio. Aucun réencodage n’est utilisé pour réduire ce poids.
