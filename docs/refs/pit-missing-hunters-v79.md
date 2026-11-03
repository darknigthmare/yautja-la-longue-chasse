# The Pit V79 — références visuelles des six dossiers absents

Reçu de recherche du 3 octobre 2026. Ce document décrit les références examinées par l’agent `new_chat_ingest`, pas un certificat de fidélité 1:1, d’animation complète, de livraison runtime ou de publication. Les ajouts de Last Hunt et Classic 2000 annoncés par l’intégrateur sont un chantier séparé : leur validation doit porter sur les PNG générés et leur consommation réelle.

Les références originales et leurs SHA-256 sont conservés dans `work-local/v79/references/`, hors des assets publics du jeu. Aucun dessin de comics n’a été copié dans le runtime. Aucune authentification, protection d’affichage ou page privée n’a été contournée.

## Preuves et portée

- [Manifeste de relecture et de provenance](../../work-local/v79/references/review-manifest.json) : 81 fichiers visuels/PDF, dont 80 images ; **63 images réellement ouvertes avec `view_image`**, 17 miniatures du manuel Jaguar non ouvertes, explicitement marquées comme telles.
- [Acquisition Marvel et previews autorisées](../../work-local/v79/references/acquisition-1791035381388.json) : 11 JPG originaux, HTTP 200 ; dimensions, octets et SHA conservés.
- [Acquisition manuels](../../work-local/v79/references/manual-acquisition-1791035552950.json) : PDF original Steam, HTML du manuel Jaguar ; catalogue ECC demandé mais HTTP 404.
- [Acquisition références des jeux](../../work-local/v79/references/game-visual-acquisition-1791035707743.json) : API Steam et 12 captures de cette API, neuf captures Jaguar, 33 miniatures de son manuel et index sources.
- [Acquisition entretien d’auteurs et index de scans](../../work-local/v79/references/followup-acquisition-1791036384930.json) : case Blood Ties créditée à Damaggio, HTML de l’entretien et cinq index Jaguar. Le GET direct de DC retourne 403 ; il n’a pas été forcé. La page publique DC a pu être lue avec l’outil web.
- [Acquisition extraits et scans complets ciblés](../../work-local/v79/references/excerpt-manual-acquisition-1791036604898.json) : trois courts extraits Blood Ties et cinq scans de pages du manuel Jaguar, tous réellement ouverts. Les URLs d’images provenaient des index publics lus, pas d’un identifiant deviné ou d’une API privée.

Le manifeste d’acquisition reste inchangé : `visuallyReviewed:false` y décrit l’état au téléchargement. Le manifeste séparé de relecture enregistre les ouvertures effectivement réalisées. Son `reviewRecordedAt` est l’heure réelle de consolidation du reçu ; les heures exactes des ouvertures antérieures n’ont pas été conservées et ne sont pas inventées.

## Décision par dossier

| Dossier source | Identité à employer | Référence effectivement vue | Limite qui reste ouverte |
|---|---|---|---|
| `add-last-hunt-super` | Chasseur massif de **Predator: The Last Hunt** ; aucun nom personnel/clan confirmé | Corps entier accroupi, deux pieds, masque, armure et lames visibles dans les previews | Pas de dos neutre ni animation source ; contexte historique d’une preview à distinguer de l’adversaire ultérieur |
| `add-avp-classic` | **Predator — Aliens Versus Predator Classic 2000** ; incarnation du joueur | Même modèle en plusieurs captures officielles Steam, tête/torse puis pieds, profil ; manuel original | Pas un individu nommé ; ne pas substituer l’armure de 2010 ni l’arsenal Jaguar |
| `add-bloodshed` | **Predator du tournoi — Bloodshed** ; pas un nom propre démontré | Couvertures démasquées et entrée masquée avec longue tunique dans preview4 | Tenues distinctes, vues neutres/pieds de la tenue des couvertures incomplets ; ne pas fabriquer un kit unique par mélange |
| `add-jaguar` | **Jeune guerrier — Alien vs. Predator, Atari Jaguar** | Tête/torse du titre et chargement, avant-bras en vue subjective, pages de manuel | Aucun corps complet du joueur dans les neuf captures et pages inspectées ; le bas du corps 1:1 demeure sans référence |
| `add-blood-ties-father` | Chasseur Blood Ties affrontant Batman ; **père présumé, attribution non certifiée** | Corps avec deux pieds dans scène de gel, dreads longs, armure ; autre extrait démasqué | Les pages vues ne contiennent pas le dialogue familial : l’attribution ne doit pas reposer sur une silhouette ou une légende secondaire |
| `add-blood-ties-son` | Chasseur Blood Ties affrontant Robin ; **fils présumé, attribution non certifiée** | Design distinct à dreads courts, masque clair, crânes de genoux, pagne | Pieds/bas partiellement coupés ; identité familiale non démontrée par le texte primaire des extraits vus |

Les quatre derniers dossiers restent donc ouverts. Une référence partielle est utile pour un détail ou une variante, mais ne certifie ni une apparence complète ni l’identité d’un adversaire anonyme.

## Bloodshed : deux états de costume à préserver

Sources : [Marvel #1](https://www.marvel.com/comics/issue/133275/predator_bloodshed_2026_1), [Marvel #3](https://www.marvel.com/comics/issue/133277/predator_bloodshed_2026_3), [preview autorisée #4](https://aiptcomics.com/2026/05/15/marvel-preview-predator-bloodshed-4/).

La couverture #1 montre un chasseur démasqué : tête orange/brune mouchetée, dreads sombres annelés, résille, plaques grises et lames de poignet allongées. Le canon apparaît sur son épaule anatomique gauche. Les pieds sont coupés. La couverture #3 ajoute une pose accroupie et une hampe diagonale ; son nom d’arme ne découle pas de sa seule forme.

La preview4 montre l’entrée d’un chasseur masqué, avec une longue tunique sombre et deux pieds griffus visibles pendant le saut. Cette tenue ne doit pas être fusionnée arbitrairement avec les plaques de jambes des couvertures. La formule « King Champ » n’établit pas un nom personnel. Les previews2 et3 présentent surtout humains, gardes et appareils : leurs casques ne sont pas des références du chasseur.

Références clés : [couverture démasquée #1](../../work-local/v79/references/bloodshed-1-cover.jpg), [couverture #3](../../work-local/v79/references/bloodshed-3-cover.jpg), [entrée masquée](../../work-local/v79/references/bloodshed-4-preview-4.jpg).

## The Last Hunt : silhouette massive sourcée, contexte à garder

Sources : [Marvel #3](https://www.marvel.com/comics/issue/110329/predator_the_last_hunt_2024_3), [Marvel #4](https://www.marvel.com/comics/issue/110330/predator_the_last_hunt_2024_4), [preview autorisée #3](https://aiptcomics.com/2024/04/19/marvel-preview-predator-the-last-hunt-3/).

La grande silhouette partage un masque gris os à pointes, de lourdes épaulières superposées, des plaques grises, une peau jaune/brune à grandes taches et de longs dreads sombres annelés. Le panneau inférieur gauche de preview5 montre le corps accroupi complet et les deux pieds griffus ; preview3 précise masque, torse, avant-bras et longues lames courbes.

Les deux autres chasseurs dans un petit panneau de preview3 ont leurs propres masques : ne pas les attribuer au combattant massif. La preview2 est située en 2068 ; une correspondance de design ne prouve pas à elle seule que chaque adversaire du flashback est le même individu futur. La propriété de l’épée diagonale de la couverture #4 reste incertaine. Ne pas la lui attribuer automatiquement, ni remplacer son équipement par celui du Berserker de Predators.

Références clés : [corps entier preview5](../../work-local/v79/references/last-hunt-3-preview-5.jpg), [équipement preview3](../../work-local/v79/references/last-hunt-3-preview-3.jpg), [masque couverture #3](../../work-local/v79/references/last-hunt-3-cover.jpg), [tête démasquée couverture #4](../../work-local/v79/references/last-hunt-4-cover.jpg).

## Classic 2000 et Jaguar : deux incarnations et deux arsenaux

Classic 2000 : [fiche officielle Steam](https://store.steampowered.com/app/3730/Aliens_Versus_Predator_Classic_2000/), [API éditeur réellement lue](https://store.steampowered.com/api/appdetails?appids=3730&l=english), [manuel original](../../work-local/v79/references/classic-2000-manual.pdf).

Les captures09,10 et03 montrent le même modèle : bio-masque bronze/olive, dreads bleu sombre avec anneaux dorés, plaques olive/grises, peau mouchetée, pieds anguleux. 09 renseigne la tête et le corps mais coupe une partie des jambes ; 10 complète les deux pieds mais coupe la tête ; 03 donne un profil partiellement occulté. Le manuel distingue wristblades, Plasma Pistol, Speargun, Plasmacaster et Disc. Les vues subjectives04/12 peuvent préciser un équipement, pas remplacer une silhouette entière.

Références : [09](../../work-local/v79/references/classic-steam-api-09.jpg), [10](../../work-local/v79/references/classic-steam-api-10.jpg), [03](../../work-local/v79/references/classic-steam-api-03.jpg). Les six pages PDF ont été rasterisées et ouvertes ; des substitutions de polices Poppler ont été signalées. Elles ne remettent pas en cause l’original conservé, mais ces dérivés ne constituent pas une validation typographique parfaite du PDF.

Jaguar : [captures du jeu conservées par AtariAge](https://www.atariage.com/screenshot_page.php?SoftwareLabelID=1060), [transcription du manuel](https://static.atariage.com/manual_html_page.php?SoftwareID=2538), [index des scans](https://www.atariage.com/manual_page.php?SoftwareLabelID=1060).

Le titre montre seulement tête/torse masqués ; le chargement ajoute une tête démasquée recouverte de texte ; la capture07 renseigne les lames jumelles et le gantelet. Le manuel décrit un jeune guerrier, l’épreuve d’honneur à Camp Golgotha et la Reine comme objectif. Il prévoit Wrist Blade au départ, Combi-Stick à 150000, Smart Disk à 350000 et Shoulder Cannon à 750000 points. Ces seuils appartiennent à cette édition, pas aux règles universelles de tout Yautja ni à Classic 2000.

Références : [titre](../../work-local/v79/references/jaguar-screenshot-index-01.jpg), [chargement](../../work-local/v79/references/jaguar-screenshot-index-06.jpg), [combat subjectif](../../work-local/v79/references/jaguar-screenshot-index-07.jpg), [scénario p19 imprimée](../../work-local/v79/references/jaguar-manual-page-23-full.jpg), [arsenal p21](../../work-local/v79/references/jaguar-manual-page-25-full.jpg), [arsenal p22](../../work-local/v79/references/jaguar-manual-page-26-full.jpg). Ces pages ne fournissent pas de modèle entier à reproduire.

## Blood Ties : vrais pixels, attribution familiale encore ouverte

Le [catalogue officiel DC](https://www.dc.com/graphic-novels/dc-comics/dark-horse-comics-batman-vs-predator) confirme que le recueil contient Blood Ties #1–4. Il ne fournit pas les dessins complets ni une identification individuelle dans les pages publiques inspectées. La [case créditée à Damaggio dans l’entretien des auteurs Brisson/Diaz](https://www.avpgalaxy.net/website/interviews/ed-brisson-netho-diaz/) montre les deux chasseurs avec Mr Freeze : costumes distincts, dont des crânes de genoux sur le chasseur à droite.

Trois courts extraits publics ont ensuite été ouverts : [adversaire de Robin](../../work-local/v79/references/blood-ties-robin-excerpt.jpg), [adversaire de Batman gelé](../../work-local/v79/references/blood-ties-freeze-excerpt.jpg), [démasqué sur les toits](../../work-local/v79/references/blood-ties-age-dialogue-excerpt.jpg). Les [index Robin](https://imgur.com/a/hIP5P0T), [gel](https://imgur.com/a/UJNwBEw) et [toits](https://imgur.com/a/SobTKCx) sont des reproductions tierces ; leurs légendes « Father/Son » ne sont pas une preuve primaire.

L’adversaire de Robin porte de très courts dreads, un masque ivoire, une peau jaune mouchetée sous résille, des plaques claires, des crânes de genoux et un pagne violet. Celui affrontant Batman a de longs dreads et une armure grise ; la lumière froide colore sa peau en vert/bleu. Le dernier panneau montre ses deux pieds. L’extrait de toit ajoute une tête pâle mouchetée et un dos en armure rouge. Les détails de poignet/membre demandent une vérification rapprochée : une forme occultée ne permet pas de déduire une prothèse ou une anatomie complète.

**Aucune bulle familiale ne figure dans les trois extraits examinés.** Les deux apparences peuvent documenter des rôles d’adversaires ; elles ne doivent pas être enregistrées comme père/fils certifiés, ni affublées d’un nom propre ou de clan inventé. Une page primaire identifiant la relation, ou un modèle officiel nommé, reste nécessaire.

## Contrat de fidélité pour la prochaine passe d’assets

La présence d’un dessin entier ne certifie pas un dos, une marche, des rotations, toutes les mains ou dix plaquettes d’animation. Chaque sortie OpenAI doit être confrontée à ces références, avec contrôle des quatre mandibles, mains/doigts, asymétrie des équipements, attaches de dreads, pieds et absence de duplication d’armes. Les variantes masquées/démasquées ne doivent pas changer arbitrairement l’armure.

Gabarit proposé pour un asset nouveau : « Une seule silhouette de combattant, corps entier jusqu’aux griffes, pose de référence neutre à trois quarts adaptée au jeu 2D, fond transparent. Reproduire les volumes, le masque, les plaques et les attaches des références jointes. Les références sont une source de design ; ne pas recopier la page, les textes, le cadrage narratif ou les autres personnages. Aucun emblème, trophée, clan ou arme sans preuve. Ne pas inventer les parties cachées comme si elles étaient certifiées. »

Contraintes spécifiques à vérifier :

- **Last Hunt** : conserver masse du corps et épaulières, masque pointu propre à la référence, motifs de peau, pagne et lames réellement vues ; ne pas emprunter l’arsenal du Berserker. La face démasquée est une variante sourcée à contrôler, pas une nouvelle case générique.
- **Classic 2000** : conserver proportions du modèle de cette édition, masque bronze/olive, dreads bleu sombre annelés et plaques correspondantes. Choisir une arme réellement représentée et compatible avec le manuel ; ne pas superposer toutes les armes sur le portrait.
- **Bloodshed** : générer séparément la tenue de couverture démasquée et l’entrée masquée à tunique si la suite retient ces variantes. La reconstruction des pieds/du dos absents doit être étiquetée adaptation, jamais 1:1 certifié.
- **Jaguar / Blood Ties** : poursuivre les références avant une certification d’apparence entière ou d’identité familiale. Ne pas résoudre le manque par un chasseur générique, un masque de 1991 ou une attribution automatique d’image.

Les histoires individuelles peuvent reprendre des événements dont la source primaire est disponible. Les noms, armes et relations non démontrés restent des champs inconnus. Aucun chapitre complet, animation native ou campagne jouable n’est livré par ce lot de recherche.
