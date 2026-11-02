# Preserve V6 — R8 combiné B2

Recette réelle du build Next de production `OzWVxNAbS8mWbL_Pue9Zg`, servi sur `http://127.0.0.1:3108`, pour le commit `719fe0d77e65be5349b76f507938309f56a67619`. B2 contient le nettoyage du texte joueur ; B1 reste une preuve diagnostique distincte et inchangée.

32 contrôles sur 32 passent : quatre entrées saines V6, clavier et pause réels, HUD et carnets objectifs, danger physique, refus de quota et reprise, carnet mobile, rechargement et retour par marche/extraction, annulation V4 préservant les octets, protection V7 et entrée de campagne adulte. Les 77 chemins de texture ont chacun une vraie réponse image HTTP 200 ; les revalidations restent 200/304. Aucun échec navigateur, console ou HTTP.

Le pilote observe passivement 92 appels `drawImage` réels du rendu compilé (23 couverts par monde), vérifie les proportions et l’ancrage uniforme, puis restaure les observateurs dans les 8 contextes. Les 1 099 entrées source/actifs du pilote sont identiques avant et après, de même que HEAD et le BuildID attendu dans les 8 réponses HTML. Le pilote gelé n’a pas été modifié.

Les 15 captures ont été ouvertes et relues. Les footers visibles sont nettoyés des détails de développement et conservent l’absence de récompenses de campagne. Les captures de carnet mobile sont identiques parce que les six postes tiennent ensemble ; il s’agit de 15 fichiers pour 14 contenus d’image distincts. Les autres branches de footer (3/4/8 secteurs), le titre de sauvegarde incompatible et les commandes repliées ne sont pas revendiqués comme vérifiés visuellement ici.

La fixture de géométrie déclare 24 adultes déjà au sol et sert aux dangers, au stockage et à l’extraction ; elle ne prouve pas de victoire au combat. Aucun bilan gagné n’est injecté. Cette recette ne mesure ni victoire complète, ni durée 20–35 minutes, ni performance globale, ni validation artistique/canonique exhaustive.

Commande exacte (Node 22, Chromium système, exécution locale autorisée) :

```sh
env YAUTJA_QA_BASE_URL=http://127.0.0.1:3108 YAUTJA_QA_RUNTIME_COMMIT=719fe0d77e65be5349b76f507938309f56a67619 YAUTJA_QA_BUILD_ID=OzWVxNAbS8mWbL_Pue9Zg YAUTJA_PRESERVE_V6_OUTPUT=docs/qa/preserve-v6-r8-combined-20261102/b2 CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium /workspace/.cloud-tools/node22/node_modules/node/bin/node scripts/qa-preserve-grand-hunts-v6.mjs > /tmp/preserve-r8-b2-20261102.log 2>&1
```

`report.json` est le rapport brut inchangé. `execution.log` est la copie exacte du journal `/tmp`. `validation.json` contrôle les métadonnées, octets et SHA des captures. `visual-review.json` consigne la revue réelle des 15 captures. `INDEX.json` inventorie chaque pièce de ce dossier, sauf lui-même.
