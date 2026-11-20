# Provenance historique des Enforcers

Le classeur [de reprise](../../YAUTJA_REPRISE_CHANTIERS_20261101.xlsx) classe la
famille Enforcers en P3 dans la feuille `OuvertsSource`, aux lignes 5, 27 et 28.
La ligne de famille couvre deux exigences.

| Exigence | Dernier état établi |
| --- | --- |
| `ENFORCERS-V610-TRACES` | 36 traces nominatives V6.10 conservées avec chemin, taille et SHA‑256. Aucun des 36 PNG originaux n’a été retrouvé dans les références Git examinées. |
| `ENFORCERS-V613-RECEIPTS` | 15 reçus concordent avec le PNG final sur 36. Parmi les 21 enregistrements du checkpoint, six concernent une sortie remplacée. Il manque toujours 21 reçus des sorties finales. |

Les [traces V6.10](../v611/data/prior-production-v610.json), le
[manifeste final V6.13](../v613/data/production-manifest.json) et son
[checkpoint](../v613/recovery/native-checkpoint.json) fournissent les identités
et les empreintes. La résolution s’appuie sur le merge historique
`d71e995ae886df69c4165a1a153291449e8f22f6` de la PR #10.

## Rapprocher des références Git

Depuis un dépôt disposant des objets historiques, exécuter le contrôle en
lecture seule. Le rapport JSON contient les références examinées, les
empreintes attendues et les identifiants encore en attente.

```sh
node scripts/audit-enforcer-historical-recovery.mjs \
  5417bafe9b2fe3ed064693d9e0f12d9d591217d3 \
  09c42b77932f05160b956f731e2087c71a15dfdc \
  6e2a5546bd75e95901235af8d503621d0bc2201d \
  2d1d006628e7e657cda66470ed06f5055f4919c5 \
  4ef1eb48e45278db4606d8ee9999647c62c80a21 \
  d71e995ae886df69c4165a1a153291449e8f22f6
```

Le contrôle inclut `HEAD` et compare chaque PNG éventuellement présent à son
chemin historique, à sa taille et à son empreinte. Pour un reçu V6.13, seul
l’essai accepté du checkpoint qui correspond aux octets finaux est retenu.
Un nouveau résultat concordant exige un rapprochement avec son archive de
production avant clôture. Les trois états sources du classeur restent ouverts.
