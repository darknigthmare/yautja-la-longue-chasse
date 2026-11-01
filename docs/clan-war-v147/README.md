# V147 — Réconciliation des quatre modes Guerre des clans

**PR de base : [#61 V146](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/61), toujours en draft.** Ce lot consolide les améliorations publiées séparément, sans modifier la **PR #42 gauntlet** ni importer son arbre de composants.

## Origines exactes

| Domaine | PR source | Compatibilité ou correctif |
|---|---|---|
| Assaut latéral | #59 / #61, correctif V147 | Le garde-protecteur n'absorbe jamais davantage que ses PV restants. Calcul déterministe par ID des acteurs même pour trois tirs simultanés, dégâts globaux conservés |
| Outer Ops | [#70](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/70), contrat déjà rapproché dans #71 | Marche forcée **3 RAV, échéance -8 secondes, risque +2**, sans résultat prématuré, compatible pauses V137/V143, détour V144 et rappel. Deux archives réelles de la branche #57 testées |
| Infiltration / sabotage | [#67](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/67) et [#72](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/72) | Choix explicite du déclenchement du second garde lors d'une reprise d'archive, migration de `secondGuard` vers `supportGuard`, dernier contact **temporaire, non omniscient** du premier garde ; leurre prioritaire. Contrôles des deux gardes sur le vrai terrain W3 |
| RTS multi-escouades | [#65](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/65) et [#68](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/68) | Reçus du Conseil V146 comparés à la définition de mission W3 reconstruite depuis les sources : objectifs, carte/planète, RAV, groupe laissé sur place, évacuations et escorte. Aucun progrès ou reçu inventé |

## Frontières non franchies

- **La chaîne d'UI gauntlet #42, de verrou multionglets #66/#69/#71 demeure dans ses PR propres** : cette PR sélectionne les correctifs mécaniques et ne mélange pas artificiellement 467 fichiers supplémentaires au code de la guerre de clans.
- **Aucun transfert automatique à V85** : dossiers de Conseil et simulations libres gardent `campaignMutation:false` et `readyForCampaign:false`.
- Les quatre modes sont secondaires au gameplay principal **Dynasty-Warriors-like** ; les AP, RAV, durée de détour et IA ne sont **pas** des capacités filmiques canoniques de Predator.
- **1 200 fiches de conception V120**, 24 scénarios RTS W3, 12 cartes, 36 dossiers W5 restent design/prototype selon leur statut ; pas 1 200 niveaux physiques complets.
- Le contexte W3/K ne doit jamais être déduit comme identique à un secteur CON-T V85 sans mapping source explicite ; les mondes extraterrestres ne peuvent pas héberger par erreur les villes de la Terre.
- QA réelle navigateur et manette, autorité réseau multijoueur, sauvegarde campagne V85 et assets fidèles aux œuvres **non homologués**.

## Vérifications

- CI ciblée `.github/workflows/clan-war-v147.yml` : tous les anciens tests V115–V146, nouveaux tests de conservation des dégâts V147, tests de #65/#68, #67/#72, #70 et vérification Excel binaire.
- `docs/clan-war-v147/Yautja_Guerres_Clans_Reconciliation_V147_2026-11-01.xlsx` : conservation du classeur V144–V146, plus fiches de réconciliation, tests QA, échanges inter-modes, matrice de dépendances et tableau de bord avec formules ; la provenance source est inscrite dans chaque ligne.
- Le **statut de CI doit être vérifié sur le dernier commit**, distinct de Vercel qui peut être bloqué par les limites de build.
