# Art Homeworld V111

L’inventaire [JSON V111](v111-homeworld-art-inventory.json) recalcule les 354 cibles d’architecture, accessoires et faune des sections 55–76 à partir du catalogue et des consommateurs actuels. Il trouve 313 familles avec candidats à décliner, 40 sans candidat et une animation manquante. Ces catégories ne certifient ni qualité visuelle, ni orientation, ni complétude : aucune des 354 cibles n’est clôturée. Les images déjà livrées restent présentes ; elles ne sont pas toutes déclarées manquantes.

Les 790 anciennes images Homeworld sont lues localement, avec taille, SHA256 et empreinte Git du même contenu. La CI peut vérifier leur identité dans son arbre Git sans télécharger les 1,7 Go d’images anciennes. Le rapport distingue cette vérification d’identité d’une relecture des octets ou d’une inspection visuelle. Les quatre nouvelles images demandent toujours leurs octets et leur SHA256 réels.

## Conversation native du poste K-17

La demande corporelle des PNJ vient du brief original, §15, lignes 757–770, et de la scène source `D6-W-PNJ-ROLE-03` de l’archiviste. C’est un besoin distinct des 354 familles de décors. Le personnage historique utilisait une composition statique `HomeworldModularHunter` ; les quatre pas gauche/droite de l’archiviste V74 et les vingt portraits statiques V84 ne formaient pas une conversation native de ce personnage.

Quatre dessins indépendants, corps entier, sont livrés : écoute, explication, désignation des surfaces séparées, conclusion. Ils conservent le même rôle local et une seule orientation droite, le costume filet/cuir, la peau gris-bleu tachetée et les dreads noirs attachés. Ils ne représentent aucune prise d’objet à distance. Le PNJ reste à son poste ; plaque, empreinte et fragment gardent leurs positions physiques.

Cinq sorties ImageGen originales ont été examinées. La première désignation est conservée en référence refusée, avec seulement 14 pixels libres à droite. Une nouvelle génération native complète a remplacé cette sortie ; aucun padding, détourage ou correctif alpha ne lui a permis de franchir la barre de 16 pixels. Les quatre retenues ont un canevas RGBA 1024×1536, un alpha réellement transparent, zéro pixel visible au bord, au moins 16 pixels de marge horizontale et 32 verticale. Chaque PNG public est identique à sa copie brute privée. Le script lit dimensions, alpha et ancrages sans réécrire d’image.

Les quatre images complètes partagent une seule échelle positive uniforme ; seul le pivot natif des pieds change. Aucun miroir, crop, étirement, filtre ou assemblage de membres n’est ajouté. Les reçus complets et la revue visuelle sont dans `art-source/v111/archivist-conversation/`.

## Affichage et limites

`HomeworldArchivePlaqueWorldV111` conserve les supports et les pièces du monde. Il révèle le fragment après la reprise effectivement prononcée, au lieu de peindre la pièce avant sa découverte. Le même composant de conversation alimente un portrait décoratif visible dans le dialogue K-17 : il s’agit toujours des mêmes quatre PNG, pas de huit nouveaux dessins.

Une ligne de dialogue explicite déclenche au plus 1 200 ms de geste : écoute jusqu’à 220 ms, explication jusqu’à 520, désignation jusqu’à 820, conclusion jusqu’à 1 100, puis écoute. Cette horloge décorative est indépendante du temps de la ville, qui est suspendu pendant un dialogue. Pause, page masquée et perte de focus suspendent l’avancement sans rattrapage ; le mouvement réduit garde une seule pose. Le décodage des quatre images est requis et un échec conserve le personnage statique de référence. Aucun geste ne valide une action de quête ou de sauvegarde.

Les tests vérifient les originaux, leurs marges, le refus conservé, l’échelle/pivot, l’horloge bornée et la révélation physique du fragment avec le vrai parcours source. La preuve navigateur finale est publiée séparément par la recette V111 ; la revue des PNG ne la remplace pas. Marche K-17, manipulation d’objets, autres métiers et orientations supplémentaires restent ouverts. Aucune identité canonique, lignée, récompense ou clôture générale du Homeworld n’est déduite de ce lot.
