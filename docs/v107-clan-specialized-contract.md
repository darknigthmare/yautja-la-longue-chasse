# V107 · les six ateliers physiques V6

État : exercice jouable, tests métier et callbacks 22/22 PASS. La validation compilée finale du runtime `dc44ba9f36f5ae3606ea40a2dd68459be8c7510a` passe 45 contrôles, sans erreur navigateur ; les sept captures desktop/mobile ont été ouvertes. Voir [la preuve finale](v107-clan-specialized-validation.json). Ce contrat ne clôt aucune ligne de campagne et ne remplace pas ce rapport de production.

## Contrat exact

Classeur : `Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, SHA256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`. Feuille `Structures de guerre` :

| Source | Cellules | Coût RAV | Entretien RAV/tour | Travail effectif | Opérateur réel |
|---|---|---:|---:|---:|---|
| W3-S09 · Quai léger | C14:K14 | 16 | 2 | 3 tours | W3-U25, 2 membres |
| W3-S10 · Aire de montures | C15:K15 | 12 | 2 | 3 tours | W3-U21, 2 membres |
| W3-S13 · Écran de confinement | C18:K18 | 18 | 3 | 3 tours | W3-U27, 2 membres |
| W3-S14 · Emplacement de duel | C19:K19 | 8 | 1 | 2 tours | W3-U08, 1 membre |
| W3-S15 · Station d’écoute | C20:K20 | 10 | 1 | 2 tours | W3-U05, 1 membre |
| W3-S18 · Plateforme d’escale | C23:K23 | 22 | 3 | 3 tours | W3-U26, 3 membres |

Les champs D/E/F/G/H/I/J sont lus depuis les entrées source, sans recopie des chiffres dans le moteur. Recrutement, effectif, PC, délai et entretien des opérateurs viennent de `Unités de guerre` D:H, lignes 10 (U05), 13 (U08), 26 (U21), 30 (U25), 31 (U26), 32 (U27). Les vrais récupérateurs U19 viennent de D24:H24 : 3 membres, 3 PC, 10 RAV de recrutement, 2 RAV d’entretien, 2 tours d’intégration. Le rival de duel est un second U08 recruté, payé, nommé et distinct.

`Règles de guerre` C12:D12 (R07) borne les PC et distingue équipage civil et unités ; C13:D13 (R08) borne les 120 RAV et les stocks par lieu ; C14:D14 (R09) exige une liaison applicable à la charge ; C24:D24 (R19) distingue kit, appuis, mise en service et opérateur ; C29:D29 (R24) lie un accord à ses acteurs/lieu/fin ; C33:D33 (R28) impose une coque, des occupants et une charge situés ; C34:D34 (R29) empêche un résultat ou transfert répété. Les objectifs `W3-OBJ02`, `W3-OBJ05`, `W3-OBJ17` précisent duel accepté, charge identifiée et capacité réellement franchissable. Le statut original des propositions est conservé par `W3-METH02/03/08`.

Le départ K01 est le `Débarcadère du Premier Écho`, `Territoires de Korthas` C6:N6. L’emprise locale d’exercice n’est ni un nouveau continent ni une correspondance inventée avec les CON-Txx des trente planètes historiques. Aucun adversaire ou stock caché de ces planètes n’est lu.

## Opérations jouables et limites ouvertes

Chaque scénario commence avec un budget fini de 120 RAV et des recrutements réellement débités. Les équipes n’agissent qu’après leur délai source, conservent leurs membres et portent les lots. Un kit identifié est réservé au dépôt, chargé par U19, déplacé avec le porteur puis livré. L’opérateur approche séparément les deux appuis et exécute le nombre exact de tours de travail source. L’attente ne construit rien. L’entretien se prélève sur le lot porté, un dépôt proche ou le casier réellement alimenté au chantier. Une pénurie ou l’absence d’opérateur suspend l’effet.

- **S09** : même skiff, passeur civil, trois membres U19 et charge finie ; embarquement auprès de la coque, fenêtre de courant contrôlée au départ, douze étapes physiques, reçu d’arrivée unique puis débarquement et retour possibles. Un U19 à bord ne peut marcher séparément. U25 reste au quai. Le véhicule est prêté par le mandat d’exercice ; aucun bateau de campagne acquis.
- **S10** : deux montures identifiées sont présentes avant la construction. Les guides U21 rejoignent et conduisent une monture existante, avec un gabarit qui bloque l’ouverture piétonne ; le passage large au sud reste praticable. Un bidon de six unités est chargé au dépôt, porté, livré puis consommé à raison de deux unités par soin effectif. Repos, fatigue et eau persistent. Le visuel est une référence statique conservée à son ratio natif, sans clip de marche ni nouvelle anatomie.
- **S13** : cellule unique chargée au dépôt, transportée par U19 puis branchée sur l’ouvrage construit sur le vrai couloir nord. Quatre charges initiales d’exercice ; une interception consomme une charge. La sonde identifiée avance par pas physiques jusqu’au champ. Le rail adjacent au sud reste ouvert même lorsque le nord est alimenté. Pas de menace adverse découverte par ce test connu.
- **S14** : deux membres U08 présents signent l’objectif local avant le duel ; trois touches et déplacements réels permettent de frapper/esquiver. Sortir du cercle ou laisser entrer U19 interrompt l’accord. Le résultat unique donne au vrai membre vainqueur le droit de retirer un coffre identifié ; sa remise unique change réellement le détenteur et le coffre suit ensuite sa position. Aucun tiers, territoire ou gain de campagne engagé.
- **S15** : deux fichiers WAV réellement présents sont joués par le navigateur ; seule la lecture cumulée sans saut, en portée et sans paroi, déverrouille une prise située. Le micro doit rester au même emplacement pendant cette prise. Les deux enregistrements sont rapportés à la station avant comparaison. La machinerie et le scanner ne deviennent ni faune, ni météo, ni identité ennemie. Les prises transportables référencent les WAV et leurs SHA ; elles ne sont pas une signature infalsifiable de lecture externe.
- **S18** : U26 reconnaît l’emprise terminée et autorise une seule navette prêtée avec un pilote civil et une route connue. U19 embarque avec ses propres identifiants et son lot ; seize étapes déplacent la coque et son manifeste vers l’escale orbitale. Le carburant est fini et le débit au départ idempotent. Export/import à mi-vol reprend la même position. Le débarquement exige une arrivée effective ; les couches surface/transit/orbite sont distinctes : ni U26 ni U19 ne peuvent atteindre le marqueur orbital à pied depuis le sol, et une équipe à l’escale orbitale ne peut marcher jusqu’au sol. Le retour suspend son approche si l’escale au sol manque d’opérateur ou de ravitaillement. **L’acquisition réelle du navire dans la campagne reste ouverte.**

Hypothèses d’exercice visibles : 120 RAV initiaux, deux appuis, géométrie, vitesses, manoeuvres dans un tour, casier de 40 RAV, portage U19 20 / opérateur 6, trois places de transport, courant modulo quatre, quatre charges/carburants, deux montures et leurs gabarits, six eaux, fatigue/soin, trois touches, portée audio 150. Aucun de ces chiffres n’est attribué au classeur. Les dégâts et la réparation génériques ne sont pas inventés lorsqu’aucune source n’en donne la règle.

## Carnet et compatibilité

Module public : `app/game/systems/clanWarSpecializedV107.ts` ; exports `SPECIALIZED_CONTRACT_V107`, `specializedDefinitionsV107`, `createSpecializedV107`, `specializedCommandV107`, `applySpecializedV107`, `exportSpecializedV107`, `importSpecializedV107`.

Contexte distinct `free-specialized-works-v107`, version 1, protocole `specialized-v107-r1`. Le checkpoint porte le SHA source, la clé des règles et hypothèses, les équipes/personnes, stocks, kit, appuis, chantier, positions, véhicules/manifeste, eau, cellule, sonde, duel/coffre, prises, reçus et journal d’actions accepté. Une commande est estampillée une seule fois au point d’intention. Réessayer la même transaction laisse le même état ; réutiliser l’identifiant pour une autre intention est refusé.

Import : taille maximale 4 Mo, contexte/version/source stricts, maximum 5 000 actions validées, rejeu déterministe depuis les seules dotations initiales puis comparaison exacte du checkpoint. La reprise rétablit une sélection d’équipe valide et interrompt immédiatement la destination de marche précédente ; rendu, transferts RAV et déplacements utilisent la même équipe effective. Une future version, un lot gonflé, un champ ajouté ou une action incohérente refuse l’import sans modifier le carnet courant. Les états du moteur sont gelés récursivement ; un état arbitraire ne peut entrer par l’API d’action. Ce n’est pas un sceau cryptographique ni un certificat d’acquisition.

Le carnet n’écrit jamais `SaveGame`, `localStorage` ni les anciens payloads V87–V106. Le joueur exporte explicitement avant fermeture ou changement de mandat. Les trente mondes historiques et le moteur Risk V106 restent inchangés ; les seules intégrations sont l’onglet Bible V6 et son activité (pause de marche/audio lorsque masqué).

## Assets réutilisés

- `/game/homeworld/v77/lava-transit-skiff.png` : adaptation originale existante, image tenue native et ratio conservé ; aucun pixel nouveau ni canon certifié.
- `/game/homeworld/v77/fauna/yautja-horse-corrected.png` : référence statique existante, SHA `d7d8014ff3ace59f3eca4070cca8fa6534accd17b6a38d26cc8b8aecb95a130f`, canon non vérifié, aucune animation simulée par déformation.
- `/game/homeworld/v64/clan-shuttle.png` : navette originale existante, ratio natif conservé.
- `/audio/ambience/ship/v54.wav` : SHA `b2ed760f17352aca514eb2a7aa6f6295127188bf2e7b02390a25ec12295d3371`.
- `/audio/sfx/scan/v54.wav` : SHA `86e2562187736d346c8fac42eeeeb87ff3e77fd75fb8ede2ee562f2a8632907d`.

Les ambiances faune/météo publiques ne sont représentées que par des `missing.txt` ; elles restent manquantes, aucune prise fabriquée ne les remplace.

## Validation reproductible

Tests métier : `env PATH="/workspace/.cloud-tools/node22/node_modules/node/bin:$PATH" node --test tests/clan-war-specialized-v107.test.mjs tests/clan-war-specialized-import-v107.test.mjs` (22 contrôles : 16 règles métier et 6 régressions des vrais callbacks JSX/import). Lint : les quatre fichiers TS/TSX nouveaux/intégrés, le test d’import et le driver navigateur.

Recette préparée : `scripts/qa-clan-specialized-v107.mjs`. Elle ouvre la vraie application, n’injecte aucun état, construit les six ouvrages et réalise chacune des opérations avec les boutons, la marche et les vrais fichiers audio ; contrôle les manifestes, l’idempotence, la conservation de 120 RAV, l’import mi-vol, l’import d’un autre atelier avec le rival sélectionné en marche (arrêt de l’ancienne cible, sélection valide d’U19 et déplacement réel de cette seule équipe), le refus futur, l’absence d’écriture de campagne, le mobile et l’absence d’erreurs navigateur. Sept captures, SHA des sources/actifs avant/après, identité HTML du build et rapport structuré.

Après le gel global seulement :

```sh
env PATH="/workspace/.cloud-tools/node22/node_modules/node/bin:$PATH" \
  YAUTJA_QA_BASE_URL=http://127.0.0.1:3101 \
  YAUTJA_QA_BUILD_ID="BUILD_ID_FINAL" YAUTJA_QA_RUNTIME_COMMIT="RUNTIME_FINAL" \
  YAUTJA_SPECIALIZED_V107_QA_MODE=compiled-app \
  YAUTJA_SPECIALIZED_V107_QA_OUTPUT=outputs/qa-v107/clan-specialized-production \
  node scripts/qa-clan-specialized-v107.mjs
```

Les six lignes Excel restent au statut partiel/en cours tant que la portée de campagne correspondante, les vrais assets manquants et la preuve compilée ne sont pas acquis. Un exercice jouable n’est pas une clôture automatique de ces manquants.
