# Réconciliation Outer Ops : marche forcée de #57 et détour de #61

La branche #57 `f25cd7a33e04f789e7c6df231ccad9116a50b38c` implémente la
ligne `CW144-OUT-001`, mais #61 hérite d'une branche parallèle qui ne la contient
pas. Ce changement réintroduit le coût de 3 RAV, le délai réduit de 8 secondes
et le risque +2, tout en conservant le détour et les pauses de #61. Les deux
classes de manoeuvre sont exclusives. Le gain ne résout jamais le mandat avant
son échéance.

La fraction parcourue est continue à l'ordre : l'accélération s'applique au
temps restant seulement. Le rappel conserve les durées du contrat historique
V115. Le bulletin terrain d'une mission accélérée attend la moitié réellement
parcourue. Aucun changement aux cartes de campagne ou aux équipes V85.

Deux archives sous `tests/fixtures/outer-pace-pr57` ont été produites par les
commandes du moteur original #57, avec et sans rappel. Ce ne sont pas des
sauvegardes historiques de joueurs. Le test vérifie leur empreinte et leur
rechargement ; les fichiers aux formes incompatibles sont refusés.

`docs/clan-war-v146/Yautja_OuterOps_Reconciliation_V144_V146.xlsx` est un
avenant séparé : les deux classeurs originaux et leurs statuts ne sont pas
écrasés. Les tests moteur et la fixture Chromium ciblent ce lot ; le réseau,
les autres appareils, la campagne complète, le serveur Next de production et
la certification visuelle 1:1 restent ouverts. Les valeurs 3 RAV, 8 secondes et
+2 sont des règles de ce jeu, pas des valeurs canoniques de la franchise.
