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

La recette `scripts/qa-clan-ship-maintenance-20261109.mjs` est prévue pour le
vrai Next/GameClient après construction du code intégré. Elle part d'une
ancienne campagne adulte avec les prérequis explicitement déclarés, sans
aucun incident commencé ; elle joue les incidents, l'entretien du garde,
l'acceptation de l'interception et le premier ordre du diagnostic. Son rapport
ne vaut preuve navigateur **que si son exécution effective réussit**. Les
captures restent à inspecter dans le reçu de cette exécution.

```bash
CLAN_MAINTENANCE_QA_URL=http://127.0.0.1:3123 \
CLAN_MAINTENANCE_QA_OUTPUT=production/clan-war-command-20261109/qa/clan-ship-incidents/native-attempt-1 \
node scripts/qa-clan-ship-maintenance-20261109.mjs
```

La recette refuse de réécrire un dossier déjà exécuté. Choisir un nouveau
suffixe pour une nouvelle tentative et conserver les précédentes.

La variante future d'extraction B01, l'équilibrage des gratifications, la revue
artistique humaine et l'essai de manette physique restent distincts. Ce lot ne
les déclare pas terminés et ne réécrit pas les attestations historiques.
