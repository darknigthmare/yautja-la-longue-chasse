# P0 — quatre chasses de clan réellement jouées

**OPS-F18 et OPS-F19 sont qualifiées sur leurs quatre contrats**, avec le vrai
GameClient Next, build `RYl37_8hN58IOB8jDpRj1`.
Le [reçu consolidé](final-receipt.json) lie chaque rapport brut inchangé, fixture,
sauvegarde initiale, nouveau reçu et inspection des captures.

| Contrat | Score natif | Scans natifs | Tentatives cible | Complétions cible |
| --- | ---: | ---: | --- | --- |
| `field-jungle-survey` | 93 | 4 | 0 → 1 | 0 → 1 |
| `field-ice-route` | 97 | 7 | 0 → 1 | 0 → 1 |
| `field-bad-blood` | 87 | 6 | 0 → 1 | 0 → 1 |
| `field-ruins-memory` | 95 | 5 | 0 → 1 | 0 → 1 |

Chaque cas commence avec **zéro tentative, zéro complétion et aucun reçu du
contrat testé**. Le joueur accepte son contrat au conseil, marche au hangar,
regagne son vaisseau, désamarre puis utilise le vrai briefing « Contrat du clan ».
La cinématique d’arrivée est passée par son bouton natif. Le pilote effectue
ensuite la chasse par les commandes clavier/souris : scans, affrontements,
Apex, rite du trophée et extraction. Le propriétaire GameClient produit la
progression et le nouveau reçu, lié au bon `missionEncounterRun` 0.

Les prérequis historiques des autres missions sont des **hypothèses initiales
déclarées**, préparées avec les reducers de production et validées par l’import.
Ils n’accordent pas le résultat de la cible : ses compteurs et son reçu restent
absents au départ. Vey ne prépare aucune ancienne chasse; glace en prépare une,
Bad Blood deux et les ruines sept. Le dernier écran de chronique s’affiche donc
après le Gardien sous cette hypothèse initiale : **cette passe a joué quatre
chasses, pas les huit chasses consécutives d’une campagne depuis zéro**.

L’observation utilise CDP pour lire les `[[Scopes]]` d’une fonction de pause
retenue dans un hook React, puis copie uniquement le véritable état en JSON.
Aucun callback du jeu n’est invoqué et aucune référence, santé, position,
géométrie, horloge, victoire ou récompense n’est écrite par l’observateur.
La politique de commandes existante produit uniquement des événements natifs.
Les [sources exécutées](recipe-source/manifest.json) sont archivées avec leurs
empreintes; Vey conserve aussi la version initiale exacte de sa recette.

Les trois dernières recettes comparent directement les sources et le build
avant/après, ainsi que leurs 27 scripts Next servis respectifs aux octets
construits. Le premier Vey utilise une comparaison externe explicitée : le
snapshot natif pris avant cette chasse est identique aux 1 268 fichiers de
source et 275 fichiers de build contrôlés après elle. Ses sources exécutées
initiales ont été conservées avant l’ajout du nouveau dispositif de mesure.

Les quatre sauvegardes finales ont aussi passé une nouvelle lecture par les
fonctions réelles d’import, d’inspection et de concordance de campagne; le
[contrôle dédié](save-reinspection.json) confirme un seul reçu cible par profil.

Les rapports ne signalent aucune erreur console, HTTP ou de requête. Douze
captures originales ont été ouvertes : départ, Apex vaincu/trophée et résultat
pour chaque cas. Les autres captures restent disponibles sans prétendre avoir
toutes fait l’objet d’une inspection. Aucune validation artistique humaine,
manette physique, écoute du mixage ou mesure de performance n’en est déduite.

Pour rejouer un cas dans une nouvelle sortie, avec le serveur final déjà lancé :

```sh
CLAN_FIELD_QA_URL=http://127.0.0.1:3122 \
CLAN_FIELD_CONTRACTS=field-ice-route \
CLAN_FIELD_QA_OUTPUT=outputs/clan-field-new-ice \
CLAN_FIELD_BUDGET_SECONDS=1800 \
/workspace/.cloud-tools/node22/node_modules/node/bin/node \
  scripts/qa-clan-ship-field-p0p1-20261109.mjs
```

Les quatre identifiants du tableau sont acceptés, un seul par profil isolé.
La sortie doit être neuve : `recipe-run.lock` interdit l’écrasement d’une preuve.
