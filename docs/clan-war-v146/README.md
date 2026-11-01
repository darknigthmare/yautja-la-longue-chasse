# V146 — Conseil des clans : preuves de fin de mission unifiées

**Base : [PR #59 V145](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/59).** Les quatre game modes ont maintenant un **format commun de dossier d'opération**. L'objectif n'est pas de prétendre la campagne V85 terminée, mais de créer une **frontière vérifiable entre entraînement libre et progression stratégique réelle**.

## Les quatre modes

| Mode | Données effectivement récupérées | Preuves délibérément NON inventées |
|---|---|---|
| Assaut latéral | Rapport V115 clos, résultat, équipes V6, unité de chaque équipe, blessés réellement consignés, identité du site source | Trajectoires détaillées de chaque projectile et certification de la bataille 1:1 non archivées |
| Outer Ops | Mandat V115 clos, résultat, spécialité recon/escort/intercept, équipes identifiables, journal réellement enregistré | Pas de route complète inventée après la résolution si le reçu ne contient plus tous les passages ; pas d'arrivée prématurée |
| Infiltration / sabotage | Retour du chasseur, issue, équipe, blessés, rapport V6, provenance du secteur | Coordonnées des deux gardes et preuve télémétrique du relais non conservées, aucune prétention de niveau 1:1 |
| RTS multi-escouades | Reçu W133 sourcé : **mission, carte, planète, équipes, unités, blessés, trois objectifs, RAV restants, escorte et évacuation** | Aucune annexion V85, aucune vérité cinématographique ajoutée, aucun événement externe inventé |

## Contrat de sécurité des preuves

Le moteur `app/game/systems/clanWarCouncilAuditV146.ts` :

- n'importe que des missions **closes**, jamais une prévision de victoire ou un groupe encore en route ;
- vérifie la source `rules.metadata.sha256` et la validité des archives V115 via `readWarOperationsV115` ;
- vérifie côté W133 l'identité du scénario, de la carte, de la planète, la date du tour, les RAV restants, les IDs de groupes, blessures, évacuations, preuves et cases source **à l'identique** ;
- produit une liste explicite des **preuves manquantes**, distingue `source-checked` de `partial-evidence` ;
- fixe de façon immuable `campaignMutation:false` et `readyForCampaign:false` pour tous les dossiers. Aucun appel au moteur V85 ni transfert de conquête.

Les deux interfaces React possèdent un volet Conseil des clans ouvrable après mission, montrant faits confirmés et lacunes. Il s'agit de **dossiers de source et non d'autorisation de promotion V85**.

## QA et production

`tests/clan-war-council-v146.test.mjs` teste les quatre types de reçus V115, le résultat autonome RTS, les sources falsifiées, les doublons, les objectifs inventés, les cartes et RAV altérés et l'absence de mutation. La CI `.github/workflows/clan-war-v146.yml` reprend les **régressions de V115 à V145**, TypeScript et ESLint.

Le classeur `docs/clan-war-v146/Yautja_Guerres_Clans_Avenants_V144_V146_2026-11-01.xlsx` conserve le suivi existant V144/V145 sans prétendre inclure les anciens **73 onglets V143**, qui restent dans [PR #53](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/53). Les fiches des **1 200 variantes CW120** ne sont pas des missions finies.

**À réaliser après V146 :** preuves physiques par tour et voie / sauvegarde de campagne V85 / tests navigateur, mobile et manette / multijoueur serveur / scènes et assets films/comics/PHG vérifiés 1:1 / contrôle complet de cohérence des planètes. La chasse principale reste de type Dynasty-Warriors-like, les quatre modes sont additionnels.
