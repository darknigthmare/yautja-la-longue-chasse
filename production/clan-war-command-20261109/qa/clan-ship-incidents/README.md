# OPS-B01 / OPS-B02 — conséquences de la maintenance

Les deux lignes sont **P1**, cellules `Opérations!A58:L59` du classeur
`production/clan-ship-20261104/clan-ship-operations-20261105.xlsx`. Les cellules
et le document §12 sont épinglés dans [source-criteria.json](source-criteria.json).

Les puzzles physiques, les isolateurs, la mesure de pression, R-2, les deux
circuits et leurs journaux existaient avant ce lot. Cette évolution ajoute :

- **B01 :** une réplique de confiance de Garde du Seuil, après la fermeture
  réellement consignée. Elle se lit auprès du garde disponible à son poste,
  avec son contact sélectionné. Le contexte B05 reste prioritaire et la preuve
  de fermeture est ajoutée aux faits, sans nouvelle récompense.
- **B02 :** un diagnostic de deux ordres successifs, après contrôle final du
  relais et pendant une vraie interception à la table du conseil. Les trois
  alternatives proviennent du réducteur tactique existant, avec les réactions,
  l'énergie, les rôles d'équipage et la limite de tours réels. Le joueur donne
  uniquement le premier ordre ; la seconde action reste à confirmer après
  sauvegarde et nouvelle lecture du tour. Aucun scan, rôle ou bonus statistique
  n'est accordé par la réparation.

Le lecteur `clanShipMaintenanceDiagnostics.ts` refuse un propriétaire étranger,
un journal invalide/futur, une réparation incomplète, une autre salle, un autre
contrat ou un état tactique devenu périmé. L'ordre des clés JSON n'invalide pas
une campagne valide. Lire le diagnostic ou la réplique n'écrit aucun état.

## Contrôles

La suite `tests/clan-ship-maintenance-diagnostics.test.mjs` vérifie les effets,
la reprise, les cas de refus, le retour export/import et le rendu SSR. Elle ne
certifie pas des clics navigateur. Le dossier `domain/` conserve les TAP réels
de cette suite et des trois suites de régression incident/dialogue/espace.

La recette `scripts/qa-clan-ship-maintenance-20261109.mjs` a été exécutée sur le
vrai Next/GameClient intégré, build `mdrvYovYvfvhuJqeZXn1D`, port 3154.
Le [reçu final](native-attempt-5/final-receipt.json) qualifie six contrôles,
18 interventions acquittées, leurs 18 retours Échap et trois fermetures de
lecture sans changement de sauvegarde. Elle part d'une ancienne campagne adulte
avec les prérequis explicitement déclarés, sans aucun incident commencé ; les
deux puzzles, leurs erreurs/reprises, l'entretien du garde et le premier ordre
d'interception ont été réellement joués.

Les sept PNG originaux ont été ouverts individuellement : indices B01 et
réplique lisibles en 1440 px, circuits 1/2 puis 2/2 en 390 px, diagnostic en
390/320 px et diagnostic repris après un seul ordre. Les trois alternatives
restent défilables verticalement ; les captures ne prétendent pas toutes les
faire tenir simultanément dans un écran mobile. Les 2 027 positions observées
couvrent les sept salles et sont collectées avant les rechargements.

Le focus revient dans le dossier seulement après la nouvelle révision durable
correspondant à l'action. Le retour clavier des opérations est également exercé
après un clic natif sur leur titre. Le
[probe complémentaire](ops-escape-probe-final/report.json) confirme le retour
depuis un contrôle, le titre et le fond de fenêtre laissant le focus sur `body`.
Ce probe utilise une B01 préparée et ne compte pas comme un incident joué de plus.
Les anciennes tentatives et le défaut observé avant correction restent datés.

Les 92 réponses JavaScript, correspondant à 23 fichiers distincts, concordent
avec les fichiers du build ; les onze sources ciblées et le BUILD_ID restent
identiques avant/après. Aucun contrôle des octets CSS n'est attribué à cette
recette. La sauvegarde finale est réimportée par le vrai lecteur : B01 révision
8, B02 révision 18, 55 marques en tout, R-2 conservé et interception au tour 1.
Le rang et la progression des missions restent inchangés ; aucun second ordre
n'est rejoué après chargement.

```bash
CLAN_MAINTENANCE_QA_URL=http://127.0.0.1:3154 \
CLAN_MAINTENANCE_QA_OUTPUT=production/clan-war-command-20261109/qa/clan-ship-incidents/native-attempt-N \
node scripts/qa-clan-ship-maintenance-20261109.mjs
```

La recette refuse de réécrire un dossier déjà exécuté. Choisir un nouveau
suffixe pour une nouvelle tentative et conserver les précédentes.

La variante future d'extraction B01, l'équilibrage des gratifications, la revue
artistique humaine et l'essai de manette physique restent distincts. Ce lot ne
les déclare pas terminés et ne réécrit pas les attestations historiques.
