# PREY — La Chasse de 1719 · import du DLC V0.6.0

Cette PR conserve le dernier pack livré dans la conversation, sans l'activer dans le jeu principal. Les deux campagnes, le moteur autonome, les 20 SVG, les documents et les outils d'intégration historiques sont inclus.

## Organisation et intégrité

- `v0.6.0/` : **55 fichiers originaux inchangés**, dont `SHA256SUMS.txt`.
- `tools/rebuild.py` : reconstitue les deux doublons générés (`src/prey-content-v06.json` et `JOUER_PREY_DLC_V0_6_PORTABLE.html`) sans téléchargement ni dépendance tierce.
- `.generated/PREY_DLC_V0_6/` : **57 fichiers** après reconstruction, identiques octet par octet aux fichiers de l'archive d'origine. Ce dossier est ignoré par Git.
- `IMPORT_VERIFICATION.json` : périmètre, provenance et vérifications de cet import, distincts des rapports historiques.

Archive source : `Yautja_PREY_1719_DLC_v0.6.0.zip`, 158419 octets ; SHA-256 `2f07386d1b7ceb4954d1dc88d9a08140b6a9f14907dc5f7648162fb951b5349c`. Les métadonnées/compression du ZIP ne sont pas recréées : la garantie porte sur les **57 fichiers**. Aucun sprite bitmap ou son officiel supplémentaire n'est inventé dans cet import.

Les mentions `private-dlc` et `owner-local-only` des fichiers historiques désignent leur ancien mode de lancement : **ce dossier est maintenant suivi dans le dépôt GitHub public**. L'exclusion Vercel n'est pas une mesure de confidentialité du dépôt.

## Reconstruction depuis la racine du dépôt

Python 3.9+ est nécessaire ; aucune installation de paquet n'est requise. Sous Windows, remplacer `python3` par `py -3`.

```sh
python3 dlc/prey-2022/tools/rebuild.py --check
python3 dlc/prey-2022/tools/test_rebuild.py -v
python3 dlc/prey-2022/tools/rebuild.py
```

Le premier appel contrôle les 55 sources et reconstruit les deux sorties en mémoire. Le dernier écrit un **nouveau dossier** ; il refuse d'écraser un dossier existant. Pour un autre essai, choisir un emplacement neuf avec `--output /chemin/nouveau-dossier`.

## Limite importante du portable historique

Le contrôle de syntaxe effectué pendant l'import révèle une erreur réelle : le générateur historique utilise une chaîne de remplacement qui transforme `$$` en `$`. Le HTML portable contient alors deux déclarations `const $` et échoue avec `SyntaxError: Identifier '$' has already been declared`.

L'archive et ses empreintes sont conservées, **défaut compris**. Le précédent test `qa-portable-v06.mjs` vérifie l'incorporation des ressources, mais n'exécute pas ce JavaScript : son PASS historique n'est donc pas une preuve de jouabilité. Pour examiner le prototype, utiliser l'entrée **modulaire** (`JOUER_PREY_DLC_V0_6.html`), dont les scripts passent le contrôle de syntaxe. Aucune nouvelle validation navigateur interactive n'est revendiquée.

```sh
cd dlc/prey-2022/.generated/PREY_DLC_V0_6
node VERIFIER_PREY_V0_6.mjs .
node integration/prey-private-dev-server-v06.mjs
```

Le bridge historique écoute sur `http://127.0.0.1:4319`. Ouvrir explicitement `/JOUER_PREY_DLC_V0_6.html`, pas le portable. Le bridge ne lance ni build ni installation dans le jeu hôte.

## Validation reproductible et portée

Depuis le dossier reconstruit :

```sh
node docs/qa-static-v06.mjs
node docs/qa-v06.mjs
node docs/qa-portable-v06.mjs
node docs/qa-integration-v06.mjs
node VERIFIER_PREY_V0_6.mjs .
```

Les 37 chargements et terminaisons du harnais utilisent une API QA capable de forcer les étapes. Les 25 scénarios ciblés ne sont ni 37 parties jouées normalement, ni un audit artistique 1:1. L'intégration est testée sur un **dépôt factice**, pas sur le `main` actuel. Les rapports d'origine sont préservés ; consulter `IMPORT_VERIFICATION.json` pour leurs limites.

## Isolation du jeu hôte

Aucun fichier `app/`, sauvegarde, dépendance ou registre de campagne n'est modifié. Les seuls changements hors de ce dossier sont trois exclusions ciblées : TypeScript, ESLint et `.vercelignore`. Les composants archivés ne sont pas des composants activés dans l'application.

Les patchers `APPLIQUER_*` et l'installateur sont fournis **pour conservation**, sans exécution sur le dépôt actuel. Leur contrat hôte date du commit V65 `73c0f6e8fe5e0a1301c6aa9becb5a67f0fb34aa9`. Leur compatibilité actuelle, le retour au mausolée et la migration des sauvegardes hôtes ne sont pas certifiés. Une PR distincte doit traiter leur remise à niveau avant activation.

Aucune fusion ni commande de déploiement n'est incluse dans ces outils d'import.
