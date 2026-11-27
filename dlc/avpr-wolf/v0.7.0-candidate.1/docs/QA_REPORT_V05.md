# QA — AVP:R WOLF v0.5.0-candidate.1

## Résultat

**Candidate jouable validée par tests structurels et simulations VM.**

| Contrôle | Résultat |
|---|---|
| Structure data / transitions | OK |
| 47 zones / 14 chapitres / 8 armes | OK |
| 2 nœuds Unrated et skip cinéma | OK |
| 5 sprite-sheets requises | OK |
| Standalone sans dépendance distante | OK |
| Runtime smoke | OK |
| Tests ciblés | 34/34 |
| Route Cinéma automatisée | 45/45 zones, 16/16 preuves, sync 45/45 |
| Route Unrated automatisée | 47/47 zones, 16/16 preuves, sync 47/47 |
| Installation x2 | 1 bloc / 1 bouton |
| Désinstallation | propre |

Les sorties brutes sont conservées dans `docs/qa/`.

## Tests v0.5 nouvellement couverts

- Parade : annulation du dégât, stun de l'attaquant et compteur.
- Esquive : coût énergie, invulnérabilité et compteur.
- Mort xénomorphe : création d'une mare acide.
- Mare acide : dégâts au sol et statistique de contact.
- Pounce : capacité à toucher Wolf.
- Tracking pulse hors objectif de scan.
- Migration `tantalus.avpr.wolf.v04` vers `v05`.
- Duel : gauntlet damage, gear shed, mask removal, final grapple et drapeau de blessure caudale.

## Limite navigateur

Une nouvelle tentative Chromium headless a été exécutée avec `--no-sandbox`, `--disable-gpu`, `--disable-dev-shm-usage` et un timeout de 25 secondes. Le processus reste bloqué et finit en timeout avec erreurs DBus/zygote. Par conséquent, aucune image v0.5 n'est étiquetée « capture Chromium ». Les cinq scènes v0.5 sont des prévisualisations statiques et les anciennes captures v0.3 restent seulement comme historique.
