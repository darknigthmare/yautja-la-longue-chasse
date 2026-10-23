# Contexte historique V106 pendant V107

Le suivi V106 et ses 60 feuilles restent ceux du commit fusionné `92e7c824fd80d6b8152855b3d66560448f8c48c0`. Les nouvelles mécaniques ne doivent pas réécrire ses produits ni transformer ses recettes anciennes en preuves du runtime courant.

La capsule contient 842 sources privées, dont les 812 fichiers `app/` du gel V106 complet. Ses 185 fichiers partagés sont des produits publiés, preuves portables et images inchangées, tous vérifiés par SHA256 et taille avant puis après exécution. Les JSON publics importables sont privés afin de préserver les chemins enregistrés par esbuild. Les sources privées sont écrites en lecture seule et revérifiées après les collecteurs.

Le périmètre comprend les 963 entrées du gel, les 261 entrées réellement lues par le suivi, les fichiers observés avant/après les trois recettes de production, leurs preuves portables et les journaux d’intégration. Les deux PNG V44 des exclusions V11 sont inclus. Le lecteur n’utilise ni Git ni réseau ; le constructeur auteur lit uniquement le commit fixe avec Git. Il reste donc reproductible si les sources V107 changent pendant ou après la capture.

L’archive déterministe mesure 9 306 480 octets, pour 54 831 799 octets décompressés sous un budget de 80 Mio. Son SHA256 est `d32bffee06fed497b197fd3c8a905b9201dd601002f11e1c73af206833ac65ca` ; celui du manifeste est `5461c2282b2efc3306d53a802f47dd0c245e1bc1b8062c4efa6fa72b90776d3a`.

Seuls `excel-followup-v106.test.mjs` et `production-proofs-v106.test.mjs` optent pour ce contexte. Leurs assertions originales restent intactes : 40/52 raccords, 12 actions ouvertes, 60 feuilles, 49 feuilles précédentes préservées, règles source, caches de formules, gel et pièces portables. Les tests du jeu utilisent les modules courants. Les capsules V100/V104 et V105 restent inchangées.

```sh
node scripts/check-excel-history-v107.mjs --check
node scripts/check-excel-history-v107.mjs --check --release all
```

La première commande régénère les trois produits V106 dans le contexte privé et compare leurs octets. La seconde vérifie aussi V100/V104/V105 avec leurs commandes historiques d’origine. L’option auteur `python3 scripts/build-excel-history-snapshot-v107.py --check` compare la capsule au commit fixe lorsque l’historique Git est disponible ; elle n’est pas nécessaire en CI.
