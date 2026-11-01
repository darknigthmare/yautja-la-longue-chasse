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

## Actions rapides et minuterie d'assaut

Un second ordre ou reset confirmé pouvait être ignoré sans retour pendant une
écriture en cours dans le même onglet. Un message demande désormais de réessayer,
sans mettre en file un instantané périmé. Le test Chromium local retient le
verrou, déclenche deux lancements et un reset confirmé, vérifie le message et
l'unique mandat. Un autre test retient le verrou depuis le second onglet pendant
plusieurs ticks d'un véritable assaut, puis observe la reprise du tick après
libération et la préservation de la sentinelle de campagne. 14 scénarios locaux
passent au total. Un mandat et un recrutement réels arrivant à échéance ensemble
ont aussi été réglés tous deux : le test avance Date.now sans modifier les
enregistrements. La minuterie RTS, les soins simultanés, les anciens clients et
le cloud restent à vérifier séparément.

## V149 — Minuterie RTS réelle sous verrou inter-onglets (1er novembre 2026)

Le banc `scripts/qa-clan-war-v115-multitab-v148.mjs` ouvre désormais une
bataille RTS V115 réellement jouable en temps réel. Dans le second onglet, un
Web Lock exclusif est maintenu pendant plusieurs ticks ; le test vérifie que le
compteur de simulation RTS ne progresse pas pendant cette contention. Il
relâche ensuite le verrou et contrôle que les tours reprennent à partir du même
état sauvegardé, sans toucher à la sentinelle de campagne.

**Preuve reproductible :** [CI GitHub Actions 41318722592](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41318722592)
— **15 contrôles Chromium réussis**, six tests Node réussis, deux fichiers
XLSX V148/V149 structurellement validés. Le nouveau test n'a pas neutralisé
les ennemis, les cartes, les règles PC/RAV ou les écritures de campagne.

**Limites :** la preuve porte sur deux onglets coopérants d'un même navigateur.
Elle ne garantit pas les clients anciens sans Web Locks, les appareils différents,
la synchronisation cloud, une partie multijoueur autoritaire, l'exécution
ininterrompue lorsque le navigateur suspend l'onglet, ni la fidélité visuelle
1:1 du bracelet et des espèces Yautja. Les soins arrivant à échéance ensemble
restent un scénario distinct à couvrir.
