# V149 — Écritures locales V115 entre onglets

Le panneau V115 possède deux chemins d'écriture : les opérations, y compris les
minuteries, passent par `commit`, et le reset explicite possède son propre chemin.
Les deux utilisent le même Web Lock exclusif ; les octets observés sont comparés
à nouveau pendant sa détention. Le reset demande toujours confirmation avant le
verrou. Un verrou occupé refuse l'action et demande de réessayer ; l'absence de
Web Locks place l'archive persistante en lecture seule. Les exercices non
persistants restent disponibles. Aucun champ de campagne V85 n'est modifié.

Sur Chromium local, `AUDIT_CHROME_EXECUTABLE=/usr/bin/chromium node
scripts/qa-clan-war-v115-multitab-v148.mjs` a contrôlé 11 scénarios : verrou
retenu contre ordre et reset, deux panneaux déclenchant un mandat, refus sans
Web Locks, reset périmé, rechargement et sentinelle de campagne. La CI de PR
reste à confirmer. Les essais traitent deux onglets coopérants du même navigateur
avec les vrais panneaux ; ils ne garantissent ni les écritures d'un ancien onglet
sans verrou, ni d'un script tiers, ni la synchronisation entre appareils ou le
cloud. Les minuteries passent par `commit`, mais leur concurrence réelle reste à
tester.

L'annexe `Yautja_ClanWar_V149_Verrou_Local.xlsx` préserve les cinq feuilles
historiques V148 et ajoute une feuille V149. Les résultats y sont marqués tests
locaux, les autres travaux restent ouverts. Aucun gauntlet n'est validé 1:1.
