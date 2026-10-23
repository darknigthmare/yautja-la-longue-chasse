# Guerre de clans V106 — préparer l’assaut et lire le front

La commande d’assaut passe désormais par un aperçu figé, puis une confirmation qui réserve le véritable ordre existant. Préparer ou annuler ne modifie ni tour, ni stock, ni personne. La confirmation n’avance pas le tour et n’accorde pas le territoire : seule la résolution ordinaire peut produire une conquête et une occupation.

## Sources exactes

Classeur `Yautja_V3_Guerres_de_Clans_Trois_Modes.xlsx`, SHA-256 `3ef3712c9ffa865f918133bee7667155c1bb320f060b4a19cc58ff650ffd0dfa`, extraction conservée dans `app/game/clanWarV85Source.json`, feuille **Règles de conquête** :

| Règle | Cellules | Raccordement V106 |
| --- | --- | --- |
| CON-R09 | C14:H14 | Renseignement daté issu de la reconnaissance réelle, intervalle et âge conservés dans l’aperçu et sur la carte. |
| CON-R12 | C17:H17 | Départ, stock local, gardes restantes, liaison et occupation distingués du revenu ; aucun revenu à la simple réservation ou capture. |
| CON-R14 | C19:H19 | Personnes identifiées, modèle commun avec la résolution native, hypothèses lisibles et fourchette conditionnelle ; confirmation explicite après relecture. |

Le contrat exporté `WAR_ASSAULT_CONTRACT_V106` épingle ces trois références sans modifier les états des fiches historiques. La présente livraison est une avancée de l’exercice libre ; elle n’admet pas la totalité de ces règles dans tous les modes du classeur.

## Ce qui se joue

1. Le joueur sélectionne un départ contrôlé, une cible voisine et au maximum huit personnes réellement présentes.
2. Sans rapport, l’effectif adverse reste inconnu et aucune estimation de pertes du modèle n’apparaît. Le joueur peut préparer une véritable reconnaissance depuis ce panneau.
3. Un rapport joué fournit seulement son intervalle à sa date d’observation. L’aperçu calcule les cas du modèle d’assaut isolé pour chacun des effectifs de cet intervalle et les trois variations déjà présentes dans le moteur. Le calcul appelle la même fonction pure que la résolution.
4. L’aperçu indique séparément que la force actuelle a pu changer et que toute la colonne peut devenir indisponible. Les cas étudiés ne sont ni une probabilité de victoire, ni une prédiction du prochain tour. Le moteur de prévision ne lit ni seed, ni ordres futurs, ni roster adverse courant, ni stocks cachés.
5. Modifier la sélection, réserver un autre ordre, modifier la garde ou remplacer le front rend l’aperçu périmé. Même un import de même planète/tour/révision avec les mêmes faits publics exige une nouvelle lecture : une attache mémoire opaque au véritable objet front est vérifiée, sans hash privé ni identité sérialisée.
6. Confirmer appelle `queueWarOrderV85` après vérification du front et de l’aperçu. Le budget local, les personnes, les limites d’opérations, les marges de révision et le journal restent ceux du moteur existant.

L’aperçu est volontairement éphémère. Un rechargement conserve les ordres effectivement réservés, mais impose de relire un nouvel aperçu avant toute nouvelle confirmation.

## Atlas et logistique

Le calque **Renseignement daté** conserve les couleurs de contrôle et les textures des trente mondes. Les marqueurs affichent les propres personnes aptes actuellement connues, l’intervalle et le tour d’un rapport joué, ou `?`. Un rapport ancien est signalé. Aucun nombre adverse courant n’est révélé par ce calque.

L’inspection d’un territoire contrôlé montre le véritable chemin de réseau depuis sa base, en suivant les mêmes contrôles, transits et dates que l’approvisionnement natif. Chaque maillon est inspectable. Une liaison peut emprunter un transit neutre sans donner un droit de déposer des cargaisons chez autrui : les règles et dépôts des convois V105 restent inchangés.

## Compatibilité et limites

Aucun nouveau payload, aucune version de sauvegarde, aucun nouveau stock, aucune personne et aucune planète ne sont créés par V106. Les soixante hashes de référence des fronts historiques initiaux et résolus restent inchangés. Les itinéraires V105, réservations, scellés, imports et protections des formats futurs gardent leur contrat.

Les six ouvrages physiques V6 restent ouverts : W3-S09 Quai léger, W3-S10 Aire de montures, W3-S13 Écran de confinement, W3-S14 Emplacement de duel, W3-S15 Station d’écoute, W3-S18 Plateforme d’escale. Le front libre ne possède pas les transports, montures, énergie, duels consentis, sons spatialisés ou navires/routes orbitales nécessaires. Aucun compteur abstrait ne prétend les livrer.

Le jeu complet RTS, la diplomatie narrative, les affrontements simultanés détaillés, la campagne et les appareils mobiles physiques ne sont pas certifiés par cette tranche.

## Vérification reproductible

Tests : `node --experimental-strip-types --test --test-reporter=spec tests/clan-war-assault-v106.test.mjs tests/clan-war-convoy-route-v105.test.mjs`.

Recette : `scripts/qa-clan-assault-v106.mjs` sur l’application réelle. Un seul état initial explicitement déclaré utilise le roster et les stocks natifs de Korthas ; les personnes adverses conservent leur garnison pour isoler l’assaut local. Toutes les reconnaissances, gardes, sélections, annulations, réservations et résolutions passent ensuite par le menu, les boutons publics et les archives réelles. Les résultats stocks/personnes sont comparés au résolveur ordinaire. Les captures couvrent l’aperçu daté, la péremption, la carte, la conquête/liaison et le mobile 390 px.

La preuve de production finale, distincte des essais de développement, est `docs/v106-clan-assault-validation.json` ; elle doit épingler le build servi et son commit, les sources avant/après identiques, les captures inspectées et leurs SHA-256.
