# Backlog d’intégration native après v0.5

La v0.5 clôt la passerelle route/iframe et le protocole hôte v2, mais **pas** la fusion du moteur.

Priorités suivantes :

1. adaptateur HuntCanvas pour movement/lanes/collisions sans iframe ;
2. registre de sprites natifs Fugitive, Upgrade, humains et Predator Dogs ;
3. conversion des 183 micro-zones vers les structures de niveau du jeu hôte ;
4. transaction de sauvegarde DLC ↔ campagne avec rollback et version de schéma ;
5. reprise de checkpoint native après crash/rechargement ;
6. audio/FX natifs et mixage avec le bus principal ;
7. QA comparative standalone vs runtime natif avant d’activer `usesHostHuntCanvas`.

Tant que ces points ne sont pas validés, les deux drapeaux d’intégration profonde restent `false`.
