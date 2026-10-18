# V88 — état des imports et des contenus Excel

État du lot local vérifié le **7 octobre 2026 à 22:00:52 UTC** (8 octobre à 00:00:52, heure de Paris). Les nombres ci-dessous distinguent les sources disponibles, leurs fonctions effectivement consommées et leurs limites. Ce document ne certifie ni un parcours navigateur, ni une publication V88.

## Imports Drive

Le dernier inventaire couvre **15 dossiers accessibles / 239 IDs**, relus du `2026-10-07T21:31:13.231Z` au `2026-10-07T21:31:19.563Z`. Comparé à l’instantané de 16:25:01.717 UTC, il ne contient aucun nouvel ID, changement de taille/date/type/titre ou Excel révisé. Les recherches de dossiers « Yautja », « Predator » et « Longue Chasse » n’ont pas révélé de nouveau dossier accessible. Les réponses de chaque dossier contiennent moins de 100 enfants ; ce périmètre ne prouve rien sur les fichiers inaccessibles.

Deux omissions historiques ont été récupérées dans les archives Badlands V2/V4 : **2 PNG natifs / 7 400 036 octets**. Leur inspection visuelle montre des grilles de plusieurs sujets avec labels, fond RGB opaque et une seule trame. Elles sont exposées dans la bibliothèque et le codex comme **références complètes**, sans découpe ni transformation de pixels, avec leurs versions, empreintes et limites de fidélité.

| Source Drive | Image native ajoutée | Dimensions | Octets | SHA-256 du PNG |
| --- | --- | --- | ---: | --- |
| [Badlands V2 — 33 sprites](https://drive.google.com/file/d/1jm0X8VNx1e_gKwMQbc14Sf6BO3XP-Js1/view) | `APERCU_BADLANDS.png` V2 | 2200 × 4011 | 2 498 642 | `715f09cf27635020853a3fb566db317694c00e62266a6181b338814d9afd3203` |
| [Badlands V4 — 61 assets](https://drive.google.com/file/d/1gUgzXhkKTsdmjpT3MgKBEfgttkIu5GAo/view) | `APERCU_BADLANDS.png` V4 | 2400 × 7026 | 4 901 394 | `3da241e79a7fade6b9d04f2fc4ab0da6a6682b0a33025eb763ce765df4b9e690` |

Les deux RAR ont été téléchargés depuis des handles Drive authentifiés, sans base64, puis comparés en lecture seule : **96 entrées PNG / 63 SHA distincts**. Les **94 entrées individuelles / 61 SHA de sprites** étaient déjà présentes avec leurs octets natifs exacts ; elles ne sont pas comptées comme de nouveaux imports V88. Aucun script de pack n’a été exécuté. La mention historique V4 « 61 → 46 » reste documentaire et ne crée aucune relation de combattant.

La bibliothèque montée contient actuellement **1 871 SHA référencés distincts**, toutes catégories et versions réunies. Ce nombre n’est ni un compte de combattants ni un compte d’animations. Les deux ajouts V88 fournissent **zéro nouveau corps PNJ, zéro animation et zéro certification canonique 1:1**. Les consumers de corps Yautja les refusent, même lorsqu’un ID historique explicite est demandé.

Limites conservées : **640 variantes V84 restent des métadonnées sans PNG**. Les **28 autres anciennes archives** non retransférées n’ont pas de preuve d’identité de leurs octets Drive renouvelée dans ce lot ; une comparaison de pixels locaux ne doit pas être présentée comme une réauthentification de l’archive distante. La vérification de 2 575 chemins PNG locaux n’a trouvé aucune erreur native, mais ne comble pas ces lacunes de source.

Preuves : [registre V88](../app/game/data/driveNewDepositsSpritesV88.json), [provenance et limites](drive-new-deposits-v88-sources.json), [importeur](../scripts/import-drive-new-deposits-v88.py), [tests](../tests/drive-new-deposits-v88.test.mjs). Les **huit tests ciblés ont réussi**, dont empreintes/dimensions/trames, fichiers individuels préexistants, bibliothèque/codex et exclusion des corps. Lint ciblé, syntaxe Python et contrôle de confidentialité ont été vérifiés séparément. Ces résultats ne sont pas une validation visuelle ou hydratée en navigateur.

## Source Excel et travail effectif

Source commune : `Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, **139 feuilles**, SHA-256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`. Les cellules importées restent des données et ne sont pas exécutées comme des instructions. Une fiche ou un prix sourcé ne constitue pas à lui seul une fonction de campagne terminée.

| Chantier | Source | Fonction effective du lot | Limites |
| --- | --- | --- | --- |
| Guerre de clans, relais S12 | `Structures de guerre!D17:J17`, U28 et règles R05/R09/R19 | Réserver, acheminer, construire puis remettre des relevés réellement acquis par les messagers ; conserver observateur, trajet et âge de l’information. | Un seul lien topologique choisi ; pas de radio simulée, révélation globale, téléportation ou bataille de campagne. |
| Guerre de clans, treuil S17 | `Structures de guerre!D22:J22`, U20 et passage L31 | Deux artisans présents déplacent un vrai kit entre les deux extrémités reconnues d’un lien de relief ; position, entretien et reçu restent conservés. | Pas d’animation de treuil entre plateformes, de tonnage canonique, de déplacement des personnes, de construction automatique ou de réparation de l’événement W5-EV25. |
| Ensemble des ouvrages | 18 lignes de `Structures de guerre` | **8/18** structures sont prises en charge dans l’atelier indépendant : S02, S03, S04, S05, S07, S16, S12 et S17. | Dix structures restent hors de cet atelier. Son budget, ses équipes et ses reprises sont distincts de l’armée, du compte et de la sauvegarde de campagne. |
| Vaisseau, huit postes | `Campagne commune!A27:K27`, huit lignes initiales de `Vaisseau personnel`, dialogue et actions liés | Inspections physiques de navigation, armurerie, archives, apparence, galerie, infirmerie, entraînement et sas ; faits relus, pause/portée contrôlées, relevés invalidés si les faits changent. | Inspection de la coque déjà disponible : pas d’acquisition R2-M021, de mission R2-M022 achevée, de soins/objets gratuits ou de voyage R2-M023. |
| Voix | `Voix V6!A6:I215` | **210 profils textuels / 202 noms / 8 noms homonymes** ; résolution par nom source unique ou ID explicite, affichage de tous les candidats ambigus avec leurs cellules. | Directions d’interprétation, pas de nouveaux fichiers audio ni de synthèse. Aucun binding scène/locuteur n’est inventé pour les homonymes. |

Les inspections du vaisseau sont conservées par propriétaire et coque dans le raccord de sauvegarde du lot. Le sas vérifie les sept autres postes ; un simple statut `ready` ne devient pas un droit de propriété, un succès de mission ou une permission de nouveau voyage. La reprise de l’atelier de guerre ne crédite pas la campagne et ne se substitue pas au compte/cloud.

Les huit homonymies vocales sont Orha, Isha, Mara Venn, Saar, Yena, Artisane des Branches Entrelacées, Vigie de la Couronne et Artisane des Forges Souterraines. Le rang, le costume, la proximité d’un rôle ou l’ordre des lignes ne prouvent pas quel profil parle.

Détails et périmètres : [S12/S17](clan-war-infrastructure-v88.md), [S16](clan-war-s16-extraction-v88.md), [inspections du vaisseau](ship-preparation-v88-scope.md), [profils vocaux](bible-voice-profiles-v88.md). Leurs tests de modèle, handlers ou SSR restent distincts d’un parcours réellement joué dans le navigateur.

## Travail encore ouvert

- **Campagne et voyages :** acquisition et remise des droits R2-M021, gestes/travaux et critères complets de R2-M022, nouvelle instance de coque, ressources de route, départ physique FLIGHT5-04, quai chargé et trajet R2-M023. La campagne entière n’est pas déclarée terminée par ce lot d’inspections.
- **Guerre et économie :** dix ouvrages restants, consommables et soins, énergie, transport individuel, montures, combat et angles physiques, informations situées et géométrie de vision ; raccord au conflit et à l’économie réels de campagne. Les budgets de l’atelier ne sont ni des revenus ni des conquêtes acquis.
- **Voix audio :** attribution documentée des profils ambigus, production des clips, traitement sonore, synchronisation et écoute dans les scènes. Les 210 fiches restent une préparation textuelle ; elles ne prouvent aucun doublage achevé.
- **Sources et validation produit :** retrouver les PNG V84 absents, renouveler si nécessaire la preuve des archives restantes, puis vérifier séparément les parcours visuels/hydratés et la publication. Aucun PASS navigateur ou Vercel n’est déduit de l’import, de la lecture des cellules ou des tests SSR.
