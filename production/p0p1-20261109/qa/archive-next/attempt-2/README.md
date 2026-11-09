# Migration V115 — vrai GameClient Next final

**15 contrôles réussis** dans Chromium natif sur `http://127.0.0.1:3123`, build `lSBcQd-2LuUCPafGoIZvC`. Le parcours réel passe par Continuer → vaisseau/marche → Conseil → Poste&mandat → guerre → BibleV6 → **Opérations jouables·4modes**. Aucun import de règles privées ni ouverture du prototype V114 : la vraie persistance des règles V6 par défaut est vérifiée.

Le prérequis campagne B05 est une fixture déclarée. Les deux anciennes archives sont les chaînes exactes de `qa/archive/attempt-3/legacy-migration-native.json` : créées par le véritable UI+modèle39b601ce (deux sources historiques épinglées, dépendances partagées courantes). Cette recette les sème/rejoue ; elle n’exécute pas un ancien bundle complet dans Next. Le premier checkpoint a119RAV,serial1,missionW115-OPS-0001,tick1 ; la seconde branche ancienne a le même mandat/RAV au tick2.

L’origine commence sans clé canonique ni fence. L’écran legacy est en lecture seule et propose explicitement adoption/export. Un vrai téléchargement préserve les octets historiques. Le clic Adopter copie exactement le checkpoint dans `operations.fenced.v2`, confirme son intention dans IndexedDB, conserve l’ancienne clé et ne débite rien. L’export de récupération reste accessible après adoption.

Une seconde vraie page de même origine écrit la seconde ancienne chaîne dans `operations.free.v1` pendant qu’un vrai WebLock canonique est tenu. **Cette écriture externe est une fixture déclarée**, pas une nouvelle action d’ancien UI dans Next. Les octets/fence canoniques restent strictement inchangés. Le bouton tactique natif courant avance ensuite au tick2 sans nouveau débit. L’export télécharge bien la branche ancienne indépendante.

Après rechargement du jeu et reprise du même parcours natif, aucun écran de réadoption : les octets et la fence canoniques sont identiques. Un second ordre natif avance au tick3, toujours119RAV,serial1 et même mission ; aucune récompense ni rapport supplémentaire. La sauvegarde campagne brute est identique avant/après adoption, exports, ordres et retour physique après rechargement.

Trois vrais téléchargements et quatre captures ouvertes/inspectées. Les80 réponses JavaScript Next correspondent aux fichiers du build final ; huit sources et BUILD_ID sont identiques avant/après. Aucune erreur JavaScript/console/HTTP/requête. Aucun code du jeu, ancien classeur ou reçu antérieur modifié.

L’essai attempt-1 est conservé avec sa faute d’attente du pilote : il relisait la précédente fence confirmée immédiatement après un clic asynchrone. Le pilote attempt-2 attend le tick attendu et une fence confirmée correspondant aux octets courants ; aucun correctif applicatif n’a été requis.

Portée locale : adoption de l’instantané choisi et séparation des namespaces, pas de fusion automatique des branches, transaction atomique legacy/IDB, authentification serveur, cloud, campagne intégrale, pad réel ou admission artistique1:1. Les17 contrôles du composant avec l’ancien UI exécuté restent dans leur reçu distinct ; les15 contrôles Next se recoupent et ne les remplacent pas rétroactivement.
