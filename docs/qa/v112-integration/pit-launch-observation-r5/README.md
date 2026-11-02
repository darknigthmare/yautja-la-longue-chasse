# Diagnostic du lancement Pit après l’échec R5

Portée : application compilée `f02e5f1002765d4f2a1ae1f0eaab1f358f61942a`, build `Oy38-xd57M5zeGgmvnJuy`. Cette copie exploratoire joue seulement Scar/Feral jusqu’à la projection initiale de J2. Elle est explicitement `PASS_DIAGNOSTIC_NOT_PUBLISHABLE`, domaine `PitDiagnostic`, `completeRecipe: false`. Elle ne remplace pas la tentative complète R5 échouée, archivée séparément.

La trace conserve avant, pendant et après chaque appui unique. J2 montre les frames `[411, 411, 412]` : la première avance de 17 ms ne publie aucun tick effectif ; les mêmes touches encore maintenues déclenchent ensuite TH_B. Aucun second appui ou état de combat n’est fabriqué. Cette observation justifie la correction du pilote ; elle ne démontre pas un défaut du produit.

Le brut original compressé, le gel de 1 601 entrées, les 13 PNG diagnostiques inchangés, le log et les quatre sources/logs réellement exécutés sont conservés avec leurs empreintes dans `entry.json`. Les scripts expérimentaux contiennent leurs imports absolus d’exécution et ne sont pas proposés comme commandes portables. Les PNG sont des candidats de diagnostic et ne constituent pas une nouvelle admission artistique.

L’intégration canonique utilise `scripts/lib/pit-observed-launch-v112.mjs`, importé par la recette complète. Elle maintient un seul appui jusqu’au startup réellement observé, puis libère toutes les touches dans `finally`. Elle refuse absence de progression, dépassement de huit frames effectives ou de 24 lectures, autre action, autre slot et frame régressive. Les assertions existantes de phases, dégâts, trajectoires, continuité et erreurs restent intactes.

`canonical-observer-22-tests.log` décrit 13 tests du nouveau helper et du véritable adaptateur extrait du pilote, ainsi que les neuf tests existants whiff/Worker. Cette vérification de modèle ne certifie pas une recette navigateur complète. Le nouveau gel, le nouveau build et les deux recettes complètes restent nécessaires.
