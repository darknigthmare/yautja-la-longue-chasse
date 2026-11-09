# Tutoriel complet sur le build de compatibilité final

**BUILD5-09, P1 — 20 contrôles natifs et 3 contrôles complémentaires PASS.** Cette nouvelle exécution complète utilise Next/GameClient sur `http://127.0.0.1:3157`, build `-FZ8BLkijX4wYooxQn-in`. Les preuves antérieures conservent leurs dates et leurs propres BID ; aucun ancien reçu, pilote ou résultat n’est remplacé.

Le seul changement applicatif depuis le build précédent est le traitement d’un champ optionnel absent dans `inspectTrophyTutorialV6` : `undefined` retourne `absent` avant la validation du propriétaire. Les journaux présents conservent la protection du propriétaire, de `null`, des données invalides et des versions futures. Le module testé porte le SHA-256 `749b167facdf4b4eed079d84ea8c35ad2470d5b5ab6aeb8f2e4c20e3c9f8ffc9`. La qualification des imports legacy relève aussi des tests de compatibilité réalisés dans le lot parent ; cette recette qualifie le parcours de jeu après ce changement du modèle.

Le pilote intégral historique `scripts/qa-trophy-tutorial-campaign-20261109.mjs` reste exactement identique, SHA-256 `439f568a7dd8c087988c138e15dca64e1e4d235e99cd99878227aeb07be13395`. Il crée un contexte isolé avec un `defaultSave` legacy Jeune Sang sans prologue, sans trophée ni résultat de tutoriel, puis un checkpoint extérieur valide près du Mausolée. La préparation utilise les API de production de migration et de checkpoint avant tout montage GameClient ; elle est explicitée dans `native-full-1/fixture-disclosure.json`. Ce rang initial ne prouve pas l’accomplissement de la nurserie ou d’un rite actuel.

La recette marche réellement vers la porte du Mausolée, puis vers le service intérieur. Le registre ouvre l’atelier pédagogique. Les 18 gestes sont exécutés en manipulant les contrôles réels, avec six transports sur le sol praticable entre les postes. Le refus d’un `Storage.setItem` de campagne au premier geste conserve les octets précédents ; la méthode native est restaurée et le même geste est réessayé. Trois vrais rechargements reprennent après la découverte 3, après la seule Face du geste 9 et après la plaque 16. Le résultat comporte un objet pédagogique unique, 18 gestes et 21 événements durables.

Les contrôles à 390 et 320 px qualifient le confinement horizontal des commandes et consignes. Le panneau est volontairement défilé sur la manipulation : les captures montrent le titre partiellement derrière le bandeau fixe, sans prétendre qualifier une nouvelle interface mobile complète ou du matériel mobile.

Le complément `native-replay-completed-1` restaure uniquement le checkpoint **réellement gagné par cette nouvelle exécution**, dont le SHA-256 est vérifié dans le rapport brut. Il utilise le vrai menu Continuer et le service physique pour rouvrir le modèle terminé. Une marche native éloigne le personnage de x = 140 à x = 209,67 ; la bounding box du modèle exposé reste exactement identique et le journal durable n’est ni réécrit ni dupliqué. Ce contexte distinct apporte trois contrôles supplémentaires ; il n’est pas compté comme un second parcours de 18 gestes.

Le profil complet, les vrais trophées, les missions et le prologue restent égaux avant/après. La clé runtime de flotte reste absente ; les quatre manifests de flotte des checkpoints conservent le même état métier, hors les horodatages normaux reconstruits (`updatedAt`, `loadoutPresets[].savedAt`). Aucune identité complète des octets de ces archives n’est revendiquée.

Les neuf sources surveillées sont identiques avant/après et entre les deux contextes. Les 1 293 fichiers applicatifs du manifeste de build ont été relus après la recette et correspondent tous à leurs empreintes. Le parcours complet a reçu 128 réponses JavaScript Next, 32 fichiers uniques, identiques aux fichiers compilés ; ses quatre documents portent le BID attendu. Aucun fichier applicatif, rebuild ou mutation Git n’a eu lieu pendant la recette. Les 11 captures du parcours et la capture du cabinet ont toutes été ouvertes pour inspection technique.

Cette qualification reste bornée à TR-M01..03 sur leur branche de modèle pédagogique et à l’accès legacy déclaré. Elle ne clôture pas les branches d’objets effectivement chassés, les chaînes avancées de trophées, une validation artistique humaine, une manette physique ou tous les P0/P1.

`native-full-1/report.browser-run.json` et `native-replay-completed-1/report.json` restent les sorties brutes. Les synthèses et inspections sont dans des fichiers distincts. Le reçu épingle également les sources du build parent ; le champ `sourceCommit` de celui-ci représente son commit de départ, avec son état de travail modifié explicitement déclaré.

Vérification en lecture seule :

```sh
python3 production/clan-war-command-20261109/qa/trophy-tutorial/compat-final/verify-native.py
```
