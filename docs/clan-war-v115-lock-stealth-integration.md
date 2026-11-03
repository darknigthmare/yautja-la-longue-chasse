# Intégration des opérations V115 : verrou et migration d'infiltration

Cette branche combine le travail de la PR #67 (migration des deux formats de
patrouille) et celui de la PR #66 (verrou commun V115 entre onglets coopérants).
Le conflit de `ClanWarOperationsV115.tsx` conserve le catalogue de gantelets,
le verrouillage et le choix explicite de règle d'infiltration. Dans
`clanWarRtsScenariosV119.ts`, le garde de type de #42 rend le cast de #44 inutile.
Les branches parentes restent intactes et non fusionnées dans main.

Le test navigateur d'infiltration produit ses archives à partir des sources
épinglées de #57. Pendant qu'un second onglet détient le verrou, le choix de
règle doit être refusé avec un message et sans écriture ; après libération, le
joueur peut réessayer, enregistrer sa règle et recharger. Les autres essais
couvrent la migration d'un garde, le GameClient dans un banc Vite et les
écritures, minuteries et réinitialisations V115 des deux onglets.

Ces sauvegardes sont générées pour les tests, pas des archives historiques de
joueurs. Un ancien client qui n'utilise pas le verrou, un autre appareil ou le
cloud ne sont pas protégés par ce mécanisme. Les assets, la fidélité artistique
1:1 et la campagne complète restent à valider. Les classeurs antérieurs sont
conservés : aucune ligne n'est déclarée terminée par cette intégration.
