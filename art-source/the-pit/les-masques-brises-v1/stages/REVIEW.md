# Les Masques Brisés — quatre concepts d'arène

**Production réelle : quatre PNG originaux individuels, 1536 × 1024, RGB opaques, total de 10 906 600 octets uniques.** Chaque fichier est conservé dans son format natif, avec une copie publique identique. Aucun pixel n'a été modifié.

Ce sont des **vues composites candidates** pour les stages 01 à 04 de l'extension originale. Aucun kit de parallaxe natif, collision, animation de décor ou nouveau stage jouable n'est déclaré par ce lot.

## Scènes produites

| Identifiant | Nom | Direction visuelle | Point de revue |
| --- | --- | --- | --- |
| `lmb-stage-01` | Cour des masques | Cour de basalte, râteliers de masques inertes, colonnes patinées, ciel rouge. | Piste horizontale libre ; densité des masques à vérifier derrière les silhouettes de combat. |
| `lmb-stage-02` | Quai des chasseurs | Hangar extraterrestre, côtes métalliques, caisses reculées, vaisseau au-delà du quai. | Piste dégagée ; le vaisseau reste peint dans l'image et ne constitue pas un objet animé. |
| `lmb-stage-03` | Ravin de cendre | Falaises en colonnes, cendres, faibles fissures chaudes au loin et balises de chasse. | Terrasse continue devant le ravin ; le gouffre ne correspond pas à une collision implémentée. |
| `lmb-stage-04` | Relais des pillards | Émetteur, matériel récupéré et antenne dans un relais ouvert sur une tour lointaine. | La terrasse occupe davantage de hauteur que dans les trois autres concepts ; harmoniser cadrage et échelle avant admission. |

La revue visuelle constate quatre scènes sans personnages ni interface, avec une piste libre et des architectures ou paysages distincts. Elle ne constitue pas une validation artistique humaine ni une preuve de rendu dans une partie.

## Identité et provenance

Les lieux et leurs compositions sont créés pour **Les Masques Brisés**. Les conventions de technologie, de matériaux et de culture de chasse servent la cohérence recherchée avec l'univers Yautja. Aucun de ces lieux n'est présenté comme un décor officiel ou comme la reproduction d'un plan de film.

Les quatre appels utilisent le mode intégré `image_gen.imagegen`, sans image de référence fournie, avec `transparent_background: false`. Les prompts exacts sont conservés à côté des PNG. Les sources de lore de l'extension appartiennent à son registre documentaire ; elles ne prouvent pas l'officialité de ces créations.

Les sorties 01, 02 et 04 ont été copiées octet pour octet depuis le fichier natif livré. La sortie 03 a été reçue pendant une panne de l'exécuteur : son URL de données a été décodée directement en octets PNG après reprise. Aucune opération de dessin, redimensionnement ou réencodage n'a été utilisée.

## Vérification et récupération

Le [manifeste](manifest.json) décrit chaque scène, les empreintes des PNG et prompts, les fichiers publics, les méthodes de récupération et les manques restants.

Le script [measure_readonly.py](measure_readonly.py) mesure les dimensions, le mode, l'alpha et les empreintes sans modifier les images. Le [rapport](measurements.json) constate quatre PNG RGB opaques de 1536 × 1024. L'absence de transparence convient à ces arrière-plans complets ; elle ne convient pas à des couches intermédiaires à superposer.

Les quatre identités Git calculées sur les fichiers locaux correspondent aux blobs créés sur GitHub. Les copies publiques ont le même SHA-256 que leurs sources. La création de blobs seule n'est pas une publication de branche : le commit et la PR sont gérés par le parent.

## Production encore ouverte

Pour chaque scène : produire de vraies couches séparées (lointain, décor, piste, avant-plan et effets), caler l'échelle et la ligne de sol dans le moteur, puis vérifier lisibilité et occultations avec les sprites. Les accessoires mobiles, interactions, dangers éventuels, sons, variantes de confort et collisions restent à réaliser et à jouer.

Les quatre images sont des concepts effectivement reçus. Elles ne clôturent pas les vingt stages prévus par l'extension.
