# Validation froide du job application V113 R8

PASS sur un vrai clone réseau privé partiel du commit publié `837684333b42ee1a5e3a0be9ce1967e2486a2fd3`, sans objets Git alternatifs ni copie des assets du dépôt partagé. Les 564 motifs sparse correspondent exactement au job application de ce commit. Le checkout a matérialisé 6309 fichiers (2 571 512 571 octets) et 2 109 558 677 octets de packs sélectionnés en environ 146 secondes. Aucun historique complet n’a été téléchargé.

Le commit runtime B2 `719fe0d77e65be5349b76f507938309f56a67619` était réellement absent, avant et après le checkout, avec le lazy-fetch désactivé pour ces probes. Le bootstrap CI corrigé candidat, conservé dans [executed-bootstrap.mjs](executed-bootstrap.mjs), l’a récupéré explicitement par URL GitHub canonique avec `--no-tags --filter=blob:none --depth=1`. Il ajoute environ 50 Kio de pack et garde HEAD inchangé. Ce bootstrap candidat n’est pas encore dans le YAML du commit publié 83768433 : il est testé sur ce checkout froid ; aucun run CI hébergé n’est revendiqué.

Sous Node 22.23.4, le gel complet de 1964 entrées passe avec SHA256 `f39b5089fc130a726b87a6120470dacb3c3ef41098582a7203844620ce57f164`. Le test inchangé `homeworld-current-production-v113.test.mjs` passe : deux vrais rapports V113, deux bruts gzip, 78 PNG (39 Homeworld et 39 Pit), identités HTML et correspondance des octets locaux avec les IDs de blobs du tree Git B2. Il ne prétend pas télécharger séparément chaque ancien objet blob.

Seul `node_modules` est lié au dépôt partagé, après vérification byte-identique de `package.json` et `package-lock.json` ; cette réutilisation est consignée. Aucun nouvel install, build, navigateur, capture ou ouverture d’image n’a été exécuté pendant cette validation froide. Le checkout reste propre.

[Résumé détaillé](cold-summary.json), [résultats des commandes](verification-result.json), [réutilisation des dépendances](dependency-reuse.json), [revue indépendante de portée](test-scope-review.md). L’archive contient exclusivement les notes, logs, le bootstrap exact et les motifs sparse ; aucun clone, pack, dépendance ou script opérationnel Python.
