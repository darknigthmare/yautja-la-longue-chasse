# Vérification CI — /dev et Wolf

Révision examinée : `1137faaf80051b37fa2205af73414bed099024a9` de la PR #112. Les deux jobs ont terminé avec `success`. Les archives ont été téléchargées depuis leurs artefacts GitHub et leur SHA-256 complet correspond au digest annoncé par GitHub.

| Élément | /dev | Wolf et arrivée planétaire |
| --- | --- | --- |
| Run | [41972172707](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41972172707) | [41972172611](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41972172611) |
| Job | `127062713220` — travel | `127062712793` — castle-arrival |
| Source et checkout | Révision exacte confirmée par le rapport et le journal de checkout | Révision exacte confirmée par les deux champs du rapport et le journal de checkout |
| Arbre source modifié | `workingTreeDirty: false` | `workingTreeDirty: false` |
| Contrôles navigateur | **20/20 réussis** | **32/32 réussis** |
| Tests Node du job | **72/72**, aucun échec ni saut | **284/284**, aucun échec ni saut |
| Erreurs JavaScript non interceptées | 0 | 0 |
| Erreurs console enregistrées | 0 | Collection non instrumentée par cette recette |
| Ressources demandées / manquantes | 382 / **0** | 185 / **0** |
| Captures livrées | 13 | 27 |
| Exécution | Vraie route Next `/dev`, serveur de production, Chromium avec affichage | Vrai GameClient via Vite, Chromium avec affichage |

## Preuve /dev pour Q21

Les 20 contrôles couvrent le catalogue direct, les filtres, le clavier et le tactile, les déplacements et resets, les sept salles réelles du Clan Ship, ses transitions d'approche et d'embarquement, le Homeworld, une destination régionale, les neuf arrivées Wolf et huit entrées d'arrivée planétaire. Les deux transferts d'arrivée observés — passage manuel et séquence naturelle complète de huit plans — montent chacun une seule vraie chasse.

Le rapport ne constate aucune écriture de stockage ni ouverture de base de données. Sur les 50 vérifications de stockage, 49 conservent exactement l'empreinte des cinq clés protégées ; la dernière utilise volontairement un navigateur vide et constate zéro clé après reset et retour. Le second hash correspond donc au contexte vide prévu par la recette.

Les 20 hashes des fichiers sources du rapport correspondent aux fichiers locaux examinés. Les hashes des 13 captures correspondent à leurs octets téléchargés. Les sept salles du Clan Ship sont présentes, avec zéro ressource indisponible.

## Preuve de non-régression Wolf

Les 32 contrôles couvrent navigation et reprise du château, audience et conseil, épreuve de cour, combat réel, changement d'onglet, pause/rechargement, défaite/recommencement, commandes à 320 pixels, progression du mandat, reprise du gardien, refus puis réessai de l'écriture de récompense et conservation d'un reçu unique. La seconde partie contrôle le gel du départ, la pause d'arrivée, la reprise après rechargement, un transfert refusé puis réessayé et une arrivée naturelle complète.

L'artefact Wolf porte le suffixe `008220ca7289d3e0bf9f62ee7bf47b4b5d17dc63`, car son nom est construit avec `github.sha`. Le workflow utilise séparément `github.event.pull_request.head.sha` pour le checkout et la source contrôlée. Le journal de checkout ainsi que `checkoutCommit` et `sourceCommit` dans le rapport prouvent tous la tête `1137faaf80051b37fa2205af73414bed099024a9`.

## Fichiers et portée

Les rapports bruts sont dans `dev-travel/report.json` et `wolf-arrival/report.json`, avec archives, captures, journaux de job et provenance des artefacts dans les mêmes dossiers. Le relevé structuré complet est `dev-wolf-verification.json`.

Ces résultats qualifient les scénarios de navigateur déclarés. Ils ne constituent pas une campagne entière, une qualification de performances ou une approbation visuelle complète. Aucun fichier de runtime ni document du projet n'a été modifié par cette vérification.
