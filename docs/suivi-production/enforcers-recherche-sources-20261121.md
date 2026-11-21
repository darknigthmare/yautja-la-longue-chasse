# Recherche des sources historiques Enforcers

Le [tableau de recherche](enforcers-recherche-sources-20261121.tsv) rassemble les 57 pièces manquantes des deux exigences P3 du [suivi V112](../v112-open-workstreams-audit.md). Il s’ouvre dans Excel en texte UTF‑8 délimité par tabulations.

| Exigence | Pièce à retrouver | Référence pour le rapprochement |
| --- | --- | --- |
| `ENFORCERS-V610-TRACES` | 36 PNG originaux | Identifiant, feuille et ligne du classeur, chemin historique, taille et SHA-256 de chaque PNG. La date affichée provient de la trace du classeur. |
| `ENFORCERS-V613-RECEIPTS` | 21 reçus natifs des PNG finaux | Identifiant, ligne du classeur, taille et SHA-256 du PNG final et références Git de ses octets. Le reçu doit documenter cet exemplaire et contenir les paramètres effectivement soumis. |

Six identifiants V6.13 apparaissent aussi dans le checkpoint historique avec des octets différents de ceux du PNG final. Les colonnes « sortie ancienne » donnent le nom natif, la taille et l’empreinte de cette version distincte. La date de reçu est renseignée lorsque le checkpoint la donne. Les quinze autres reçus manquants ont leur PNG final vérifié et aucune sortie à rapprocher dans ce checkpoint.

Le générateur confronte les données du classeur V6.10, du manifeste V6.13, du checkpoint natif et du contrôle des PNG au commit `d71e995ae886df69c4165a1a153291449e8f22f6`. Le tableau consigne les pièces attendues et les références disponibles. Les deux exigences restent ouvertes.

```sh
node scripts/export-enforcer-recovery-worklist.mjs > docs/suivi-production/enforcers-recherche-sources-20261121.tsv
```
