# Ressources de chasse : référence technique du dépôt

Révision examinée : `e4a6c64a1e77edad8865aa05ca7c2901d62bfa09`.
Les mesures détaillées et les empreintes sont dans `assets-audit.json`.
Ce contrôle ne change aucune image, aucun son, aucun registre ni statut artistique.

## Identité et placement

La référence conservée est le contenu du dépôt. Le rendu natif emploie un viewport
de 1280 × 720, un joueur de 72 × 116 unités et un rig de 256 × 384 dont la ligne
de sol est 366 et la racine (128, 366). Les calques sont transformés depuis leurs
points d'attache existants. L'apparence par défaut reste « jungle-hunter » : peau
ocre tachetée, dreadlocks obsidienne, armure bronze, masque jungle et laser crimson.

Les 17 bitmaps classic disponibles au début du contrôle ont été décodés à leur
taille native avec sharp. Ils correspondent tous exactement aux blobs de la
révision examinée, mesurent 256 × 384, contiennent des pixels visibles et des
pixels entièrement transparents. Le corps complet occupe (30, 16) à (224, 365),
sans contact avec les quatre bords du bitmap. Ce résultat concerne cet échantillon,
pas toutes les variantes de personnages.

Le corps complet et la tête classic V62 ont été ouverts et inspectés. La tête
conserve son PNG natif 1254 × 1254 et son placement déclaré de 96,98817 × 96,98817
dans le rig. Ses pixels occupés touchent les bords gauche et inférieur du PNG :
ce signal documente la découpe source et doit être lu avec le rendu en contexte.
Il ne justifie pas à lui seul de réécrire l'image. Les 16 chemins d'image littéraux
de HuntCanvas figurent dans l'arbre Git examiné ; les chemins construits par les
registres sont couverts par l'inventaire des chargements du rapport de rendu.

Le smoke du renderer natif a ensuite chargé et décodé 146 images sans échec.
Chacune présente des dimensions positives et des pixels visibles dans la lecture
Canvas réduite à 256 pixels maximum par axe. 144 de ces échantillons contiennent
des pixels non opaques ; les deux autres sont les fonds jungle et far-lake.
Cette lecture réduite reste distincte des mesures alpha complètes des 17 bitmaps
classic. L'inventaire figé `assets-smoke.json` conserve ce smoke exact et son
empreinte est vérifiée dans le JSON d'audit. L'inventaire `assets-observed.json`
couvre ensuite les observations des passes finales du renderer, qui peuvent
y ajouter les ressources d'autres missions. Le seul
HTTP 404 du smoke concerne `/favicon.ico`, hors ressources de chasse.

Les sources distinguent explicitement les adaptations anatomiques V62 des portraits
de film nommés. Young et huntress partagent la famille classic. Les matériaux V113
sont des textures reconstruites inspirées de PHG, et ne sont pas des textures
originales du jeu PHG ; aucun n'est sélectionné par défaut. La propriété
`validated` des atlas reste réservée à la décision artistique humaine. Ce contrôle
technique ne lui attribue aucune validation.

## Audio

Le manifeste déclare 37 entrées et 22 fichiers réels totalisant 1 572 214 octets :
21 effets et l'ambiance ship. Les 22 chemins existent dans l'arbre Git. La
provenance V54 contient 22 enregistrements, du son original procédural et des
adaptations CC0 ; elle déclare `canonicalFranchiseAudio: false`.

Les 22 fichiers sont vérifiés en taille et SHA-256 : 21 SFX ont été servis et
décodés dans le smoke Chromium, et l'ambiance ship a été lue directement depuis
le checkout existant. Chaque effet conserve dans le JSON les bytes, SHA-256,
blob Git et origine réellement observés par le serveur du harnais. Les ressources
absentes du checkout sparse ont été servies depuis leur blob Git exact.

Les huit ambiances de mission ont une liste de sources vide avec repli procédural.
Les sept musiques optionnelles ont une liste de sources vide avec silence prévu.
Ces états explicites ne sont pas des erreurs de fichier à combler arbitrairement.
GameClient possède GameAudio, déverrouille Web Audio depuis les interactions,
transmet les événements de HuntCanvas à `playSfx` et choisit ambiance et contexte
musical. Les horloges du combat ne dépendent pas de la lecture sonore.

Le rapport de rendu consigne les chargements, le décodage et les bus réellement
actifs dans Chromium. Ni un décodage réussi ni ce relevé source ne certifient la
qualité d'écoute sur des haut-parleurs physiques.

## Portée

Aucune ressource visuelle requise manquante n'a été identifiée par ce contrôle.
Aucune génération n'a donc été lancée. La fidélité artistique humaine, chaque
variante et chaque pose, ainsi que l'équivalence avec un portrait de film précis
restent hors de cette qualification technique. Les captures natives du rapport
de rendu complètent cette lecture du code et des pixels.
