# Convois terrestres sur plusieurs étapes — V105

Le panneau normal de Guerre des clans permet de préparer un trajet entre les dépôts contrôlés, d’affecter un à huit porteurs présents et de choisir un lot S/M/I. Le trajet suit les vraies routes de la planète. L’atlas distingue les étapes livrées, la prochaine étape, les liaisons prévues et les blocages ; chaque dépôt reste inspectable depuis la liste du convoi.

## Sources et adaptation

Source importée : `Yautja_V3_Guerres_de_Clans_Trois_Modes.xlsx`, SHA256 `3ef3712c9ffa865f918133bee7667155c1bb320f060b4a19cc58ff650ffd0dfa`, feuille **Règles de conquête**.

| Identifiant | Cellules | Règle appliquée |
| --- | --- | --- |
| CON-R04 | C9:H9 | Une arête praticable par tour ; au plus huit personnes identifiées. |
| CON-R10 | C15:H15 | Trajet réel, porteurs présents, examen des maillons et rupture visible. |
| CON-R11 | C16:H16 | Lots locaux annoncés ; aucune téléportation du budget consolidé, conversion ou solde négatif. |

Le convoi utilise les ordres logistiques déjà livrés dans l’exercice libre. Chaque étape dépose les lots dans un magasin contrôlé. Le droit de transit seul ne donne pas la propriété d’un magasin. Les lots déposés participent au stock local ordinaire, donc à l’entretien ; le plan ne leur donne aucune protection cachée. Il ne crée ni véhicule, ni personne, ni monnaie. Les six ouvrages historiques encore ouverts restent ouverts.

## Effets et interruptions

L’enregistrement du plan ne dépense rien, ne déplace personne et ne réserve pas les porteurs. Le bouton de prochaine étape utilise le créneau logistique existant et le validateur réel des ordres. Il réserve le lot local et les mêmes identités pour un unique lien. Le joueur doit confirmer le tour puis réserver séparément le lien suivant.

Le validateur contrôle de nouveau les dépôts du trajet restant, les routes, le stock du départ, les porteurs et les réservations. Un dépôt perdu, un blessé, un porteur déplacé, un manque de stock ou un créneau occupé suspend le départ. Aucun nouveau trajet n’est choisi à l’insu du joueur. Pendant la résolution, un départ perdu, un stock rompu, un porteur indisponible ou une arrivée perdue annule l’étape sans débit ni validation. La livraison et son point d’avancement appartiennent à la même transaction de tour. Une attaque adverse ultérieure conserve ses conséquences ordinaires.

Annuler l’ordre de l’étape libère son lot et ses personnes. Retirer le trajet annule sa prochaine réservation mais conserve les dépenses, positions et livraisons déjà résolues. Le plan indique le dernier point atteint, sans garantir que les personnes s’y trouvent encore après une autre opération.

## Archives

Les fronts sans plan conservent leur payload version1 et leurs octets historiques. Enregistrer un plan adopte explicitement le payload2 avec `convoyRouteV105`. Les lecteurs V104 refusent cette version2 ; le lecteur V105 refuse les versions suivantes, les versions2 dépourvues de schéma, les trajets étrangers au graphe et les manifestes ne correspondant pas à l’ordre scellé. Le retrait du plan conserve la version2 avec un champ nul. Le stockage garde les clés historiques et ses protections transactionnelles existantes.

L’export du **front libre** contient les positions, stocks, ordres, blessés, rapports, checkpoint et plan de cette planète. Il est distinct de l’export de recette du générateur et de l’archive de campagne. L’import exige la même planète et un fichier valide, affiche les tours du front courant et du fichier puis demande une action explicite de remplacement. Il remplace la photographie complète ; il n’ajoute jamais les stocks importés aux stocks présents. Une modification du front après lecture invalide cet aperçu. Les réponses de lectures de fichiers plus anciennes sont ignorées.

Le plan vérifie la marge minimale de révisions nécessaire pour tous ses liens et son retrait. Les deux dernières révisions disponibles restent réservées à la résolution d’une étape scellée puis au retrait du plan ; les commandes concurrentes ne peuvent les consommer. Les plafonds existants de tours, de révisions et de ressources restent des limites d’archive.

## Vérification reproductible

Les douze tests `tests/clan-war-convoy-route-v105.test.mjs` couvrent la préparation immuable, trois livraisons consécutives, la conservation de la comptabilité du moteur précédent, les manifestes invalides, les interruptions et annulations, les limites d’archives, l’export/import et le rechargement. Le parcours couvre les trente mondes historiques et les vingt-sept couples de tailles V103. Les empreintes des fronts historiques initiaux et après un tour proviennent du core non modifié du commit `8eaae97b8511ed6b93183729f201af7eb844f830` ; elles comparent soixante états par leurs octets JSON exacts.

```sh
PATH=/workspace/.cloud-tools/node22/node_modules/node/bin:$PATH node --experimental-test-isolation=none --test tests/clan-war-convoy-route-v105.test.mjs
YAUTJA_QA_BASE_URL=http://127.0.0.1:3000 PATH=/workspace/.cloud-tools/node22/node_modules/node/bin:$PATH node scripts/qa-clan-convoy-v105.mjs
```

La recette navigateur joue les commandes publiques du panneau et de l’atlas, recharge un manifeste scellé, télécharge et reprend un fichier avec aperçu, vérifie les stocks et contrôle le mobile. Des fixtures déclarées isolent les adversaires dans leurs garnisons existantes, la perte d’un dépôt après livraison et un payload futur. Les tailles générées18 et96 utilisent leurs propres déploiements et routes. Le rapport distingue le mode développement de la recette de production, contient les empreintes des sources et échoue explicitement sur une erreur Playwright. Les preuves finales de production sont générées après le gel global de V105.
