# Épreuve de riposte — bonus PIT V1

État du lot : jouable et vérifié le 27 novembre 2026. Cette épreuve constitue une
première application de la famille « défense / contre-attaque » de l’extension 01,
§42. C’est une **simulation d’entraînement originale pour THE PIT**, proposée comme
préparation facultative avant un duel. Elle n’ajoute aucun événement à la biographie
canonique d’un chasseur.

Le lot réutilise le moteur de combat, les commandes, les combattants, les arènes et
les ressources graphiques déjà présents. Il ne crée ni nouvelle animation ni
nouvelle récompense de campagne. Les autres familles d’épreuves du §42 restent à
produire ; cette livraison ne clôt pas tout le chapitre.

## Parcours jouable

1. Entrer dans THE PIT, choisir **Entraînement**, puis confirmer le chasseur,
   l’adversaire et l’arène par le parcours de sélection existant.
2. Dans l’entraînement, ouvrir **Épreuve de riposte**.
3. Lire l’objectif et choisir **Standard** ou **Timing accompagné**. La préparation
   reste immobile jusqu’au chargement des ressources indispensables et à une
   action explicite sur le bouton de départ.
4. Réussir quatre séquences : attendre l’assaut bas annoncé, le bloquer réellement
   avec la garde basse, relâcher la garde, puis toucher avec une frappe rapide,
   moyenne ou lourde pendant l’ouverture.
5. Lire le résultat ; recommencer, reprendre l’entraînement libre ou conserver
   explicitement le meilleur record si un profil propriétaire est disponible.

Les commandes affichées proviennent des raccourcis actuels. Le clavier, les boutons
tactiles et les entrées de manette du combat restent ceux du moteur. Les menus de
l’épreuve proposent des boutons natifs avec focus visible ; à la manette, les
directions parcourent les boutons, A active et B revient à l’entraînement depuis
la préparation ou le résultat. Pendant le combat, B conserve sa fonction de frappe.

## Règles de l’épreuve

| Paramètre | Standard | Timing accompagné |
| --- | --- | --- |
| Objectif | 4 gardes basses suivies d’une riposte normale réelle | Identique |
| Temps de simulation maximal | 40 secondes | 60 secondes |
| Échec à partir de | 3 erreurs | 5 erreurs |
| Signal avant l’assaut | 60 ticks, soit 1 seconde | 90 ticks, soit 1,5 seconde |
| Fenêtre de riposte | 150 ticks, soit 2,5 secondes | 240 ticks, soit 4 secondes |
| Replacement entre séquences | 45 ticks, soit 0,75 seconde | Identique |
| Attente maximale du blocage après le signal | 180 ticks, soit 3 secondes | Identique |

La simulation fonctionne à la fréquence existante de 60 ticks par seconde. Le
partenaire utilise son véritable assaut bas de contact. City Hunter sert de
partenaire sauf lorsque le joueur utilise ce kit ; Witch est alors choisi pour
maintenir deux identités distinctes. Le kit, la variante du joueur et l’arène
sélectionnée sont conservés. La présentation personnelle du Yautja reste celle du
parcours PIT existant.

Une frappe avant le blocage, un assaut reçu, une absence de blocage ou une ouverture
de riposte manquée produit une erreur. Une technique ou une projection qui touche
ne valide pas la riposte : seules les trois frappes normales indiquées remplissent
l’objectif. La garde doit être constatée dans les événements réels du moteur ; la
riposte doit produire un événement de contact et une perte de santé du partenaire.

Chaque replacement recrée une situation d’entraînement : positions, santé,
ressources, objets et mémoires d’entrées sont réinitialisés. Le compteur global de
ticks de la tentative reste continu. Le partenaire lit l’état précédent du monde
et la séquence définie, sans lire les prochaines entrées du joueur.

L’épreuve requiert le kit PIT standard. Elle indique son indisponibilité si le
parcours de scène ou les gestes du classeur sont actifs. Elle ne transforme pas un
duel en épreuve et ne modifie pas un match en cours hors entraînement.

## Horloge, résultat et sorties

La préparation et le résultat sont figés. Pause, perte de focus et masquage passent
par les mécanismes existants de THE PIT : arrêt de la simulation, nettoyage des
entrées maintenues et reprise sans rattrapage du temps mural. Recommencer recrée une
préparation à zéro ; abandonner rend l’entraînement libre. Les outils de laboratoire
et l’avance manuelle d’une frame ne peuvent pas faire progresser une tentative.

L’épreuve se termine immédiatement après la quatrième séquence, à la limite
d’erreurs ou au temps imparti. Un état terminal ne compte plus de contacts. La
validation de l’identité, de l’arène, de la variante et de la frame empêche un état
ancien ou extérieur d’être utilisé pour recompter une action.

Le score est calculé par :

```text
max(0, séquences réussies × 1 000 − erreurs × 200
       + bonus de temps en cas de réussite)
bonus de temps = floor(ticks restants / 6)
```

En Standard, le rang est S pour une réussite sans erreur en 25 secondes au plus,
A pour une autre réussite avec au plus une erreur, et B sinon. Le niveau accompagné
affiche « Maîtrise accompagnée ». Une tentative non réussie affiche « À reprendre ».

Les résultats ne passent ni par une victoire de duel ni par une transition de
parcours. Ils n’attribuent pas de trophée, d’honneur, de déblocage ou de gain de
campagne. Une tentative n’est pas enregistrée comme chronique de duel et ne reprend
pas après fermeture de l’épreuve.

## Record local, explicite et distinct

Le bouton de conservation n’apparaît qu’après une réussite. Sans propriétaire de
campagne valide, l’épreuve reste jouable et son résultat reste visible, mais aucun
record n’est écrit. Le propriétaire est la chaîne `save.createdAt` de la campagne,
capturée à la préparation et comparée à nouveau lors de la conservation.

Le stockage séparé V1 utilise la clé
`yautja-long-hunt.the-pit-bonus.v1.<propriétaire encodé>`. Il conserve au plus un
meilleur résultat Standard et un meilleur résultat accompagné. Le score décide de
l’amélioration, puis le temps départage les égalités. Un résultat égal ou inférieur
ne crée ni doublon ni compteur cumulatif.

Le chargement valide la version, l’épreuve, le propriétaire, le combattant, sa
variante, l’arène, les bornes et le score. Un contenu invalide, une version inconnue
ou des archives étrangères restent inchangés. Une limite de **8 192 caractères**
s’applique à la lecture et, avant toute écriture, à la valeur JSON finale. Le cas
d’une archive encore lisible de 8 190 caractères qui dépasserait cette limite avec
le nouveau résultat est refusé sans écrasement. Une erreur de stockage ou une
relecture différente de l’écriture n’est pas annoncée comme une conservation
réussie. Le verrou de transfert d’archives existant suspend aussi cette écriture.

**Ce record est conservé uniquement dans ce navigateur et n’est pas inclus dans
l’export de campagne.** Cette limite est affichée dans le panneau du jeu. Le record
reste hors de `CompleteArchive` et des emplacements de campagne pour ce lot ; aucune
tentative active n’y est sérialisée.

## Fichiers et raccordements

| Chemin depuis la racine | Rôle |
| --- | --- |
| `app/game/systems/pitBonusTrialV1.ts` | Règles pures, préparation, partenaire, pas du véritable moteur, résultat |
| `app/game/systems/pitBonusRecordsV1.ts` | Stockage local propriétaire/versionné, validation et conservation explicite |
| `app/game/PitBonusTrialPanelV1.tsx` | Préparation, état en jeu, résultat, commandes et record |
| `app/game/PitBonusTrialPanelV1.module.css` | Présentation adaptative et focus des commandes |
| `app/game/PitCanvas.tsx` | Lancement, boucle réelle, ressources, pause, entrées et sorties |
| `tests/pit-bonus-trial-v1.test.mjs` | Vérifications comportementales du moteur et du stockage |
| `scripts/qa-pit-bonus-trial-v1.mjs` | Parcours navigateur de la vraie sélection et du vrai combat |

`PitCanvas` reçoit également `initialHonorRoute`, normalisé par le module partagé
`pitHonorGalleryV1`. Cette indication prépare le mode et le combattant uniquement
au montage. Un chapitre de Circuit reste un objectif affiché : la confirmation
normale et la prochaine étape réellement autorisée restent nécessaires. Aucune
route n’avance ni n’accorde de récompense depuis cette présélection.

## Vérifications réalisées

### Comportements du moteur et du stockage

Commande exécutée avec succès :

```sh
node --experimental-strip-types --test tests/pit-bonus-trial-v1.test.mjs tests/pit-training-lessons.test.mjs tests/pit-training-briefing.test.mjs
```

Résultat : **31 tests réussis**, dont 11 nouveaux tests bonus. Ils couvrent les
quatre blocs et ripostes réels avec les douze chasseurs historiques, les mauvaises
entrées, la technique et la projection exclues, la préparation figée, le
déterminisme, les états périmés, la reprise de l’horloge, les bornes de temps, le
record explicite, l’idempotence, les erreurs de stockage et la limite de taille.
Les tests existants des leçons et de leur briefing sont conservés.

ESLint a réussi séparément pour `PitCanvas`, les deux modules, le panneau, les tests
et le runner. Le typage strict ciblé des deux modules et du panneau a réussi avec
le déclaratif CSS du projet. Le typage étendu à tout le graphe de `PitCanvas` a été
arrêté par la limite mémoire de l’environnement (code 137) ; il ne constitue pas
une validation globale. Aucun build global n’est revendiqué pour ce relevé.

### Parcours navigateur réel

Le [rapport final](qa/bonus-trial-20261127/report.json) contient les empreintes des
cinq fichiers applicatifs de l’épreuve et des ressources originales matérialisées
pour le test. Dernier relevé : Chromium 158.0.8127.0, le 27 novembre 2026,
**8 scénarios réussis, aucune exception JavaScript et aucune réponse HTTP en
échec**. Les empreintes ont été comparées aux fichiers livrés.

Le runner monte le vrai `PitCanvas`, sa sélection et son moteur. Il ne fabrique
aucune progression d’objectif et n’injecte aucune victoire. Les quatre gardes et
ripostes sont obtenues au clavier en lisant les signaux publics du panneau. La
réussite observée compte 560 ticks, quatre séquences et aucune erreur ; aucun
callback de duel ou de parcours n’est reçu et aucun record n’existe avant l’action
explicite de conservation.

Les autres scénarios vérifient la préparation, la pause, le nettoyage après un
événement `blur`, le redémarrage, l’abandon, le rechargement du seul record séparé,
la présélection Circuit sans lancement, le panneau mobile et les menus à la
manette. La manette est simulée par des instantanés `Gamepad` standard passés au
véritable mécanisme de lecture ; cela ne prouve pas un test sur un contrôleur
physique. Le test de perte de focus déclenche l’événement DOM du navigateur.

Captures inspectées :

- [Préparation, 1 440 × 900](qa/bonus-trial-20261127/bonus-briefing-desktop.png)
- [Combat et objectif, 1 440 × 900](qa/bonus-trial-20261127/bonus-running-desktop.png)
- [Résultat réel, 1 440 × 900](qa/bonus-trial-20261127/bonus-success-desktop.png)
- [Préparation mobile, 390 × 844](qa/bonus-trial-20261127/bonus-briefing-mobile.png)

La revue confirme la lisibilité du panneau, du résultat et des commandes dans ces
cadrages. Elle ne constitue pas une validation artistique humaine de fidélité 1:1
pour l’ensemble des poses déjà présentes dans le moteur.

### Reproduction du relevé local

Depuis la racine du dépôt, la commande locale effectivement utilisée est :

```sh
PIT_QA_CHROMIUM=/tmp/chromium \
PIT_QA_ASSETS=/workspace/scratch/477f86aa7551/qa-pit-extensions/public \
PIT_QA_MATERIALIZE_ASSETS=1 \
PIT_QA_OUTPUT=/workspace/scratch/477f86aa7551/qa-pit-bonus-v1-final \
node --input-type=module <<'JS'
import Chromium from '/workspace/scratch/477f86aa7551/qa-pit-extensions/browser-runtime/node_modules/@sparticuz/chromium/build/index.js';
process.env.PIT_QA_CHROMIUM_ARGS_JSON=JSON.stringify(Chromium.args);
await import('./scripts/qa-pit-bonus-trial-v1.mjs');
JS
```

Les chemins de runtime sont propres à cet environnement. Ailleurs, fournir un
exécutable Chromium et un répertoire des ressources `public` à ces variables, puis
exécuter `node scripts/qa-pit-bonus-trial-v1.mjs`. Le runner utilise `playwright-core`
et `esbuild` déjà présents dans les dépendances du dépôt. L’option de matérialisation
lit les octets originaux depuis `HEAD` dans un répertoire temporaire ; elle prépare
les principales ressources avant le navigateur sans modifier le chargeur du jeu.
