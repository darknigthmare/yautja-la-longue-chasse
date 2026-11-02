# Capsule exacte de publication R7

La capsule reproduit la publication `03cf51badd450338d748da55599a317a71debd28` et son arbre `8955aa3ae57f3c1c5151fc6e2980d083bbcd0aaa`, avec le runtime `bda14a95aa8c9e6cf37039e2d67ea1544a8e8de1` et le build `wVuSG_xIKNn3geLlIq7Cb`. Elle ne certifie pas l'application courante.

Le [journal final complet](final-tests.log) montre **5/5 nouveaux tests réussis**, sans échec ou test ignoré, en78,696s. Ils exécutent le fichier original complet de **9 assertions inchangées**, puis les **3 CLI originales** : gel, inventaire public et classeur. Le gel conserve son SHA256 `c35f8b…` et le classeur R7 ses9 433700octets/SHA256 `723cc8…`. Les mutations de source, métadonnées, HEAD, labels/contexte et une substitution du dossier historique par un lien sont refusées. Le lint passe sans désactivation de règle.

Les1894 fichiers de publication nécessitent **une fixture supplémentaire**, le vrai rapport `docs/v111-homeworld-validation.json` lu par l'assertion négative originale nº4. Le premier rejeu a révélé cette absence ; le diagnostic initial est conservé. Son blob réel de03cf est désormais épinglé, sans changer l'assertion. La capsule contient donc **1895 fichiers réguliers privés**, couvrant1891 entrées de publication et1649 entrées gelées. Le manifeste comprimé ne mesure que153325octets ; aucun PNG n'est dupliqué dans Git.

La copie réutilise un fichier courant seulement après égalité de taille, SHA256 et identité de blob. Sinon, elle restaure les vrais octets Git épinglés. Le test de portabilité part d'un Git source sans les objets historiques et charge réellement les deux commits nommés depuis l'origine canonique dans le seul Git temporaire privé : HEAD et refs du dépôt source restent inchangés. Aucun accès réseau à un site de licences ni archive hors ligne fictive n'est revendiqué.

Les19 sources chasse validées et leur dossier QA restent inchangés. Aucun document/classeur R7, gel, certificat, workflow ou test de publication existant n'a été modifié. Les valeurs `currentRuntimeCovered:false`, `runtimeBrowserEvidenceReexecuted:false` et `nativeExcelExecuted:false` restent explicites. Root peut maintenant brancher ce contrôleur historique en conservant les tests et les futures preuves V113 sur le runtime courant.

Commande de reproduction :

```sh
node --experimental-strip-types --test --test-concurrency=1 tests/r7-publication-history-v113.test.mjs
```

Le [rapport machine](verification.json) conserve les empreintes des trois nouveaux fichiers, les résultats des CLI et les limites exactes.
