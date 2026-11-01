# V146 — Audit de provenance W3-K / CON-T et équipes pour les quatre modes de guerre de clans

**Branche :** `feat/v146-clan-war-provenance-audit-20261101`, sur **PR #58 (V145)**, elle-même sur #54 (V144) et la chaîne V143→V115. La **PR gauntlet #42 reste indépendante**.

## Changement concret

Les quatre modes **assaut latéral**, **Outer Ops**, **infiltration/sabotage** et **RTS libre V115** peuvent déjà remettre leurs rapports documentaires au journal V85 grâce à la V145. La V146 ajoute un **audit de correspondance et de traçabilité directement consultable dans l'écran stratégique Korthas**, après inspection volontaire de l'archive locale V115.

Ce code ne confond plus un **reçu d'exercice** et une **preuve de conquête**. Les deux mondes ont des catalogues source différents :

- Territoires V6 : identifiants `W3-Kxx`, nom, région, coordonnées de cellule W3, personnages `W115-TEAM-xx` et leurs membres V6.
- Stratégie V85 : territoires `CON-Txx` et combattants `RTS-Uxx`, avec leurs propres IDs et règles de garnison.
- Même un **ID, nom et région identiques** ne valent pas une preuve historique suffisante : le statut reste `same-id-needs-evidence`. Le **numéro correspondant** entre W3-K et CON-T ne crée **aucun lien**.
- Les reçus RTS des **cartes W3 V133** affichent des identifiants de planète/carte ; ils ne sont toujours **pas** convertis en territoires de Korthas.

### Nouveaux composants

`app/game/systems/clanWarSourceAuditV146.ts` :

- `auditWarTerritorySourcesV146` : tableaux de provenances, rapprochements par ID exact seulement **à vérifier**, sans autorisation militaire.
- `auditWarRosterSourcesV146` : inventaire distinct des équipes et membres V115 et combattants V85 ; détection d'ID identiques **sans autoriser un transfert de personnage**.
- `warSourceReceiptFingerprintV146` : empreinte déterministe d'un reçu (SHA source, type de mode, mission, cible, résultat, heure et liste d'équipes/blessés). **Non cryptographique** : c'est une aide à comparaison, pas une preuve d'authenticité serveur.
- `inspectWarSourcesV146` : réutilise la validation stricte des archives V115, les bilans V144 et le filtre documentaire V145 pour présenter, par mode, ce qui est encore importable ou déjà archivé, **sans écriture V85**.

`app/game/ClanWarPanelV85.tsx` : un volet **Audit V146** est ajouté au registre de preuves V145. Il fournit les volumes d'équipes, de lieux non appariés, le nombre de dossiers par mode et la liste des IDs sources. Le volet ne peut pas attribuer de territoire, gagner XP ou modifier les équipes V85.

### Tests et décisions encore manquantes

`tests/clan-war-provenance-v146.test.mjs` teste, avec les **véritables catalogues V6/V85**, l'impossibilité du mapping par suffixe, les collisions d'identité, l'analyse des quatre modes, les empreintes, l'idempotence des reçus V145 et le rejet d'archives/plans étrangers. CI : `.github/workflows/clan-war-v146.yml`, toutes les régressions V115–V145, TypeScript et ESLint.

**Aucun mapping géographique/roster n'a été inventé.** Pour ouvrir ensuite une conséquence militaire de campagne, il faudra des liens d'origine vérifiés, une identité d'acteur persistante et une transaction serveur autoritaire/idempotente ; la V146 ne prétend pas réaliser cela. Les **1 200 variantes V120** demeurent des dossiers design-only et non 1 200 niveaux terminés. Les travaux sur les décors/armes/PNJ en fidélité 1:1, la coop, le PvP et la QA réelle restent ouverts.

Le suivi **Excel V146** complète celui de la V145 et conserve les audits et tâches non finalisées, sans effacer le classeur V143 de 73 onglets, ni le complément V144.
