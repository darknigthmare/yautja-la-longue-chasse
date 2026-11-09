# Pilote CI V151 — archives et deux onglets

Le pilote maintenu `scripts/qa-clan-war-v115-multitab-v151.mjs` ouvre maintenant
les vrais postes de commande : briefing, étapes mode/théâtre/détachement,
archives et recrutement. Aucun clic forcé ou contournement du flux visible
n'est nécessaire pour préparer une mission ou accéder à la réinitialisation.
Le bouton Lancer masqué d'un onglet périmé est uniquement inspecté en lecture
seule ; son entrée Nouveau mandat et son bouton Reset visible sont désactivés.

La première tentative conserve la recette originale et reproduit son échec :
le bouton Lancer n'est plus visible tant que l'étape Détachement n'est pas
ouverte. La seule modification de configuration appliquée pour cette baseline
ajoute une variable de dossier de sortie ; le chemin de sortie par défaut
reste identique à celui utilisé par la CI.

Les scénarios utilisent désormais six BrowserContext indépendants. A et B
partagent toujours le même contexte pendant un scénario. Aucun effacement de
localStorage ou d'IndexedDB ne remplace le test : fermer le contexte termine
le scénario, et le prochain commence dans un nouveau stockage isolé. Cela
évite de supprimer un miroir tout en conservant son registre transactionnel V2.

## Preuve finale

[Reçu attempt-3](attempt-3/final-receipt.json) : **14 contrôles natifs réussis**
sur Chromium154, trois tests source existants inchangés réussis, lint ciblé
sans avertissement et quatre PNG originaux ouverts. Les1293fichiers app sont
identiques avant et après le parcours ; un bookend indépendant les a encore
comparés au checkout à12:25:42UTC. Le correctif de tutoriel ultérieur de root
est distinct de cette version mesurée. Aucun pilote n'a été relancé après ce
bookend.

Les14contrôles d'origine et tous leurs délais restent présents : contention
réelle sur Web Locks, opération et reset refusés, soumissions concurrentes et
doubles clics dans une même tâche, absence de Web Locks, suspension/reprise du
timer d'assaut, échéances combinées, écritures périmées et recharge légitime.
Le clic B sous verrou conserve son mode initial Assaut ; la course suivante
utilise bien deux mandats délégués. Aucun verrou ni événement métier n'est
remplacé pour obtenir les résultats.

La fixture d'échéances conserve son déplacement déclaré de `Date.now` pour ce
seul scénario. Les enregistrements persistés et les timers natifs restent ceux
du composant. Le contrôle de campagne utilise une clé sentinelle indépendante,
**pas un vrai SaveGame monté**. Cette preuve ne certifie ni campagne complète,
ni GameClient/Next, ni appareils distants ou anciens clients non coopératifs.

La tentative2 avait passé les14contrôles avant la revue finale ; elle conserve
le rejeu intermédiaire et ses captures. La tentative3 rétablit également le
mode Assaut du B initial, décrit correctement l'absence de contexte précédent
et sert les vrais SVG publics du terrain, dont les empreintes figurent dans le
rapport. L'attente de fin d'animation native assure des captures lisibles.
Aucun asset ni fichier applicatif n'a été modifié.

Pour rejouer, fournir un nouveau dossier vide dans `CLAN_WAR_V151_QA_OUTPUT`,
`AUDIT_CHROME_EXECUTABLE=/usr/bin/chromium` et utiliser Node22. Les assertions
existantes dans `tests/clan-war-v115-multitab-v151.test.mjs` sont conservées.
