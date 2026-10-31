# V144 — Compte rendu commun aux quatre modes de Guerres des clans

**PR empilée sur #53 (V143)**, qui dépend de #52, #51, #50 et des précédentes. La PR #42 des gauntlets n'est pas modifiée.

## Pourquoi ce lot

Les modes **assaut latéral**, **Outer Ops**, **infiltration/sabotage** et **RTS multi-escouades** ont désormais des fins de mission et des reçus différents. Pour relier leur gameplay à une future **campagne persistante V85** sans introduire de captures fictives, la V144 crée **un contrat de bilan commun, en lecture seule**, affiché directement dans les deux interfaces de jeu existantes.

| Mode | Source réellement lue | Preuves produites | Statut campagne |
|---|---|---|---|
| Assaut latéral | `WarMissionReportV115` réellement émis | ID du mandat, résultat, membres, blessés, territoire V6 et journal | **Aucune conquête** ; un territoire est candidat uniquement si son ID correspond exactement à un territoire V85 existant |
| Outer Ops | Rapport V115 uniquement **après échéance** | Ordre initial, résultat, équipe, blessures et phase de rapport | Aucun résultat anticipé ni mutation V85 avant liaison explicitement autorisée |
| Infiltration | Reçu V115 après extraction ou repli | Véritable sortie, secteur de mission, équipe et issue enregistrée | Pas de reconnaissance ou sabotage de campagne implicite |
| RTS W3 | `WarRtsSquadsReceiptV133` de la carte réellement jouée | Planète, carte, ID de mission, objectifs prouvés et unités neutralisées | **Jamais d'appariement territorial V85 automatique** : les cartes W3 multi-planètes n'ont pas d'équivalence implicite avec Korthas |

## Réalisation

- **Nouveau moteur** `app/game/systems/clanWarDebriefV144.ts` : `auditWarOperationsDebriefsV144`, `auditWarRtsDebriefV144`, `collectWarDebriefsV144`.
- Chaque bilan comprend `receiptKey` stable, `sourceSha`, `mode`, `missionId`, `outcome`, secteur ou carte physique, équipes et blessés, preuves et nombre d'objectifs.
- Les identifiants étrangers, doublons de reçus, missions falsifiées, sources SHA incorrectes et prétendues `campaignMutation:true` sont **rejetés**, et non convertis en succès.
- Les interfaces `ClanWarOperationsV115.tsx` et `ClanWarRtsSquadsV133.tsx` montrent un résumé de ces preuves. **Aucune écriture** vers la sauvegarde principale, aucun XP de campagne, garnison ou butin n'est injecté.
- `tests/clan-war-debrief-v144.test.mjs` et CI V144 exécutent de vrais retours d'assaut, Outer Ops, infiltration et RTS issus des moteurs déjà présents, en plus des régressions V115–V143, TypeScript et ESLint.

## Excel de production et manquants

Le suivi Excel **V143 complet de 73 onglets reste inchangé dans la PR #53**. Cette PR ajoute un **classeur compagnon V144** : quatre registres distincts par mode, les QA transverses, la table d'appariement V6→V85 et un tableau de bord formula-driven. Ce format est complémentaire à V143 : il ne remplace pas ni ne déclare livrés les **1 200 variantes design-only**, les **24 scénarios W3**, les **12 cartes** et **36 dossiers W5**.

Toujours **à produire** : le vrai connecteur d'écriture V85 (transactionnel et idempotent, validation d'identité/contrôle de territoire, serveur autoritaire), les 1 200 missions jouables, les scènes réellement fidèles aux films/comics/PHG en 1:1, le PvP/coop, les tests navigateur/mobile/manette et les performances.

**Fidélité :** ce contrat de bilan est une infrastructure originale du jeu. Il ne prétend pas établir de nouveaux événements ou des conséquences canoniques de la franchise Predator.
