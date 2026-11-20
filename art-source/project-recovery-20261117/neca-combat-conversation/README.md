# Sprites NECA / The PIT — sauvegarde de la conversation

Import du 17 novembre 2026 dans la PR #146. 49 PNG distincts, 123 292 075 octets. Les images sont conservees sans conversion, recadrage ou regeneration pendant cet import.

| Dossier | Nombre | Statut |
| --- | ---: | --- |
| 01_PREMIER_LOT_RECUPERE | 9 | Originaux recuperes du premier lot; correspondance SHA-256 verifiee localement avec le releve historique. |
| 04_REGENERATIONS_NON_VALIDEES | 10 | Dernieres images generees dans la conversation; identites demandees, fidelite non validee. |
| 02_VARIANTES_NON_VALIDEES | 29 | Variantes refusees/non validees, sauvegardees separement; ne pas utiliser comme reproductions NECA. |
| 03_PLANCHE_NON_CONFORME | 1 | Ancienne planche de roster, archive historique, pas des sprites individuels. |

Les 52 originaux manquants du premier lot de 61 ne sont pas declares recuperes. Les dix regenerations ne sont pas ces originaux. Aucun personnage supplementaire n'a ete genere pendant cet import.

## Usage
Ouvrir INDEX.html pour la galerie locale. INVENTAIRE.json contient tailles, SHA-256 et empreintes Git; SHA256SUMS.txt permet `sha256sum -c SHA256SUMS.txt` depuis ce dossier. Le sous-dossier sources conserve l'inventaire historique sans le reecrire.

## Limites
Sauvegarde de sources uniquement: aucun remplacement de sprite dans le moteur, aucune activation automatique, aucune certification de fidelite artistique 1:1. Les noms des dix regenerations reprennent les personnages demandes dans la conversation, sans affirmer que le dessin les reproduit correctement.
