# V106 — Archivage physique au quai oriental

La branche B de `D6-W-PNJ-ROLE-03` devient une activité physique : choix et réponse de l’archiviste, prise d’un dossier, portage à pied, dépôt sur son support propre, second trajet puis retour au même interlocuteur pour consigner explicitement l’incertitude. La parole seule n’achève aucune manipulation. Le registre de la cité propose l’archiviste uniquement lorsque le port a été visité ; son guide utilise les obstacles et le moteur ordinaires.

## Sources exactes

- Classeur `Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, SHA-256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.
- Corpus public `public/game/dialogues/v85/bible-dialogues.json`, SHA-256 `e36efdc3d5ac8fddb74dd683458b72873203446204e768b02aa13e4db17eed30`.
- Scène : `Scènes de dialogue V6!A383:Q383`.
- Action B : `Choix et actions V6!A789:I789`.
- Choix B et réponse : `Répliques V6!A3189:K3190`.
- Succès après dépôts et retour : `Répliques V6!A3184:K3184`.
- La reprise `A3186:K3186` reste extraite pour audit ; elle n’est pas jouée, car son bord documentaire n’est pas représenté.
- L’ouverture `A3183:K3183`, la branche A et la ligne d’échec ne sont pas jouées. La plaque nommée et l’empreinte de cette ouverture ne sont pas des objets produits par cette mise en scène.

L’extraction `app/game/data/bibleArchiveSceneV106.json` contient les onze lignes complètes nécessaires à l’audit ; le test les compare au corpus épinglé, cellule par cellule. Les textes sont des dialogues originaux du projet V6, présentés en traduction française, sans citation de film ni nouvel enregistrement vocal.

## Mise en scène et limites

Deux dossiers d’étude génériques sont représentés par des contenants scellés natifs existants, identifiés A et B. Deux pupitres natifs distincts servent de supports A et B. L’apparence du professionnel est le corps neutre `classic/reference` déjà disponible. Le joueur voit le contenant au sol, porté devant le corps, puis posé sur son support. Le repère de charge ne prétend pas fournir une nouvelle pose de saisie ou une animation de main peinte.

Les images natives ne sont ni recolorées, ni tournées, ni découpées autrement. Le contenant `sealed-cargo-case-left` est mis uniformément à une hauteur de 34 unités (65 dans son catalogue original), adaptation déclarée dans l’écran de provenance. Les pupitres `clan-lectern-right` gardent leur hauteur native de 76 unités. Les pivots, rectangles source, supports au sol et dimensions proviennent de `homeworldNativeDecorV80.json`. Leurs pixels restent immuables :

| Image | SHA-256 |
| --- | --- |
| `/game/homeworld/v80/clan-lectern-right.png` | `92a8a53ca5c303d4186ff17f44beccc282de384d7cf64b4e191d79cbd766a899` |
| `/game/homeworld/v80/sealed-cargo-case-left.png` | `0d27b2eec19ddbd8d1ea65a8071971b34e24d93abb0052c98e7bd32058d98012` |

Le module pur `homeworldArchiveSolidsV106.ts` calcule les deux empreintes depuis les points de support natifs et les positions de `homeworldArchiveDefinitionV106.ts`. La couche civique, le moteur réel, le planificateur local et son worker partagent ces mêmes empreintes. Les anciens registres V80/V92 restent inchangés. Les petits contenants portables ne deviennent pas des obstacles statiques.

La carte du carnet affiche uniquement le quai oriental déjà visité, les deux supports, les positions courantes des dossiers, la charge et l’étape. Une liste conserve les états et coordonnées A/B lisibles même si un dossier est posé ailleurs ; un indicateur de bord signale alors « hors cadrage du quai », sans ajouter de terrain à la carte. Elle ne révèle aucun quartier inconnu. Aucune plaque historique précise, conclusion d’identité, récompense, monnaie, rang, équipement ou indice de campagne n’est créé.

## Persistance et reprise

Le champ facultatif `homeworld.archiveV106` reste absent des anciennes parties tant que l’activité n’est pas commencée. Son schéma versionné conserve propriétaire, révision, phase, positions individuelles des deux dossiers, dernier point physique confirmé, distance marchée, charge unitaire, interruptions et constat d’incertitude.

Les déplacements proviennent exclusivement du moteur urbain. Les sauvegardes ordinaires associent le point de l’acteur et la position du contenant porté dans une seule écriture. Une pause ou perte de contexte interrompt l’opération : un dossier porté immobilise la marche jusqu’à reprise au dernier point, ou dépôt explicite au sol. Ce dépôt conserve un objet récupérable à sa position réelle. Les dépôts sur support sont distincts et demandent un transport mesuré ; aucun second dossier ne peut être porté simultanément.

Une écriture refusée conserve le précédent état durable, expose un bouton de réessai et immobilise le moteur. Le réessai conserve le point échantillonné sans rejouer l’action refusée. Les contrôles rendent le focus à un élément persistant avant qu’un bouton disparaisse. Les imports refusent propriétaire étranger, révision/formats incompatibles, source altérée, positions non finies et dissociation entre le dossier porté et le checkpoint de l’acteur. Une autre opération cartographique active reste incompatible ; les relevés A/B antérieurs conservent leur schéma et leurs octets.

## Vérification

`tests/homeworld-archive-v106.test.mjs` vérifie les cellules exactes, les obstacles partagés, deux transports par le vrai moteur, le dépôt séparé, le retour, les refus, les reprises, le parking, l’import et le guide. `tests/homeworld-input-runtime.test.mjs` conserve tous ses anciens cas et ajoute le refus d’écriture archive au vrai poll d’entrée. La recette `scripts/qa-homeworld-archive-v106.mjs` utilise un seul checkpoint initial accepté, puis l’interface et le clavier réels. Elle couvre guide, sources, portage visible, pause, refus de quatre actions, réessai, parking, reprise, Continue en charge, deux supports, conclusion explicite et mobile.

Le rapport compilé final est `docs/v106-homeworld-archive-validation.json`. Les préflights ne constituent pas une certification de production. Le périmètre ne comprend pas une campagne complète, une manette physique, une nouvelle animation de main ou la branche A encore ouverte de cette scène.

Recette compilée validée : **48/48 contrôles PASS**, zéro erreur navigateur, neuf captures ouvertes et douze pièces portables (6 328 855 octets). Runtime `b5f75050beee65af708b4a2512d582f585e977e5`, build `KlZy6p2FCQDouFqIgys2f`, quatre réponses HTML200 portant cet identifiant et sources avant/après identiques. Les tests ciblés totalisent 9 cas d’archivage et 27 cas d’entrée, tous PASS ; le lint ciblé est propre. Les commandes effectivement exécutées sont consignées dans le suivi V106.
